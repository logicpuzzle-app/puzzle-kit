import { describe, it, expect } from 'vitest';
import { isPenpaUrl, parsePenpaUrl } from '../utils/penpaCompat';
import { gridConfigToTopology } from '../utils/gridTopology';
import pako from 'pako';
import { decompressSubstitutions } from '../utils/penpaSerializer';
import { SurfaceColorPalette } from '../constants/colors';
import { penroseP3FromPenpa } from '../utils/topology/special/penroseP3';

function getHashParam(url: string, key: string): string | null {
  const hash = new URL(url).hash;
  const content = hash.startsWith('#') ? hash.slice(1) : hash;
  for (const pair of content.split('&')) {
    const idx = pair.indexOf('=');
    if (idx <= 0) continue;
    const k = pair.slice(0, idx);
    if (k !== key) continue;
    return decodeURIComponent(pair.slice(idx + 1));
  }
  return null;
}

function base64ToBytes(encoded: string): Uint8Array {
  let base64 = encoded.replace(/ /g, '+').replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  return new Uint8Array(Buffer.from(base64, 'base64'));
}

describe('Penpa URL import', () => {
  it('imports a penpa-edit #m=solve URL with + characters', () => {
    const url =
      'https://swaroopg92.github.io/penpa-edit/#m=solve&p=rVVtb+I4EP7Or7AirdTe+npJeFka6T7QF/Z2ry90t1WvRFUVwBB3E5tzHGhTdX/7ztihEKDV3uoUMRk/48w8Y/sxUyaUzNhdr06b8NTb1KUePA2/ThvuBxiZZ891PeNdcp2wgHyNo29Rhobs9GyKXdrJdSxVQAaJ1HOWJJT2kmjIiFY8EpOEZYQLksmUkSFEMzJ4JCM+4yMuJkTHFiVRImEYQSSaSBEBIEYEKplZcZSMiRwTrvfe+Ue/kSuBETYiik24FBlJ80wTxiGbIgNGBjIXGGZCc8WSRyyZ5cP4JXtGpKpEhRS/L4M7Oo404dk7/xCDhiAbTaCTecwhzUCqEVQqSQC7GYSAn+kPPxomedktjqAW9okZcBb6E8VHu7aZLoTz9YYWHaxTw3RsxtQjAaPZw6JpnsGCwTprpjjkK4M7AA9lOk2Yxj6zXKllXrsZJR9bd3fBVsJiQUuwCKmEldVzuW36HtnpLEpJsdHjNC/6RT+BhYiEkBo3ZpPjHtT8iUX4xQXY1kus2OIkVrsxRDpE5OkAEwo4jWbnFZsqlsFpyUgs5ySNxOPiy518CgV2yVjmqsxpjk6k7FLMeQZNj+5BDgJKS3veF4cD9kboCAq9KGWPnne7dAx9Mvr5Jj45lJ35UeefWVv3+95HN//kXt93799/Sf/+xOvK6561e6e9U+5POn8dHly0jt+3enl2pdnsIvUO7q/6l+Pe9WTffzw+6zeK/rnb/Nwf/zHrXP1ZC29roeM51PHh5zm334ve97BoUse5rT0VX4Kn4i4Ib59pcbV020v3a/DkeA0naFOn6ZqXXw59v3w3Srzt2/e+Hdcbbftutuy7hWNIeVamNLQahpRNHjqNJWDKhMj6BcGCVQRLh467giCJ0KmvIEinUsoQq3xlKFbnINmVWkDbC57A3hjbNdY39hIWihZ1Y4+MdY1tGnti5hwbe23sobENY1tmzgdc6lotbNMWPA148I1ei/rlyKI42owitnyWkVVsfbyJrTzbAm34Bo4SHBonk8kdXDFjOOx37CEaaiewJ3k1UsGs1CpQIuU04WJbhkWoAvKJkHCJbwshiCJ8JRWGtqSyd3slMI+SpNrLvzkovAINuRomVQhUXRlHcPvOK0ga6bgCDCIN/7NZzKfVTHB7VAnoqEoR/pHXqqXL5XiuOQ+O+YV12F0PFb4fFB1afLTHe3EJ0OICJH4aFD1UeOg4tA2HPs0TzYcykVASMc+cX/OhD+7x0r02cfQOrUo8F/yzUkPg3oBrV+ruxCbqBeWtQ4sD8zW6TipnQN5ywzH8iQ2gvdDBTX5waB2wLB/Jb3k5y0MpdtbIQ/63yEOSBXl0LXn0tpDHnv4v8gassN+/fbZ75P7k3Wuvy1+7fYrz/3T/PJTKluoNcS+D6/AWiQP6hspXotvwVwS9El3HN9SLZDcFDOgWDQO6LmOANpUM4IaYAXtFz5h1XdLIal3VWGpD2FhqVdtw9xrvBw==';

    expect(isPenpaUrl(url)).toBe(true);
    const result = parsePenpaUrl(url);
    expect(result).not.toBeNull();
    expect(result!.grid.gridType).toBe('penrose_P3');
    expect(result!.grid.cols).toBe(5);
    expect(result!.grid.rows).toBe(16);
    expect(result!.grid.penroseSide).toBe(5);
    expect(result!.grid.penroseOrder).toBe(5);
    expect(result!.grid.penroseRotational).toBe(0);
    expect(result!.grid.penroseVariation).toBe(0.001);
    expect(result!.topology).toBeTruthy();
    expect(result!.topology!.cells.size).toBeGreaterThan(0);
    expect(Object.keys(result!.state.problem.surfaces).length).toBeGreaterThanOrEqual(10);

    // Ensure the app can regenerate the same topology from GridConfig (preset/apply, resize, etc.)
    const regenerated = gridConfigToTopology(result!.grid);
    expect(regenerated.cells.size).toBe(result!.topology!.cells.size);

    // Verify that the penpa center-index -> cellId mapping matches the topology's own cell centers.
    // (Regression for mismatched ordering between topology cell IDs and element placement.)
    const encoded = getHashParam(url, 'p');
    expect(encoded).toBeTruthy();
    const inflated = new TextDecoder().decode(pako.inflateRaw(base64ToBytes(encoded!)));
    const lines = inflated.split('\n');
    const puqCompressed = lines[3];
    const puqJson = decompressSubstitutions(puqCompressed);
    const puq = JSON.parse(puqJson) as { surface?: Record<string, number> };
    const penpaIndex = 14;
    const colorIndex = puq.surface?.[String(penpaIndex)];
    expect(colorIndex).toBeTypeOf('number');

    const { points, centerlist, topology } = penroseP3FromPenpa(5, 5, 38, {
      rotational: 0,
      variation: 0.001,
    });
    expect(topology.cells.size).toBe(80);

    const sortedCenterlist = [...centerlist].sort((a, b) => {
      const pa = points[a];
      const pb = points[b];
      const dy = pa.y - pb.y;
      if (Math.abs(dy) > 0.1) return dy;
      return pa.x - pb.x;
    });
    const pos = sortedCenterlist.indexOf(penpaIndex);
    expect(pos).toBeGreaterThanOrEqual(0);
    const expectedCellId = `cell-${Math.floor(pos / 5)}-${pos % 5}`;

    const surfaceAtCell = Object.values(result!.state.problem.surfaces).find(
      (s) => s.cellId === expectedCellId
    );
    expect(surfaceAtCell).toBeTruthy();
    expect(surfaceAtCell!.color).toBe(SurfaceColorPalette[colorIndex!]);

    // Geometry check: topology cell center matches penpa point center after the same shift as penpa-edit.
    let xmin = Infinity;
    let ymin = Infinity;
    for (const idx of centerlist) {
      xmin = Math.min(xmin, points[idx].x);
      ymin = Math.min(ymin, points[idx].y);
    }
    const shiftX = 20 - xmin + 38;
    const shiftY = 20 - ymin + 38;
    const expectedCenter = {
      x: points[penpaIndex].x + shiftX,
      y: points[penpaIndex].y + shiftY,
    };
    const cell = topology.cells.get(expectedCellId);
    expect(cell).toBeTruthy();
    const dx = Math.abs(cell!.center.x - expectedCenter.x);
    const dy = Math.abs(cell!.center.y - expectedCenter.y);
    expect(dx).toBeLessThan(1e-6);
    expect(dy).toBeLessThan(1e-6);
  });

  it('recognizes #m=edit URLs with extra hash params', () => {
    const url =
      'https://swaroopg92.github.io/penpa-edit/#m=edit&p=7Vb7b+I4EP6dv8KKtFJ76+sl4bE00v1AH+zj+qDbVr2CUBXAEHcTm3McaFP1f98ZOxQCtFqd7k530skwGX/jzHwzNmOmTCiZsrtOldZhVJvUpR6Mml+lNfcDzMzYc13PaFdcxywgl1H4LUxRkJ2OdbFLW5mOpArIIJZ6zuKY0k4cDhnRiodiErOUcEFSmTAyBGtKBo9kxGd8xMWE6MiiJIwlTEOwhBMpQgDEiEAksyoK4zGRY8L13jv/6CdyLdDCRkSxCZciJUmWasI4eFNkwMhAZgLNTGiuWPyIIdNsGL14T4lUJauQ4uelcUdHoSY8fecfotEQZKMJZDKPOLgZSDWCSAUJYDcDE/Az+eFLwzgrssUZxMI80QOuQn2i+GjXJtMGc7ae0CKDdWrojs2YeiQgNHtYJM1TKBjUWTPFwV9h3AF4KJNpzDTmmWZKLf3azSj42Li7C7YSigUpQRESCZXVc7lt+R7ZaS1CSbGR4zTLu3k3hkKEQkiNG7PJcQ9i/kAR/mQBtuUSKbY4ieVsDJEWEVkyQIcCTqPZecWmiqVwWlISyTlJQvG4eHMnm0KAXTKWmSp8mqMTKluKOU8h6dE9/BwEhJb2vC8OB+yN0CEEevml7NHzdpuOIU9Gv9xGJ4eyNT9q/T5r6m7X++hmn92b+/b9+6/Jb595VXnts2bntHPK/Unr0+HBReP4faOTpdeazS4S7+D+uns17txM9v3H47NuLe+eu/Uv3fEvs9b1r5Vev/KU7wd5i+Yfg57jOdTx4es5fZpfBE/5aZB3aH4JJoc2+9RJsljzoYylcgzmwboT+6IP6vFSvTF21A5BA6eeC/qZXVAD9RbUIVfDmN2dWEedoJfXqYOxD8zbqDqJnDEMhtxwDid5wBGIuWAPDq0ClmYj+S0rVnn9Z5q31siD/7fIg5MFeVQtedS2kMec/iryBiyx3+8/P8OefAX+d0EPU7leqs2lehk8OV7NCZrUqbvm4RdT3y+etQJv+va5b+fVWtM+6w37bOAcXJ4VLu0W2VNgnPec2hIwYUxRXhAMWEYwdM9xVxAk0XOqKwjSKYUyxEpvGYrlNUh2JRbQ9oInkLdGto30jbyCQtG8auSRka6RdSNPzJpjI2+MPDSyZmTDrPmApf7BzbD1+wfo9Jq0AaMGA5+oNahfzCyKs00rYsuxtKxi6/NNbGVsMzThnT62FdcNis9+4FaenFTGd3DzjKEH3rGHcKidwDa4VUsJsx24BMVSTvGXs8XDwlQC+URIuNu3mRDE3vyKKzRtcWWv/JJhHsZxOZc/Mmj8Jci2ihIEzb40D+FSnpeQJNRRCRiEGv5+pRGflj3BpVImoMMyRfijthYtWZbjueI8OJVeFfbZ+/82+DfeBrg/8BP629tQfv5f7ou2xUj1RpdZGtfhLb0G0DfazYp1G/5KZ1mxruMbbQTJbnYSQLc0E0DX+wlAmy0FwI2uAtgrjQW9rvcWZLXeXjDURofBUKtNptevfAc=&l=solvedup';

    expect(isPenpaUrl(url)).toBe(true);
    const result = parsePenpaUrl(url);
    expect(result).not.toBeNull();
    expect(result!.grid.gridType).toBe('penrose_P3');
    expect(result!.topology).toBeTruthy();
    expect(result!.topology!.cells.size).toBe(80);
  });

  it('imports a penpa-edit square-grid URL (legacy line-based text format)', () => {
    const url =
      'https://opt-pan.github.io/penpa-edit/#m=edit&p=7VRBb5swFL7nV0w+vwOYkqW+dV2zS9ata6YqQihyEtqgQtwZWCdH+e99fiCBgUnboVoPk+WnL997ef6M/bn4UUmdwBRCCGbggY+DT6fA+QwC/4ym14xlWmaJeAcXVblXGgHAl/kc7mVWJJOoqYonR3MuzA2YTyJiPgPGcfosBnMjjuazMCswt5hi4CO3qIs4wqsW3lHeosua9D3E1w1GuEK4TfU2S9aLmvkqIrMEZtf5QP+2kOXqZ8IaHfb3VuWb1BIbWeJmin361GSKaqceq6bWj09gLmq5tyNyg1auhbVci0bk2l28stzz+HTCz/4NBa9FZLV/b+GshbfiyDhnwkd8jTgIbYMAFdEJIeuLI8YV5sIAcwFK6MjG1JwKOMUldgUTUPxI0aMYUlxQzRXFO4qXFM8oTqnmvdX1h8przV2NryQn4pxsUI/w73A8idABrFDZuqj0vdzieZJB8MiQO1T5JtEOlSn1lKUHty59OCidjKYsmewexuo3Su963Z9lljlEbXiHqo/YoUqN167zW2qtnh0ml+XeITpX1OmUHEpXQCldifJR9lbL2z2fJuwXoxlxfJiA4xf+/8D8kwfGHoL31sz61uTQ/VV61PxIj/gf2VGfN/zA6sgPTG0XHPoa2RFrI9t3N1JDgyM58Dhyv7G57dp3ulXVN7tdauB3u1TX8lE8eQE=';

    expect(isPenpaUrl(url)).toBe(true);
    const result = parsePenpaUrl(url);
    expect(result).not.toBeNull();
    expect(result!.grid.gridType).toBe('square');
    expect(result!.topology).toBeUndefined();
  });
});
