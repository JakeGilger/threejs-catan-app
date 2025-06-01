import { HexType } from "../enums/hex-type.enum";

export class MaterialColors {
  [key: string]: number; // MaterialColors is indexable; not a new property
  static readonly LUMBER_HEX = 0x336e14;
  static readonly BRICK_HEX = 0x8f482b;
  static readonly GRAIN_HEX = 0xa49940;
  static readonly ORE_HEX = 0x353c3e;
  static readonly WOOL_HEX = 0x4d8c2b;
  static readonly DESERT_HEX = 0xb66f48;
  static readonly OCEAN_HEX = 0x1c86a5;

  static readonly OCEAN_PLANE = 0x207fba;

  static readonly TOKEN_BASE = 0xdddddd;
  static readonly TOKEN_TEXT = 0x222222;
  static readonly IMPORTANT_TOKEN_TEXT = 0xff0000;

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

  static readonly DEFAULT_PLAYER_COLORS =
    [MaterialColors.PLAYER_1, MaterialColors.PLAYER_2, MaterialColors.PLAYER_3, MaterialColors.PLAYER_4];

  static getPlayerColorStrings(colors: number[]): string[] {
    return colors.map((hexInt: number) =>  '#' + ('000000' + hexInt.toString(16)).slice(-6));
  }

  static getHexColor(hexTypeString: HexType): number {
    let propertyToAccess: string = hexTypeString + "_HEX";
    return (MaterialColors as any)[propertyToAccess];
  }
}
