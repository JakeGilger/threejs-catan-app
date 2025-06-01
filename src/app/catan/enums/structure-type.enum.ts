export const enum StructureType {
  ROAD = "Road",
  SETTLEMENT = "Settlement",
  CITY = "City"
}

// Defines structure types that may also be placed at the location of the given structure.
export const StructureTypeModifiables: Map<StructureType, StructureType[]> = new Map<StructureType, StructureType[]>(
  [
    [StructureType.SETTLEMENT, [StructureType.SETTLEMENT, StructureType.CITY]],
    [StructureType.CITY, [StructureType.SETTLEMENT, StructureType.CITY]]
  ]
);
