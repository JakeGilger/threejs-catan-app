import { HexType } from "./hex-type.enum";

export enum ResourceType {
  GRAIN = 'grain',
  WOOL = 'wool',
  LUMBER = 'lumber',
  BRICK = 'brick',
  ORE = 'brick'
}

export type HarborType = '3:1' | ResourceType;

export const resourceTypes: string[] = Object.keys(ResourceType);
export const resourceHexTypes: HexType[] = [
  HexType.GRAIN,
  HexType.WOOL,
  HexType.LUMBER,
  HexType.BRICK,
  HexType.ORE
]