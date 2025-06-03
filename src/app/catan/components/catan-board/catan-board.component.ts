import { NgIf, NgFor } from '@angular/common';
import { AfterViewInit, Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, HostListener, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Observable, of, ReplaySubject, Subject } from "rxjs";
import { forkJoin } from "rxjs/internal/observable/forkJoin";
import { map, take } from "rxjs/operators";

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Font, FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

import { mod } from "../../../helpers/js-modulo-fix";

import { MaterialColors } from "../../constants/MaterialColors";
import { MathConstants } from "../../constants/MathConstants";
import { ScaleConstants } from '../../constants/ScaleConstants';
import { HexOffset, HexOffsetMap } from "../../enums/hex-offset.enum";

import { allHexTypes, hexResourceTypes, HexType } from "../../enums/hex-type.enum";
import { HarborType, resourceHexTypes, ResourceType, resourceTypes } from "../../enums/resource-type.enum";
import { StructureType, StructureTypeModifiables } from "../../enums/structure-type.enum";

import { CanvasDimensions } from "../../interfaces/canvas-dimensions.interface";
import { HexMetadata } from "../../interfaces/hex-metadata.interface";
import { IntensiveAsset } from "../../interfaces/intensive-asset.interface";
import { StructureMetadata } from "../../interfaces/structure-metadata.interface";

import { CatanHelperService } from "../../services/catan-helper/catan-helper.service";
import { SceneManagerService } from "../../services/scene-manager/scene-manager.service";
import { GameStateService } from "../../services/game-state/game-state.service";
import { PlayerMetadata } from "../../interfaces/player-metadata";
import { RenderService } from "../../services/render/render.service";
import { XYPair } from '../../interfaces/xy-pair.interface';
import { CatanDiceComponent } from '../catan-dice/catan-dice.component';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { ThemeService } from '../../services/theme/theme.service';

type GameMode =  'structure' | 'board' | 'robber' | 'dice' | '';

@Component({
    selector: 'ctn-catan-board',
    standalone: true,
    imports: [NgIf, NgFor,
      MatButtonModule,
      MatCardModule,
      CatanDiceComponent],
    providers: [GameStateService, CatanHelperService, RenderService, SceneManagerService],
    templateUrl: './catan-board.component.html',
    styleUrls: ['./catan-board.component.scss']
})
export class CatanBoardComponent implements OnInit, AfterViewInit, OnDestroy {

  public debugWindowEnabled: boolean = false;

  private robberRef!: THREE.Mesh;

  private hexRefs: Map<number, Map<number, any>> = new Map();
  private hexMetadata: Map<THREE.Mesh, HexMetadata> = new Map();

  private structureRefs: Map<number, Map<number, any>> = new Map();
  private structureMetadata: Map<THREE.Mesh, StructureMetadata> = new Map();
  public structureTypeModifiables: StructureType[] | undefined;

  private assetRefs: any = {};

  public gameMode: GameMode = '';

  public selectedObj: THREE.Mesh | undefined;
  public selectedObjMeta: StructureMetadata | undefined;
  private selectedObjPrevMaterial: THREE.Material | undefined;
  private selectedObjPrevMeta: StructureMetadata | undefined;

  public currBoardLength: number = 5;
  public currBoardWidth: number = 2;

  public showMenuButtons: boolean = false;

  /* CANVAS PROPERTIES */
  public camera!: THREE.PerspectiveCamera;
  private raycaster!: THREE.Raycaster;

  public mouse!: THREE.Vector2;
  private mouseChanged!: boolean;
  private mouseOnPlane!: 0 | THREE.Vector3;

  private ngUnsub: Subject<void> = new Subject();

  private intensiveAssets: IntensiveAsset[] = [];
  public now: number = performance.now();
  public last: number = performance.now();
  public delta: number = 0;

  @ViewChild('canvas', { static: true })
  private canvasRef!: ElementRef;
  private get canvas(): HTMLCanvasElement {
    return this.canvasRef.nativeElement;
  }
  private canvasDimensions!: CanvasDimensions;

  public controls: any; // Actual type is THREE.OrbitControls, but compiler complains about no 'panningOptions' property.

  // This boolean determines whether to display animated assets
  // that need a new render every animation frame.
  // Leave disabled for devices that can't take the heat.
  public intensiveAssetsEnabled!: boolean;

  /* DEFAULT CAMERA PROPERTIES */
  public cameraX: number = 0;
  public cameraY: number = 50;
  public cameraZ: number = 50;

  public fieldOfView: number = 70;

  public nearClippingPane: number = 0.1;

  public farClippingPane: number = 500;

  private ThemeService = inject(ThemeService);

  constructor(public gameState: GameStateService,
    private catanHelper: CatanHelperService,
    private render: RenderService,
    private sceneManager: SceneManagerService) { }

  /* LIFECYCLE */
  public ngOnInit() {
    this.createOceanPlane();
    this.loadAssets().pipe(take(1))
      .subscribe((complete) => {
      })
  }

  public ngOnDestroy() {
    this.ngUnsub.next();
    this.ngUnsub.complete();
  }

  /**
   * We need to wait until template is bound to DOM before getting aspectRatio for camera,
   * as we need the view dimensions for it. Controls also depend on camera.
   */
  public ngAfterViewInit() {
    this.setCanvasDimensions();
    this.createCamera();
    this.render.initRenderer(this.canvas, this.canvasDimensions);
    this.initControls();
    this.generateBoard(this.currBoardLength, this.currBoardWidth);
    this.render.startRenderLoop(this);
  }

  /* USER INTERACTIVITY */
  @HostListener('window:orientationchange', ['$event'])
  public onOrientationChange() {
    this.resize();
  }

  @HostListener('window:resize', ['$event'])
  public onResize() {
    this.resize();
  }

  public onMouseMove(event: MouseEvent) {
    if (this.intensiveAssetsEnabled) {
      this.mouse.set( ( event.clientX / this.canvasDimensions.halfWidth ) - 1, - ( event.clientY / this.canvasDimensions.halfHeight ) + 1 );
      this.mouseChanged = true;
    }
  }

