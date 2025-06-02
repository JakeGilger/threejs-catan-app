export enum HexType {
  GRAIN = 'GRAIN',
  WOOL = 'WOOL',
  LUMBER = 'LUMBER',
  BRICK = 'BRICK',
  ORE = 'ORE',
  DESERT = 'DESERT',
  OCEAN = 'OCEAN'
}

// The standard hex types that yield resources.
export const hexResourceTypes: HexType[] = [
  HexType.GRAIN,
  HexType.WOOL,
  HexType.BRICK,
  HexType.LUMBER,
  HexType.ORE
];

export const allHexTypes: HexType[] = [
  ...hexResourceTypes,
  HexType.DESERT,
  HexType.OCEAN
]