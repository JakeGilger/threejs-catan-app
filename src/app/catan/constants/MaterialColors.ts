import { HexType } from "../enums/hex-type.enum";

export class MaterialColors {
  [key: string]: number; // MaterialColors is indexable; not a new property
  static readonly LUMBER = 0x336e14;
  static readonly BRICK = 0x8f482b;
  static readonly GRAIN = 0xa49940;
  static readonly ORE = 0x353c3e;
  static readonly WOOL = 0x4d8c2b;
  static readonly DESERT = 0xCBBD93;
  static readonly OCEAN = 0x42b9f5;

  static readonly OCEAN_PLANE = 0x005cbb;

  static readonly TOKEN_BASE = 0xdddddd;
  static readonly TOKEN_TEXT = 0x222222;
  static readonly TOKEN_TEXT__RED = 0xff0000;

  static readonly ROBBER = 0x222222;

  static readonly SELECTED_MATERIAL = 0x00ff00;
  static readonly GHOST_MATERIAL = 0xdddddd;

  static readonly SHEEP_BODY = 0xeeeeee;
  static readonly SHEEP_HEAD = 0x222222;

  // default player colors
  static readonly PLAYER_1 = 0xeeeeee;
  static readonly PLAYER_2 = 0xff8c11;
  static readonly PLAYER_3 = 0xdd1111;
  static readonly PLAYER_4 = 0x1111dd;
  static readonly PLAYER_5 = 0x2E6F40;
  static readonly PLAYER_6 = 0x895129;

  static readonly DEFAULT_PLAYER_COLORS =
    [MaterialColors.PLAYER_1, MaterialColors.PLAYER_2,
     MaterialColors.PLAYER_3, MaterialColors.PLAYER_4,
     MaterialColors.PLAYER_5, MaterialColors.PLAYER_6];

  static getPlayerColorStrings(colors: number[]): string[] {
    return colors.map((hexInt: number) =>  '#' + hexInt.toString(16));
  }

  static getColorString(color: number): string {
    return '#' + color.toString(16);
  }

  static getColorForHexType(hexType: HexType): number {
    return (MaterialColors as any)[hexType];
  }
}
