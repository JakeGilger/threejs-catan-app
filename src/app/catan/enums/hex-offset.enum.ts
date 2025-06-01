/* These are intentionally specified in clockwise order. DO NOT change the ordering,
 * as it may break things needing to calculate rotations from them. (e.g. road directions) */
export enum HexOffset {
  TOP,
  UPPER_RIGHT,
  LOWER_RIGHT,
  BOTTOM,
  LOWER_LEFT,
  UPPER_LEFT
}

export const HexOffsetMap: Map<HexOffset, string> = new Map<HexOffset, string>([
  [HexOffset.TOP, "top"],
  [HexOffset.UPPER_RIGHT, "upper right"],
  [HexOffset.LOWER_RIGHT, "lower right"],
  [HexOffset.BOTTOM, "bottom"],
  [HexOffset.LOWER_LEFT, "lower left"],
  [HexOffset.UPPER_LEFT, "upper left"]
])

export const HexOffsetsToNumber: Map<HexOffset, number> = new Map<HexOffset, number>([
  [HexOffset.TOP, 1],
  [HexOffset.UPPER_RIGHT, 2],
  [HexOffset.LOWER_RIGHT, 3],
  [HexOffset.BOTTOM, 4],
  [HexOffset.LOWER_LEFT, 5],
  [HexOffset.UPPER_LEFT, 6]
])
;