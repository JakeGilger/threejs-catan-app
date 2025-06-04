import { inject, Injectable } from '@angular/core';
import { combineLatest, filter, ReplaySubject } from 'rxjs';

import * as THREE from "three";

import { MathConstants } from "../../constants/MathConstants";
import { ScaleConstants } from "../../constants/ScaleConstants";
import { AppTheme, ThemeService } from '../theme/theme.service';
import { MaterialColors } from '../../constants/MaterialColors';
import { CanvasDimensions } from '../../interfaces/canvas-dimensions.interface';

@Injectable({
  providedIn: 'root'
})
export class SceneManagerService {

  /* DEFAULT CAMERA PROPERTIES */
  private cameraX: number = 0;
  private cameraY: number = 50;
  private cameraZ: number = 50;

  private fieldOfView: number = 70;

  private nearClippingPane: number = 0.1;

  private farClippingPane: number = 500;

  private camera!: THREE.PerspectiveCamera;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;


  public INTERSECTION_PLANE!: THREE.Mesh;

  private scene!: THREE.Scene;
  private sceneUpdated: boolean;

  private sceneResetObs = new ReplaySubject<boolean>(1);

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
    combineLatest([
      this.themeService.selectedThemeObservable().pipe(
        filter((theme) => { return theme !== undefined; })),
      this.sceneResetObs
    ]).subscribe((theme: [AppTheme, boolean]) => {
      this.applyLighting((theme[0].name == 'dark') ? 'night' : 'day')
    })

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
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

    // Create Intersection Plane (Same position as ocean plane)\
    const planeGeom = new THREE.PlaneGeometry(ScaleConstants.INTERSECTION_PLANE_LIMIT,
        ScaleConstants.INTERSECTION_PLANE_LIMIT);
    const intersectionPlane = new THREE.Mesh(planeGeom);
    intersectionPlane.rotateX(MathConstants.NEG_PI_OVER_2);
    intersectionPlane.position.setY(ScaleConstants.HEX_HEIGHT);
    intersectionPlane.matrixAutoUpdate = false;
    intersectionPlane.updateMatrix();
    this.INTERSECTION_PLANE = intersectionPlane;
    this.sceneResetObs.next(true);

    // Create Ocean Plane
    let oceanPlane = new THREE.Mesh(planeGeom, new THREE.MeshLambertMaterial({color: MaterialColors.OCEAN_PLANE}));
    oceanPlane.rotateX(MathConstants.NEG_PI_OVER_2);
    oceanPlane.translateY(-1 * ScaleConstants.HEX_HEIGHT);
    this.addToScene(oceanPlane);
  }

  public applyLighting(lightingScheme: 'day' | 'night') {
    let toRemove = (lightingScheme == 'day') ? this.nightlights : this.daylights;
    let toAdd = (lightingScheme == 'day') ? this.daylights : this.nightlights;
    toRemove.forEach((light) => {
      this.scene.remove(light);
    });
    toAdd.forEach((light) => {
      this.scene.add(light);
      this.scene.background = (lightingScheme == 'day') ? new THREE.Color().setHex(MaterialColors.OCEAN) : null;
    });
    this.sceneUpdated = true;
  }



  /* CAMERA */

  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  public createCamera(canvasRef: HTMLCanvasElement) {
    const canvasDimensions = this.getCanvasDimensions(canvasRef);
    if(!canvasDimensions) {
      return;
    }
    const aspectRatio = this.getAspectRatio(canvasDimensions.width, canvasDimensions.height);
    this.camera = new THREE.PerspectiveCamera(
      this.fieldOfView,
      aspectRatio,
      this.nearClippingPane,
      this.farClippingPane
    );
    this.camera.position.set(this.cameraX, this.cameraY, this.cameraZ);
  }

  public resize(canvasRef: HTMLCanvasElement) {
    const canvasDimensions = this.getCanvasDimensions(canvasRef);
    if (canvasDimensions) {
      this.camera.aspect = this.getAspectRatio(canvasDimensions.width, canvasDimensions.height);
      this.camera.updateProjectionMatrix();
    }
  }

  private getAspectRatio(width: number, height: number) {
    let ratio = width / height;
    return ratio;
  }

  public getCanvasDimensions(canvasRef: HTMLCanvasElement): CanvasDimensions | undefined {
    if (canvasRef && canvasRef.parentElement) {
      const containerHeight = canvasRef.parentElement.clientHeight;
      const containerWidth = canvasRef.parentElement.clientWidth;
      canvasRef.height = containerHeight;
      canvasRef.width = containerWidth;
      return {
        height: containerHeight, width: containerWidth,
        // halfHeight: containerHeight / 2, halfWidth: containerWidth / 2
      };
    } else {
      console.log("Unable to find Canvas Dimensions!");
      return;
    }
  }

  

  /* RAYCASTING */



  // Return the array of intersected objects casting a ray from the camera through the scene.
  public raycast(event: MouseEvent, objects: THREE.Object3D[], canvasRef: HTMLCanvasElement): THREE.Intersection[] {
    const canvasDimensions = this.getCanvasDimensions(canvasRef);
    if (!canvasDimensions) {
      console.warn("Cannot raycast with no canvas dimensions!");
      return [];
    }
    this.mouse.set( (event.clientX / canvasDimensions.width ) * 2 - 1, - (event.clientY / canvasDimensions.height) * 2 + 1 );
    this.raycaster.setFromCamera( this.mouse, this.getCamera() );
    return this.raycaster.intersectObjects(objects);
  }
}