  private resize() {
    this.setCanvasDimensions();
    this.camera.aspect = this.getAspectRatio();
    this.camera.updateProjectionMatrix();

    this.render.updateSize(this.canvasDimensions);
  }

  private setCanvasDimensions() {
    if (this.canvas && this.canvas.parentElement) {
      const containerHeight = this.canvas.parentElement.clientHeight;
    const containerWidth = this.canvas.parentElement.clientWidth;
    this.canvas.height = containerHeight;
    this.canvas.width = containerWidth;
    this.canvasDimensions = {
      height: containerHeight, width: containerWidth,
      halfHeight: containerHeight / 2, halfWidth: containerWidth / 2 };
    } else {
      console.log("Unable to find Canvas Dimensions!");
    }
  }

  public onMouseClick(event: MouseEvent) {
    event.preventDefault();
    if (this.gameMode === 'structure') {
      this.mouse.set( ( event.clientX / this.canvasDimensions.halfWidth ) - 1, - ( event.clientY / this.canvasDimensions.halfHeight ) + 1 );
      this.raycaster.setFromCamera( this.mouse, this.camera );
      let intersects = this.raycaster.intersectObjects(Array.from(this.structureMetadata.keys()));

      if ( intersects.length > 0 ) {
        if (this.selectedObj !== intersects[0].object) {
          if (this.selectedObj) {
            // Previously selected obj
            this.resetSelectedObj();
          }

          this.selectedObj = intersects[0].object as THREE.Mesh;

          // Newly selected obj
          this.selectedObjPrevMaterial = this.selectedObj.material as THREE.Material;
          this.selectedObj.material = this.assetRefs["selected_material"];
          this.selectedObjMeta = this.structureMetadata.get(this.selectedObj);
          // Copy
          this.selectedObjPrevMeta = Object.assign({}, this.selectedObjMeta);
          if (this.selectedObjMeta && StructureTypeModifiables.has(this.selectedObjMeta.type)) {
            this.structureTypeModifiables = StructureTypeModifiables.get(this.selectedObjMeta.type);
          } else {
            this.structureTypeModifiables = undefined;
          }
        } else {
          // Selected obj is selected again. Deselect it.
          if (this.selectedObj && this.selectedObjMeta) {
            this.selectedObjMeta.instantiated = false;
            if (this.selectedObjMeta.type === StructureType.CITY) {
              this.setSelectedStructureType(StructureType.SETTLEMENT);
            }
            this.selectedObj.material = this.assetRefs["ghost_material"];
          }
          this.clearSelectedObj();
        }
      }
      this.sceneManager.setSceneUpdated(true);
    }
    if (this.gameMode === 'robber') {
      this.mouse.set( ( event.clientX / this.canvas.clientWidth ) * 2 - 1, - ( event.clientY / this.canvas.clientHeight ) * 2 + 1 );
      this.raycaster.setFromCamera( this.mouse, this.camera );
      let intersects = this.raycaster.intersectObjects(Array.from(this.hexMetadata.keys()));

      if ( intersects.length > 0 ) {
        let hexMesh = intersects[0].object as THREE.Mesh;
        let metadata = this.hexMetadata.get(hexMesh);
        if (metadata!.type !== HexType.OCEAN) {
          this.placeRobber(metadata!.x, metadata!.y);
        }
      }
    }
  }

