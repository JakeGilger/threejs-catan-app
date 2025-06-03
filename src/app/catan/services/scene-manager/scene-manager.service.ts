import { effect, inject, Injectable } from '@angular/core';
import * as THREE from "three";
import { MathConstants } from "../../constants/MathConstants";
import { ScaleConstants } from "../../constants/ScaleConstants";
import { AppTheme, ThemeService } from '../theme/theme.service';
import { P } from '@angular/cdk/platform.d-B3vREl3q';
import { filter } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SceneManagerService {

  public INTERSECTION_PLANE!: THREE.Mesh;

  private scene!: THREE.Scene;
  private sceneUpdated: boolean;

  private daylights: THREE.Light[] = [
    new THREE.AmbientLight(0xffffff),
    new THREE.DirectionalLight(0xaaaaaa)
  ];

  private nightlights: THREE.Light[] = [
    new THREE.AmbientLight(0x888888),
    new THREE.DirectionalLight(0x555555)
  ];

  private themeService = inject(ThemeService);

  constructor() {
    this.resetScene();
    this.sceneUpdated = true;
    this.themeService.selectedThemeObservable()
    .pipe(
      filter((theme) => { return theme !== undefined; })
    ).subscribe((theme: AppTheme) => {
      this.applyLighting((theme.name == 'dark') ? 'night' : 'day')
    })
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

  public applyLighting(lightingScheme: 'day' | 'night') {
    let toRemove = (lightingScheme == 'day') ? this.nightlights : this.daylights;
    let toAdd = (lightingScheme == 'day') ? this.daylights : this.nightlights;
    toRemove.forEach((light) => {
      this.scene.remove(light);
    });
    toAdd.forEach((light) => {
      this.scene.add(light);
    });
    this.sceneUpdated = true;
  }

  public resetScene() {
    this.scene = new THREE.Scene();
    const intersectionPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(ScaleConstants.INTERSECTION_PLANE_LIMIT,
        ScaleConstants.INTERSECTION_PLANE_LIMIT)
    );
    intersectionPlane.rotateX(MathConstants.NEG_PI_OVER_2);
    intersectionPlane.position.setY(ScaleConstants.HEX_HEIGHT);
    intersectionPlane.matrixAutoUpdate = false;
    intersectionPlane.updateMatrix();
    this.INTERSECTION_PLANE = intersectionPlane;
  }
}
