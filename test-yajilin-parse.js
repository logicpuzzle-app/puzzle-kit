// Test parsing the puzz.link Yajilin URL data
// URL: https://puzz.link/p?yajilin/10/10/b41e2121e21o41a41b41g41b41g30d41a41b40a40r31a31d30f

const data = "b41e2121e21o41a41b41g41b41g30d41a41b40a40r31a31d30f";
const width = 10;
const height = 10;

// Parse according to decodeArrowNumber16 format
// pzprjs: c += parseInt(ca, 36) - 10
// 'a' = 10 in base36, so 'a' = 0 skip, 'b' = 1 skip, etc.
let cellIndex = 0;
let i = 0;
const clues = [];

while (i < data.length && cellIndex < width * height) {
  const ca = data.charAt(i);

  if (ca >= 'a' && ca <= 'z') {
    // Skip cells: parseInt(ca, 36) - 10
    const skip = parseInt(ca, 36) - 10;
    console.log(`Skip ${skip} cells (char: ${ca}), cellIndex: ${cellIndex} -> ${cellIndex + skip}`);
    cellIndex += skip;
  } else if (ca >= '0' && ca <= '4') {
    // Direction 0-4, next char is number
    const dir = parseInt(ca, 10);
    const ca1 = data.charAt(i + 1);
    const num = ca1 === '.' ? -2 : parseInt(ca1, 16);
    i++;

    const row = Math.floor(cellIndex / width);
    const col = cellIndex % width;
    console.log(`Clue at (${row}, ${col}): dir=${dir}, num=${num}`);
    if (dir > 0 && num >= 0) {
      clues.push({ row, col, dir, num, cellIndex });
    }
  }

  cellIndex++;
  i++;
}

console.log("\nTotal clues:", clues.length);
console.log("\nClue summary:");
clues.forEach(c => {
  const dirName = ['none', 'UP', 'DOWN', 'LEFT', 'RIGHT'][c.dir];
  console.log(`  (${c.row}, ${c.col}): ${c.num} ${dirName}`);
});
