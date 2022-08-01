export const calculateY = (heights: number[] = [], gutter = 0) => {
  return heights.reduce((a, b) => a + b, 0) + heights.length * gutter
}
