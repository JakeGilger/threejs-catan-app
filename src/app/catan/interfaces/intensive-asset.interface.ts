import * as THREE from "three";

export interface IntensiveAsset {
  type: 'sheep' | '';
  deltaOffset: number;
  mesh: THREE.Mesh;
  animate(time: number, self: IntensiveAsset): void;
}
