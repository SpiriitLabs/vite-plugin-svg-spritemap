export function calculateY(heights: number[] = [], gutter = 0): number {
  return heights.reduce((a, b) => a + b, 0) + heights.length * gutter
}
