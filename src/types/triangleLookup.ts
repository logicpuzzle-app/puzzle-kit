/**
 * Select a triangle within a row from its local pixel coordinates.
 * Each half-cell-wide strip intersects two triangles separated by a diagonal.
 * rowParity is the row number for a rectangular grid, and zero for a pyramid
 * because every pyramid row starts with an upward triangle.
 */
export function getTriangleColumnAtPixel(
  x: number,
  yWithinRow: number,
  size: number,
  rowParity: number,
): number {
  const halfWidth = size / 2;
  const height = size * Math.sqrt(3) / 2;
  const strip = Math.floor(x / halfWidth);
  const fractionX = (x - strip * halfWidth) / halfWidth;
  const fractionY = yWithinRow / height;
  const rightTrianglePointsUp = (strip + rowParity) % 2 === 0;
  const diagonalX = rightTrianglePointsUp ? 1 - fractionY : fractionY;

  // Shared diagonal points belong to the triangle on the right. A dimensionless
  // tolerance keeps floating-point coordinate transforms from changing that tie.
  return fractionX + 1e-10 >= diagonalX ? strip : strip - 1;
}
