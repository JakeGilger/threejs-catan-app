import { Group, Mesh } from "three";

import { ResourceType } from "../enums/resource-type.enum";
import { HexOffset } from "../enums/hex-offset.enum";
import { HexType } from "../enums/hex-type.enum";

export interface HexMetadata {
  x: number;
  y: number;
  instantiated: boolean;
  type: HexType;

  hexRef: Mesh;
  numberTokenRef?: Group;
  harborRef?: Mesh;

  // Desert tiles do not have a resource number.
  resourceNumber?: number;

  // Only ocean tiles have harbors.
  harborPosition?: {corner: HexOffset, edge: HexOffset};
  harborType?: '3:1' | ResourceType;
}
