import { Injectable } from "@angular/core";
import * as THREE from "three";
import { CatanBoardComponent } from "../../components/catan-board/catan-board.component";
import { CanvasDimensions } from "../../interfaces/canvas-dimensions.interface";
import { SceneManagerService } from "../scene-manager/scene-manager.service";

/**
 * Rendering is relegated to its own service so that testing can be done on the
 * CatanBoardComponent without the render loop causing Karma to explode.
 */
@Injectable({
  providedIn: 'root'
})
export class RenderService {
  // Set to true the view from the camera has been dirtied.
  // (Controls updated, canvas resized, etc.)
  public viewDirty: boolean;
  public renderer!: THREE.WebGLRenderer;

  constructor(private sceneManager: SceneManagerService) {
    this.viewDirty = false;
  }

  public initRenderer(canvas: HTMLCanvasElement, canvasDimensions: CanvasDimensions) {
    this.renderer = new THREE.WebGLRenderer({ alpha: true, canvas: canvas, antialias: true });
    this.renderer.setPixelRatio(devicePixelRatio);
    this.renderer.setSize(canvasDimensions.width, canvasDimensions.height);
  }

  public updateSize(canvasDimensions: CanvasDimensions) {
    this.renderer.setSize(canvasDimensions.width, canvasDimensions.height);
    this.viewDirty = true;
  }

  public startRenderLoop(component: CatanBoardComponent): void {
    component.controls.addEventListener('change', () => { this.viewDirty = true } );

    const sceneManager = this.sceneManager;
    const renderSrv = this;
    (function renderLoop() {
      requestAnimationFrame(renderLoop);
      component.setTime();
      if (component.intensiveAssetsEnabled) {
        component.animateMeshes();
        component.castMouseToPlane();
      }
      if (renderSrv.needsRender(component)) {
        renderSrv.renderer.render(sceneManager.getScene(), component.camera);
      }
    }());
  }

  private needsRender(component: CatanBoardComponent): boolean {
    const result = this.viewDirty || this.sceneManager.getSceneUpdated() || component.intensiveAssetsEnabled;
    this.viewDirty = false;
    this.sceneManager.setSceneUpdated(false);
    return result;
  }
}