  public modifyLenWidth(which: 'len'|'wid', amount: number) {
    if (which === 'len') {
      if (this.currBoardLength + amount > 0 && this.currBoardLength + amount > this.currBoardWidth) {
        this.currBoardLength += amount;
      }
    } else {
      if (this.currBoardWidth + amount >= 0 && this.currBoardWidth + amount < this.currBoardLength) {
        this.currBoardWidth += amount;
      }
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(ev: KeyboardEvent) {
    if (ev.key === 's') {
      this.toggleGameMode('structure');
    }
    if (ev.key === 'b') {
      this.toggleGameMode('board');
    }
    if (ev.key === 'r') {
      this.toggleGameMode('robber');
    }
    if (ev.key === 'd') {
      this.toggleGameMode('dice');
    }
    if (ev.key === 'Enter') {
      this.instantiateSelectedObj();
    }
    if (ev.keyCode >= 49 && ev.keyCode <= 52) {
      this.setPlayerOfSelectedStructure(this.gameState.players[Number(ev.key).valueOf() - 1]);
    }
    if (ev.key === 'i') {
      console.log(this.render.renderer.info);
      console.log(this.camera.toJSON());
      console.log(this.intensiveAssets);
    }
    if (ev.key === 'p') {
      this.toggleIntensiveAssets();
    }
  }

  // Disallows native scrolling for mobile when this component exists on a page.
  @HostListener('document:touchmove', ['$event'])
  onTouchMove(event: any) {
    event!.preventDefault();
    event!.stopPropagation();
  }

  public setPlayerOfSelectedStructure(player: PlayerMetadata) {
    if (this.selectedObj && this.selectedObjMeta) {
      this.selectedObj.material = new THREE.MeshLambertMaterial({color: player.color});
      this.selectedObjMeta.ownerId = player.id;
      this.sceneManager.setSceneUpdated(true);
    }
  }

  public setSelectedStructureType(structureType: StructureType) {
    if (this.selectedObjMeta && this.selectedObj) {
      if (structureType !== this.selectedObjMeta.type) {
        let newGeom;
        switch (structureType) {
          case "Settlement":
            newGeom = this.assetRefs["settlement_geom"];
            this.selectedObjMeta.type = StructureType.SETTLEMENT;
            break;
          case "City":
            newGeom = this.assetRefs["city_geom"];
            this.selectedObjMeta.type = StructureType.CITY;
            break;
          default:
            return;
        }
        // Remove the old structure
        if (this.selectedObj != null) {
          this.sceneManager.removeFromScene(this.selectedObj);
          this.structureMetadata.delete(this.selectedObj);
        }

        // Create the new structure
        let position = CatanHelperService.calculateCornerPositionFromCoords(this.selectedObjMeta.x, this.selectedObjMeta.y);
        this.selectedObj = new THREE.Mesh(
          newGeom, this.selectedObj.material);
        this.selectedObj.position.set(position.x, ScaleConstants.HEX_HEIGHT, position.y);
        this.structureMetadata.set(this.selectedObj, this.selectedObjMeta);
        this.sceneManager.addToScene(this.selectedObj);
      }
    } else {
      console.error("No selected object metadata or selected object mesh found!");
    }
  }

  public setSelectedOwner(player: PlayerMetadata) {
    if (this.selectedObj && this.selectedObjMeta) {
      this.selectedObjMeta.ownerId = player.id;
      if (!player.material) {
        player.material = new THREE.MeshLambertMaterial({ color: player.color });
      }
      this.selectedObj.material = player.material;
    }
  }

  public instantiateSelectedObj() {
    if (this.selectedObj && this.selectedObjMeta
      && this.selectedObjMeta.ownerId !== undefined) {
      this.selectedObjMeta.instantiated = true;
      this.sceneManager.setSceneUpdated(true);
      this.clearSelectedObj();
    }
  }

  private clearSelectedObj() {
    this.selectedObj = undefined;
    this.selectedObjPrevMaterial = undefined;
    this.selectedObjMeta = undefined;
  }

  // Sets the selected obj from what was stored in the "prev" obj
  private resetSelectedObj() {
    if (!this.selectedObjPrevMaterial || !this.selectedObjPrevMeta) {
      console.log("No reset data stored. Skipping selected object reset.")
      return;
    }
    if (this.selectedObj == undefined) {
      console.log("No selected object to reset. Skipping selected object reset.")
      return;
    }
    this.selectedObj.material = this.selectedObjPrevMaterial;
    if (this.selectedObjPrevMeta?.type) {
      this.setSelectedStructureType(this.selectedObjPrevMeta.type);
    }
    this.selectedObjMeta = this.selectedObjPrevMeta;
    this.structureMetadata.set(this.selectedObj, this.selectedObjPrevMeta);

    this.selectedObj = undefined;
    this.selectedObjPrevMaterial = undefined;
    this.selectedObjMeta = undefined;

    this.sceneManager.setSceneUpdated(true);
  }

  /* Does not check that the given xCoord and yCoord map to a valid tile placement
   * (For example, does not check that the tile is not an ocean tile) */
  private placeRobber(xCoord: number, yCoord: number) {
    if (this.hexRefs.has(xCoord) && this.hexRefs.get(xCoord)!.has(yCoord)) {
      let position = CatanHelperService.calculateTilePosition(xCoord, yCoord);
      this.robberRef.position.set(position.x, 0.5, position.y);
      this.robberRef.updateMatrix();
      this.sceneManager.setSceneUpdated(true);
    }
  }

  toggleGameMode(newGameMode: GameMode) {
    this.gameMode = (this.gameMode === newGameMode) ? '' : newGameMode;
    if (this.gameMode === 'structure') {
      this.showStructureGhosts();
    } else {
      this.hideStructureGhosts();
    }
    if (this.selectedObj) {
      this.resetSelectedObj();
    }
  }

  public resetBoard() {
    // TODO: Look for memory leaks here
    for (let i = this.sceneManager.getScene().children.length - 1; i >= 0; i--) {
      if (this.sceneManager.getScene().children[i].type === "Mesh") {
        this.sceneManager.removeFromScene(this.sceneManager.getScene().children[i]);
      }
    }
    this.hexRefs = new Map();
    this.hexMetadata = new Map();
    this.structureRefs = new Map();
    this.structureMetadata = new Map();
    this.createOceanPlane();
    this.generateBoard(this.currBoardLength, this.currBoardWidth);
    this.hideStructureGhosts();
  }

  private hideStructureGhosts() {
    if (this.selectedObjMeta && this.selectedObjMeta.instantiated === false) {
      if (this.selectedObjMeta.type === StructureType.CITY) {
        this.setSelectedStructureType(StructureType.SETTLEMENT);
      }
      this.resetSelectedObj();
    }
    this.structureMetadata.forEach((metadata, mesh) => {
      if (!metadata.instantiated) {
        mesh.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.visible = false;
          }
        });
      }
    });
    this.sceneManager.setSceneUpdated(true);
  }

  private showStructureGhosts() {
    this.structureMetadata.forEach((metadata, mesh) => {
      if (!metadata.instantiated) {
        mesh.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.visible = true;
          }
        });
      }
    });
    this.sceneManager.setSceneUpdated(true);
  }

  /* Generates a board with an x-cross section of LENGTH and
   * a y-width from center of WIDTH (a width of 0 leaves a single
   * line of hexes at the y=0 coordinate).
   *
   * The width must be less than the length, and this function ensures
   * this precondition.
   *
   * A standard Catan board is length 5 and width 2. */
  private generateBoard(length: number = 5, width: number = 2) {
    width = Math.min(length - 1, width);
    // Need to know how many tiles before we can set arrays of resource types
    // and roll numbers.
    let totalTileNum = length;
    let i;
    // the width of row i.
    let iw = length - 1;
    for (i = 1; i <= width && iw > 0; i++, iw--) {
      totalTileNum += iw * 2;
    }
    // totalTileNum should be correct once we get here
    let resourceArray = this.generateTileArray(totalTileNum);

    let startOffset = -1 * Math.floor(length / 2);
    // Ensure assets are loaded before we create the tiles
    this.loadAssets().pipe(take(1)).subscribe(() => {
      let x;
      let y;
      let hexagonData;
      for (y = width * -1; y <= width; y++) {
        for (x = startOffset + Math.abs(Math.min(0, y));
             x < startOffset + length - Math.abs(Math.max(0, y)); x++) {
          hexagonData = resourceArray.pop();
          if (hexagonData) {
            this.createTile(hexagonData.type, hexagonData.num, x, y);
          }
        }
      }

      // Create Structure Ghosts for each tile
      this.hexRefs.forEach((yPosMap, xCoord) => {
        yPosMap.forEach((tileRef, yCoord) => {
          this.createStructureGhosts(xCoord, yCoord);
        })
      });

      let totalHarborNum = 1 + (width * 2);
      // Add the ports on the top and bottom rows (length - width is how many land tiles are in the last row,
      // we add 1 because there is always 1 more ocean tile than the last row of land tiles.)
      totalHarborNum += Math.floor((length - width + 1) / 2) * 2;
      let harborArray = this.generateHarborArray(totalHarborNum);
      // Create Surrounding Ocean Tiles
      for (y = (width * -1) - 1; y <= width + 1; y++) {
        if (y === (width * -1) - 1 || y === width + 1) {
          // Top and bottom rows.
          for (x = startOffset + Math.abs(Math.min(0, y)) - 1;
               x < startOffset + length - Math.abs(Math.max(0, y)) + 1; x++) {
            this.createTile(HexType.OCEAN, undefined, x, y);
            let startIndex = startOffset + Math.abs(Math.min(0, y)) - 1;
            interface paramsInterface {
              corner: HexOffset | undefined,
              edge: HexOffset | undefined
            }
            let params: paramsInterface = { corner: undefined, edge: undefined};
            if (y === (width * -1) - 1) {
              // Bottom row
              if (mod(x - startIndex, 4) === 3) {
                params.corner = HexOffset.UPPER_LEFT;
                params.edge = HexOffset.UPPER_RIGHT;
              } else if (mod (x - startIndex, 2) === 1) {
                params.corner = HexOffset.TOP;
                params.edge = HexOffset.LOWER_RIGHT;
                if (x === startOffset + length - Math.abs(Math.max(0, y))) {
                  params.corner = HexOffset.UPPER_LEFT;
                  params.edge = HexOffset.UPPER_RIGHT;
                }
              }
            } else {
              // Top row
              if (mod(x - startIndex, 4) === 1) {
                params.corner = HexOffset.LOWER_RIGHT;
                params.edge = HexOffset.LOWER_LEFT;
                if (x === startOffset + length - Math.abs(Math.max(0, y))) {
                  params.corner = HexOffset.BOTTOM;
                  params.edge = HexOffset.UPPER_LEFT;
                }
              } else if (mod(x - startIndex, 2) === 1) {
                params.corner = HexOffset.BOTTOM;
                params.edge = HexOffset.UPPER_LEFT;
              }
            }
            if (params.corner && params.edge) {
              this.createHarbor(x, y, params.corner, params.edge, harborArray.pop());
            }
          }
        } else {
          if (Math.abs(y) <= length) {
            // Add an ocean tile on each end of the row
            let first: number = startOffset + Math.abs(Math.min(0, y)) - 1;
            let last: number = startOffset + length - Math.abs(Math.max(0, y));
            this.createTile(HexType.OCEAN, undefined,
              first, y);
            this.createTile(HexType.OCEAN, undefined,
              last, y);
            interface HarborParams {
              x: number,
              corner: HexOffset,
              edge: HexOffset
            }
            let harborParams: HarborParams = {
              x: 0,
              corner: HexOffset.TOP,
              edge: HexOffset.TOP
            };
            // get offsets based on y value.
            if (y % 2 === 0) {
              // Left side
              harborParams.x = first;
              if (y > 0) {
                harborParams.corner = HexOffset.LOWER_RIGHT;
                harborParams.edge = HexOffset.LOWER_LEFT;
              } else if (y < 0) {
                harborParams.corner = HexOffset.TOP;
                harborParams.edge = HexOffset.LOWER_RIGHT;
              } else {
                harborParams.corner = HexOffset.UPPER_RIGHT;
                harborParams.edge = HexOffset.BOTTOM;
              }
            } else {
              // Right side
              harborParams.x = last;
              harborParams.corner = HexOffset.LOWER_LEFT;
              harborParams.edge = HexOffset.TOP;
            }
            this.createHarbor(harborParams.x, y, harborParams.corner, harborParams.edge, harborArray.pop());
          }
        }
      }
    });
  }

  private generateTileArray(numTiles: number): {num?: number, type: HexType}[] {
    // Create the array of resource types.
    let resourceArray: HexType[] = [];
    // Add a desert tile.
    resourceArray.push(HexType.DESERT);
    numTiles -= 1;

    let eachResourceNum = Math.floor(numTiles / 5);
    hexResourceTypes.forEach((type: HexType) => {
      resourceArray = resourceArray.concat(new Array(eachResourceNum).fill(type));
    });
    // leftover tiles need to be filled with extra resource hexes.
    for (let i = 0; i < numTiles % 5; i++) {
      resourceArray.push(hexResourceTypes[i]);
    }
    resourceArray = CatanHelperService.shuffle(resourceArray);

    // Create the array of token numbers.
    let tokenNums = CatanHelperService.getTokenNumbers();
    let tokenArray: any[] = [];
    let eachTokenNum = Math.floor(numTiles / tokenNums.length);
    tokenNums.forEach((num: number) => {
      tokenArray = tokenArray.concat(new Array(eachTokenNum).fill(num));
    });
    for (let i = 0; i < numTiles % tokenNums.length; i++) {
      tokenArray.push(tokenNums[i]);
    }
    tokenArray = CatanHelperService.shuffle(tokenArray);

    return resourceArray.map((resource: HexType) => {
      if (resource === HexType.DESERT) {
        return {type: resource};
      } else {
        return {type: resource, num: tokenArray.pop()}
      }
    });
  }

  private generateHarborArray(numHarbors: number): HarborType[] {
    // Create the array of resource types.
    let resourceArray: HarborType[] = [];
    // Half of the harbors should be resource specific.
    let eachResourceNum = Math.floor(Math.ceil(numHarbors / 2) / resourceTypes.length);

    resourceHexTypes.forEach((type: HexType) => {
      resourceArray = resourceArray.concat(new Array(eachResourceNum).fill(type));
    });
    // leftover harbors are 3:1
    for (let i = resourceArray.length; i < numHarbors; i++) {
      resourceArray.push('3:1');
    }
    resourceArray = CatanHelperService.shuffle(resourceArray);
    return resourceArray;
  }

  /**
   * Create tile. Only call this after assets have been loaded from the .loadAssets() call.
   */
  private createTile(hexType: HexType, resourceNumber: number | undefined,
                     xCoord: number, yCoord: number): void {
    let refName = "hex_" + HexType[hexType];
    if (!this.assetRefs["loaded"] || !this.assetRefs[refName]) {
      console.log("Asset type: " + refName + " not loaded!");
      return;
    }
    let position = CatanHelperService.calculateTilePosition(xCoord, yCoord);
    const newTile = this.assetRefs[refName].clone();
    // Don't allow change in the yCoordinate, which would be vertical.
    newTile.position.set(position.x, 0, position.y);
    if (!this.hexRefs.get(xCoord)) {
      this.hexRefs.set(xCoord, new Map());
    }
    this.hexRefs.get(xCoord)!.set(yCoord, {tile: newTile});
    this.hexMetadata.set(newTile, { x: xCoord, y: yCoord, instantiated: true, type: hexType});
    let tileRef = this.hexRefs.get(xCoord)!.get(yCoord);
    this.sceneManager.addToScene(newTile);

    this.createToken(resourceNumber, position, tileRef);
    if (hexType === HexType.DESERT && this.robberRef) {
      this.placeRobber(xCoord, yCoord);
      this.sceneManager.addToScene(this.robberRef);
    }
  }

  private createToken(resourceNumber: number | undefined, coordinates: XYPair, tileRef: any) {
    if (resourceNumber) {
      if (!this.assetRefs["token_" + resourceNumber]) {
        console.log("Asset type: token_" + resourceNumber + " not loaded!");
        return;
      }
      const tokenBase = this.assetRefs["token_base"].clone();
      const resourceToken = this.assetRefs["token_" + resourceNumber].clone();
      const digitFactor = resourceNumber.toString().length;
      resourceToken.position.set(
        coordinates.x - (digitFactor * ScaleConstants.TOKEN_TEXT_SCALE),
        0.5,
        coordinates.y + (0.6 * ScaleConstants.TOKEN_TEXT_SCALE));
      tokenBase.position.set(coordinates.x, 0.3, coordinates.y);
      tileRef["token"] = resourceToken;
      tileRef["token_base"] = tokenBase;
      this.sceneManager.addToScene(resourceToken);
      this.sceneManager.addToScene(tokenBase);
    }
  }

  private createHarbor(hexXCoord: number, hexYCoord: number,
                       cornerOffset: HexOffset, edgeOffset: HexOffset,
                       harborType: HarborType | undefined) {
    if (!harborType) {
      console.log("Attempted creation of harbor with no type specified");
      return;
    }
    let refName = "harbor_" + harborType;
    if (!this.assetRefs[refName]) {
      console.log("Asset type: " + refName + " not loaded!");
      return;
    }
    let harborLocation = CatanHelperService.calculateEdgeLocation(hexXCoord, hexYCoord, cornerOffset, edgeOffset);
    let harborPosition = harborLocation.pos;
    let harborRef = this.assetRefs[refName].clone();
    harborRef.position.set(harborPosition.x, 0.3, harborPosition.y);
    harborRef.rotateY(harborPosition.rot);
    this.sceneManager.addToScene(harborRef);
  }

  private createStructureGhosts(hexXCoord: number, hexYCoord: number) {
    let cornerXCoord = hexXCoord * 2 + hexYCoord;
    if (!this.structureRefs.has(cornerXCoord)) {
      this.structureRefs.set(cornerXCoord, new Map<number, any>());
    }
    if (!this.structureRefs.has(cornerXCoord + 1)) {
      this.structureRefs.set(cornerXCoord + 1, new Map<number, any>());
    }
    if (!this.structureRefs.has(cornerXCoord - 1)) {
      this.structureRefs.set(cornerXCoord - 1, new Map<number, any>());
    }

    let cornerCoords;
    HexOffsetMap.forEach((value, offset) => {
      cornerCoords = CatanHelperService.getCornerCoords(hexXCoord, hexYCoord, offset);
      if (!this.structureRefs.get(cornerCoords.x)!.has(cornerCoords.y)) {
        this.createSettlementGhost(hexXCoord, hexYCoord, cornerCoords.x, cornerCoords.y, offset);
      }
    });
    this.hideStructureGhosts();
  }

  private createSettlementGhost(hexXCoord: number, hexYCoord: number, cornerXCoord: number, cornerYCoord: number, cornerOffset: HexOffset) {
    if (!this.structureRefs.get(cornerXCoord)!.get(cornerYCoord)) {
      this.structureRefs.get(cornerXCoord)!.set(cornerYCoord, {ghosts: [], reals: []});
    }
    let buildingRef = this.structureRefs.get(cornerXCoord)!.get(cornerYCoord);
    let settlementPosition = CatanHelperService.calculateCornerPosition(hexXCoord, hexYCoord, cornerOffset);
    let settlementRef = new THREE.Mesh(
      this.assetRefs["settlement_geom"], this.assetRefs["ghost_material"]);
    settlementRef.position.set(settlementPosition.x, ScaleConstants.HEX_HEIGHT, settlementPosition.y);
    buildingRef["corner_building"] = settlementRef;
    this.structureMetadata.set(settlementRef, {x: cornerXCoord, y: cornerYCoord, instantiated: false, type: StructureType.SETTLEMENT, ownerId: 0});
    buildingRef.ghosts.push(settlementRef);
    this.sceneManager.addToScene(settlementRef);

    let adjacentTiles = CatanHelperService.getAdjacentTileCoords(cornerXCoord, cornerYCoord);
    if ((cornerXCoord + cornerYCoord) % 2 === 0) {
      let upperLeft = adjacentTiles.get(HexOffset.UPPER_LEFT)!;
      let upperRight = adjacentTiles.get(HexOffset.UPPER_RIGHT)!;
      if ((this.hexRefs.get(upperLeft.x) && this.hexRefs.get(upperLeft.x)!.get(upperLeft.y))
          || (this.hexRefs.get(upperRight.x) && this.hexRefs.get(upperRight.x)!.get(upperRight.y))) {
        this.createRoadGhost(buildingRef, hexXCoord, hexYCoord, cornerOffset, HexOffset.TOP);
      }
    } else {
      let lowerLeft = adjacentTiles.get(HexOffset.LOWER_LEFT)!;
      let lowerRight = adjacentTiles.get(HexOffset.LOWER_RIGHT)!;
      let top = adjacentTiles.get(HexOffset.TOP)!;
      if (this.hexRefs.get(top.x) &&
        (this.hexRefs.get(top.x)!.get(top.y) || this.hexRefs.get(lowerLeft.x)!.get(lowerLeft.y))) {
        this.createRoadGhost(buildingRef, hexXCoord, hexYCoord, cornerOffset, HexOffset.UPPER_LEFT);
      }
      if ((this.hexRefs.get(top.x) && this.hexRefs.get(top.x)!.get(top.y))
          || (this.hexRefs.get(lowerRight.x) && this.hexRefs.get(lowerRight.x)!.get(lowerRight.y))) {
        this.createRoadGhost(buildingRef, hexXCoord, hexYCoord, cornerOffset, HexOffset.UPPER_RIGHT);
      }
    }
  }

  private createRoadGhost(buildingRef: any, hexXCoord: number, hexYCoord: number, cornerOffset: HexOffset, edgeOffset: HexOffset) {
    let roadLocation = CatanHelperService.calculateEdgeLocation(hexXCoord, hexYCoord, cornerOffset, edgeOffset);
    let roadPosition = roadLocation.pos;
    let roadCoords = roadLocation.coords;
    let roadRef = new THREE.Mesh(
      this.assetRefs["road_geom"], this.assetRefs["ghost_material"]);
    roadRef.position.set(roadPosition.x, 0.3, roadPosition.y);
    roadRef.rotateY(roadPosition.rot);
    buildingRef["road_" + edgeOffset] = roadRef;
    buildingRef.ghosts.push(roadRef);
    this.structureMetadata.set(roadRef, {x: roadCoords.x, y: roadCoords.y, instantiated: false, type: StructureType.ROAD, ownerId: 0});
    this.sceneManager.addToScene(roadRef);
  }

  private removeTile(xPosition: number, yPosition: number) {
    if (this.hexRefs.get(xPosition) && this.hexRefs.get(xPosition)!.get(yPosition)) {
      let obj = this.hexRefs.get(xPosition)!.get(yPosition);
      for (let mesh in obj) {
        if (obj.hasOwnProperty(mesh)) {
          this.sceneManager.removeFromScene(obj[mesh]);
        }
      }
    }
  }

  private toggleIntensiveAssets() {
    this.intensiveAssetsEnabled = !this.intensiveAssetsEnabled;
    if (this.intensiveAssetsEnabled) {
      this.loadIntensiveAssets().subscribe(() => {
        for (let i = 0; i < 50; i++) {
          this.addSheep();
        }
      });
      console.log("added sheep!")
    } else {
      this.intensiveAssets.forEach((asset) => {
        this.sceneManager.removeFromScene(asset.mesh);
      });
      this.intensiveAssets = [];
    }
  }

  private addSheep() {
    // let sheepAsset: THREE.Mesh = this.assetRefs["sheep"].clone();
    // // Pick a length between token radius and tile edge, pick a random rotation.
    // sheepAsset.position.add(new Vector3(THREE.Math.randFloat(2.1, ScaleConstants.DISTANCE_CENTER_TO_EDGE - 1), 0 , 0))
    //   .applyAxisAngle(new Vector3(0, 1, 0), THREE.Math.randFloat(0, 2 * Math.PI));
    // const deltaOffset = THREE.Math.randFloat(0, 1);
    // this.intensiveAssets.push({type: 'sheep', deltaOffset, mesh: sheepAsset, animate: this.bounce});
    // this.sceneManager.addToScene(sheepAsset);
  }

  /* ANIMATION */

  public setTime() {
    this.now = performance.now();
    // Math.min with 1 gives a safety cap on large deltas
    this.delta = Math.min(( this.now - this.last ) / 1000, 1);
    this.last = this.now;
  }

  public animateMeshes() {
    this.intensiveAssets.forEach((asset) => {
      asset.animate(this.now, asset);
    });
  }

  private bounce(time: number, self: IntensiveAsset) {
    self.mesh.position.setY(ScaleConstants.HEX_HEIGHT +
      ScaleConstants.SHEEP_BOUNCE_HEIGHT * Math.abs(Math.sin((ScaleConstants.SHEEP_BOUNCE_PERIOD * time) +  self.deltaOffset)));
  }

  private createCamera() {
    /* Camera */
    const aspectRatio = this.getAspectRatio();
    this.camera = new THREE.PerspectiveCamera(
      this.fieldOfView,
      aspectRatio,
      this.nearClippingPane,
      this.farClippingPane
    );
    this.camera.position.set(this.cameraX, this.cameraY, this.cameraZ);
  }

  private createOceanPlane() {
    let oceanPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(ScaleConstants.INTERSECTION_PLANE_LIMIT, ScaleConstants.INTERSECTION_PLANE_LIMIT),
      new THREE.MeshLambertMaterial({color: MaterialColors.OCEAN_PLANE}));
    oceanPlane.rotateX(MathConstants.NEG_PI_OVER_2);
    oceanPlane.translateY(-1 * ScaleConstants.HEX_HEIGHT);
    this.sceneManager.addToScene(oceanPlane);
  }

  private getAspectRatio() {
    return this.canvas.clientWidth / this.canvas.clientHeight;
  }

  private initControls() {
    // helpful link for OrbitControls properties:
    // https://threejs.org/docs/#examples/controls/OrbitControls
    this.controls = new OrbitControls(this.camera, this.render.getRenderer().domElement);
    // How far you can orbit vertically, upper and lower limits.
    this.controls.minPolarAngle = 0;
    this.controls.maxPolarAngle = (Math.PI * 4) / 9;

    // How far you can dolly in and out
    this.controls.minDistance = 5;
    this.controls.maxDistance = 200;

    this.controls.enableZoom = true;
    this.controls.zoomSpeed = 0.5;

    this.controls.enablePan = true;
    this.controls.keyPanSpeed = 20;
    // Sets the panning mode to THREE.HorizontalPanning instead of THREE.ScreenSpacePanning
    // (Horizontal maintains y value in camera panning)
    // The constants are not defined in the typescript types, so here they are:
    // THREE.ScreenSpacePanning: 0
    // THREE.HorizontalPanning: 1
    this.controls.screenSpacePanning = false;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
  }

  public castMouseToPlane() {
    if (this.mouseChanged || this.render.viewDirty) {
      this.raycaster.setFromCamera( this.mouse, this.camera );
      const intersection = this.raycaster.intersectObject(this.sceneManager.INTERSECTION_PLANE);
      this.mouseOnPlane = intersection.length && intersection[0] && intersection[0].point;
      this.mouseChanged = false;
    }
  }

  /* LOADERS */

  private loadAssets(): Observable<boolean> {
    if (this.assetRefs["loaded"]) {
      return of(true);
    }
    return forkJoin([
      this.loadMaterials(),
      this.loadHexes(),
      this.loadHexTokens(),
      this.loadStructures()
    ]).pipe(map((bools: boolean[]) => {
      const errors = bools.indexOf(false) >= 0;
      if (!errors) {
        this.assetRefs["loaded"] = true;
      }
      return !errors;
    }));
  }

  private loadMaterials(): Observable<boolean> {
    const loadingComplete = new ReplaySubject<boolean>(1);

    this.assetRefs["harbor_material"] = new THREE.MeshLambertMaterial(
      {color: MaterialColors.DESERT_HEX});
    this.assetRefs["ghost_material"] = new THREE.MeshLambertMaterial(
      {transparent: true, opacity: 0.5, color: MaterialColors.GHOST_MATERIAL});
    this.assetRefs["selected_material"] = new THREE.MeshLambertMaterial(
      {emissive: 0x00ff00, color: MaterialColors.SELECTED_MATERIAL});

    loadingComplete.next(true);
    loadingComplete.complete();
    return loadingComplete;
  }

  private loadHexes(): Observable<boolean> {
    const loadingComplete = new ReplaySubject<boolean>(1);
    this.assetRefs["hex_geom"] = new THREE.CylinderGeometry(ScaleConstants.HEX_CORNER_RADIUS, 7.8, 0.5, 6);
    allHexTypes.forEach((type: HexType) => {
      this.assetRefs["hex_" + type.toString()] = new THREE.Mesh(this.assetRefs["hex_geom"],
        new THREE.MeshLambertMaterial({color: MaterialColors.getHexColor(type)}));
    });
    loadingComplete.next(true);
    loadingComplete.complete();
    return loadingComplete;
  }

  /* Loads objects that appear on hexes, like number tokens, the robber, harbors, etc. */
  private loadHexTokens(): Observable<boolean> {

    const loadingComplete = new Subject<boolean>();
    const fontLoader = new FontLoader();
    this.assetRefs["token_base"] = new THREE.Mesh(
      new THREE.CylinderGeometry(2, 2, 0.5, 16),
      new THREE.MeshLambertMaterial({color: MaterialColors.TOKEN_BASE})
    );
    let tokenPipGeom = new THREE.CylinderGeometry(0.2, 0.2, 0.3, 5);
    fontLoader.load('./assets/fonts/gentilis_regular.typeface.json', (font: Font) => {
      // Create a token for each possible resource number
      const resourceNumbers = CatanHelperService.getTokenNumbers().map((num: number) => {

        let geometryArray: THREE.BufferGeometry[] = [];
        let numberGeometry = new THREE.ShapeGeometry(font.generateShapes(num.toString(), 9));
        numberGeometry.rotateX(MathConstants.NEG_PI_OVER_2);
        
        numberGeometry.translate(-2 * num.toString().length, 0.5, 0);
        numberGeometry.scale(ScaleConstants.TOKEN_TEXT_SCALE, ScaleConstants.TOKEN_TEXT_SCALE, ScaleConstants.TOKEN_TEXT_SCALE);

        geometryArray.push(numberGeometry);

        const digitFactor = num.toString().length;
        const numPips = CatanHelperService.getNumPips(num);
        const pipOffset = -1 * (numPips - 1) * (ScaleConstants.TOKEN_PIP_DISTANCE / 2) + (digitFactor * ScaleConstants.TOKEN_TEXT_SCALE);
        let tokenPip;
        for (let i = 0; i < numPips; i++) {
          tokenPip = tokenPipGeom.clone();
          tokenPip.translate(pipOffset + (ScaleConstants.TOKEN_PIP_DISTANCE * i), 0, 0.6);
          geometryArray.push(tokenPip);
        }

        let totalGeometry: THREE.BufferGeometry = BufferGeometryUtils.mergeGeometries(geometryArray);

        let totalMesh = new THREE.Mesh(
          totalGeometry,
          new THREE.MeshLambertMaterial({color: (num === 6 || num === 8)
              ? MaterialColors.IMPORTANT_TOKEN_TEXT : MaterialColors.TOKEN_TEXT}));
        
        return [ num, totalMesh ];
      });
      resourceNumbers.forEach(([num, mesh]) => {
        this.assetRefs["token_" + num] = mesh;
      });
      loadingComplete.next(true);
      loadingComplete.complete();
    });

    // Harbor
    let harborPts = [];
    harborPts.push( new THREE.Vector2(-3.3, 0));
    harborPts.push( new THREE.Vector2(-3.2, 2));
    harborPts.push( new THREE.Vector2(-2.4, 2.5));
    harborPts.push( new THREE.Vector2(-2, 2));
    harborPts.push( new THREE.Vector2(-1, 0.7));
    harborPts.push( new THREE.Vector2(0, 0.5));
    harborPts.push( new THREE.Vector2(1, 0.7));
    harborPts.push( new THREE.Vector2(2, 2));
    harborPts.push( new THREE.Vector2(2.4, 2.5));
    harborPts.push( new THREE.Vector2(3.2, 2));
    harborPts.push( new THREE.Vector2( 3.3, 0 ) );
    let harborShape = [new THREE.Shape( harborPts )];
    let harborGeom = new THREE.ExtrudeGeometry(
      harborShape, { bevelEnabled: true, bevelSegments: 1, bevelThickness: 0.5, bevelSize: 0.5, depth: 0.1 });
    harborGeom.rotateY(MathConstants.NEG_PI_OVER_2);
    harborGeom.rotateZ(MathConstants.NEG_PI_OVER_2);
    harborGeom.translate(0.3, -0.5, 0);
    this.assetRefs["harbor_geom"] = harborGeom;

    resourceHexTypes.forEach((type: HexType) => {
      this.assetRefs["harbor_" + type] = new THREE.Mesh(this.assetRefs["harbor_geom"],
        new THREE.MeshLambertMaterial({color: MaterialColors.getHexColor(type)}));
    });
    this.assetRefs["harbor_3:1"] = new THREE.Mesh(this.assetRefs["harbor_geom"],
      new THREE.MeshLambertMaterial({color:  MaterialColors.getHexColor(HexType.DESERT)}));

    let robberPts = [];
    robberPts.push( new THREE.Vector2(1, 0));
    robberPts.push( new THREE.Vector2(1, 0.3));
    robberPts.push( new THREE.Vector2(0.7, 0.5));
    robberPts.push( new THREE.Vector2(0.9, 1));
    robberPts.push( new THREE.Vector2(1, 1.5));
    robberPts.push( new THREE.Vector2(0.9, 2));
    robberPts.push( new THREE.Vector2(0.6, 3));
    robberPts.push( new THREE.Vector2(0.65, 3.5));
    robberPts.push( new THREE.Vector2(0.6, 3.7));
    robberPts.push( new THREE.Vector2(0.4, 3.9));
    robberPts.push( new THREE.Vector2(0, 4));
    let robberGeom = new THREE.LatheGeometry(robberPts, 12);
    this.robberRef = new THREE.Mesh(robberGeom, new THREE.MeshLambertMaterial({ color: MaterialColors.ROBBER}));

    return loadingComplete;
  }

  private loadStructures(): Observable<boolean> {
    const loadingComplete = new ReplaySubject<boolean>(1);

    // Settlement
    let settlementPts = [];
    settlementPts.push( new THREE.Vector2( -0.6, 0 ) );
    settlementPts.push( new THREE.Vector2(-0.6, 1));
    settlementPts.push( new THREE.Vector2(0, 1.5));
    settlementPts.push( new THREE.Vector2(0.6, 1));
    settlementPts.push( new THREE.Vector2( 0.6, 0 ) );
    let settlementShape = [new THREE.Shape( settlementPts )];
    let settlementGeom = new THREE.ExtrudeGeometry(
      settlementShape, { bevelEnabled: false, depth: 1.4 });
    settlementGeom.translate(0, -0.3, -0.6);
    this.assetRefs["settlement_geom"] = settlementGeom;

    // City
    let cityPts = [];
    cityPts.push( new THREE.Vector2( -1, 0 ) );
    cityPts.push( new THREE.Vector2(-1, 1.6));
    cityPts.push( new THREE.Vector2(-0.5, 2));
    cityPts.push( new THREE.Vector2(0, 1.6));
    cityPts.push( new THREE.Vector2( 0, 1 ) );
    cityPts.push( new THREE.Vector2(1, 1));
    cityPts.push( new THREE.Vector2( 1, 0 ) );
    let cityShape = [new THREE.Shape( cityPts )];
    let cityGeom = new THREE.ExtrudeGeometry(
      cityShape, { bevelEnabled: false, depth: 1.4 });
    cityGeom.translate(0, -0.3, -0.5);
    this.assetRefs["city_geom"] = cityGeom;


    // Road
    this.assetRefs["road_geom"] = new THREE.BoxGeometry(0.7, 0.9, 4);

    loadingComplete.next(true);
    loadingComplete.complete();
    return loadingComplete;
  }

  // Adding these assets to the board state dramatically increases CPU/GPU usage.
  private loadIntensiveAssets(): Observable<boolean> {
    if (this.assetRefs["intensive_loaded"]) {
      return of(true);
    }
    const loadingComplete = new ReplaySubject<boolean>(1);
    // Sheep
    let sheepBodyGeom = new THREE.SphereGeometry(1, 8, 4);
    let sheepHeadGeom = new THREE.LatheGeometry(
      [new THREE.Vector2(0, 0.2), new THREE.Vector2(0.4, 0.8)],
      2, 0, Math.PI);
    sheepBodyGeom.scale(1.4, 1, 1);
    sheepHeadGeom.rotateZ(Math.PI / 3);
    sheepHeadGeom.translate(1.7, 0, 0);
    let sheepBodyMaterial = new THREE.MeshLambertMaterial({ color: MaterialColors.SHEEP_BODY });
    let sheepHeadMaterial = new THREE.MeshLambertMaterial({ color: MaterialColors.SHEEP_HEAD });
    let sheepBody = new THREE.Mesh(sheepBodyGeom, sheepBodyMaterial);
    let sheepHead = new THREE.Mesh(sheepHeadGeom, sheepHeadMaterial);
    sheepBody.matrixAutoUpdate = false;
    sheepBody.updateMatrix();
    sheepHead.matrixAutoUpdate = false;
    sheepHead.updateMatrix();
    let sheepGroup = new THREE.Group();
    sheepGroup.add(sheepBody);
    sheepGroup.add(sheepHead);
    sheepGroup.scale.set(0.1, 0.1, 0.1);
    this.assetRefs["sheep"] = sheepGroup;
    loadingComplete.next(true);
    loadingComplete.complete();
    this.assetRefs["intensive_loaded"] = true;
    return loadingComplete;
  }
}
