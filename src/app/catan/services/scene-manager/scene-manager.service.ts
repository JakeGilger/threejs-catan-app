import { Injectable } from '@angular/core';
import * as THREE from "three";
import { PlaneBufferGeometry } from "three";
import { MathConstants } from "../../constants/MathConstants";
import { ScaleConstants } from "../../constants/ScaleConstants";

@Injectable({
  providedIn: 'root'
})
export class SceneManagerService {
  public INTERSECTION_PLANE!: THREE.Mesh;

  private scene!: THREE.Scene;
  private sceneUpdated: boolean;

  constructor() {
    this.resetScene();
    this.sceneUpdated = true;
  }

  public getScene() {
    return this.scene;
  }

  public getSceneUpdated() {
    return this.sceneUpdated;
  }

  public setSceneUpdated(value: boolean) {
    this.sceneUpdated = value;
  }

  /* SCENE MANAGEMENT */
  public addToScene(obj: THREE.Object3D) {
    this.scene.add(obj);
    this.sceneUpdated = true;
  }

  public removeFromScene(obj: THREE.Object3D | null) {
    if (obj == null) {
      return;
    }
    this.scene.remove(obj);
    this.sceneUpdated = true;
  }

  public resetScene() {
    this.scene = new THREE.Scene();
    const ambLight = new THREE.AmbientLight(0xffffff);
    const directionalLight = new THREE.DirectionalLight(0x888888);
    const intersectionPlane = new THREE.Mesh(
      new PlaneBufferGeometry(ScaleConstants.INTERSECTION_PLANE_LIMIT,
        ScaleConstants.INTERSECTION_PLANE_LIMIT)
    );
    intersectionPlane.rotateX(MathConstants.NEG_PI_OVER_2);
    intersectionPlane.position.setY(ScaleConstants.HEX_HEIGHT);
    intersectionPlane.matrixAutoUpdate = false;
    intersectionPlane.updateMatrix();
    this.INTERSECTION_PLANE = intersectionPlane;
    this.addToScene(ambLight);
    this.addToScene(directionalLight);
  }
}
