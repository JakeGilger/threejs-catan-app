import { StructureType } from "../enums/structure-type.enum";

export interface StructureMetadata {
  x: number;
  y: number;
  instantiated: boolean;
  type: StructureType;

  // Structure ghosts are owned by the 0th player.
  ownerId: number;
}
