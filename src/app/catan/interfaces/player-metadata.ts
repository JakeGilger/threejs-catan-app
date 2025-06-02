import { Material } from 'three';
import { StructureMetadata } from './structure-metadata.interface';

export interface PlayerMetadata {
    id: number;
    color: string;

    // Player inputs
    name?: string;

    // Storage
    structures: Set<StructureMetadata>;
    material?: Material;
}
