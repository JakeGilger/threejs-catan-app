// TODO: Find a way to string enum this
export enum HexType {
  GRAIN,
  WOOL,
  LUMBER,
  BRICK,
  ORE,
  DESERT,
  OCEAN
}

// All hex types available.
export const hexTypes: string[] = Object.keys(HexType).filter(key => !isNaN(Number(HexType[key])));

// The standard hex types that yield resources.
export const hexResourceTypes: HexType[] = [
  HexType.BRICK,
  HexType.LUMBER,
  HexType.GRAIN,
  HexType.WOOL,
  HexType.ORE
];
