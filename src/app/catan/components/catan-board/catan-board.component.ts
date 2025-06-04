import { NgIf, NgFor } from '@angular/common';
import { AfterViewInit, Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, HostListener, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Observable, of, ReplaySubject, Subject } from "rxjs";
import { forkJoin } from "rxjs/internal/observable/forkJoin";
import { map, take, takeUntil } from "rxjs/operators";

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

type GameMode =  'structure' | 'board' | 'robber' | 'dice' | '';

@Component({
    selector: 'ctn-catan-board',
    standalone: true,
    imports: [NgIf, NgFor,
      MatButtonModule,
      MatCardModule,
      CatanDiceComponent],
    templateUrl: './catan-board.component.html',
    styleUrls: ['./catan-board.component.scss']
})
export class CatanBoardComponent implements OnInit, AfterViewInit, OnDestroy {
  private gameState = inject(GameStateService);
  private render = inject(RenderService);
  private sceneManager = inject(SceneManagerService);


  private ngUnsub: Subject<void> = new Subject();

  public debugWindowEnabled: boolean = false;

  private hexMetadataFromCoords: Map<number, Map<number, HexMetadata>> = new Map();
  private hexMetadataFromRef: Map<THREE.Mesh, HexMetadata> = new Map();

  private structureRefs: Map<number, Map<number, any>> = new Map();
  private structureMetadataFromRef: Map<THREE.Mesh, StructureMetadata> = new Map();
  public structureTypeModifiables: StructureType[] | undefined;

  private assetRefsLoaded: boolean = false;
  private materialRefs: Map<string, THREE.Material> = new Map();
  private geomRefs: Map<string, THREE.BufferGeometry> = new Map();

  public gameMode: GameMode = '';

  public selectedMesh: THREE.Mesh | undefined;

  public selectedStructureMeta: StructureMetadata | undefined;
  private selectedStructurePrevMaterial: THREE.Material | THREE.Material[] | undefined;
  private selectedStructurePrevMeta: StructureMetadata | undefined;

  public selectedHexMeta: HexMetadata | undefined;
  private selectedHexPrevMaterial: THREE.Material | THREE.Material[] | undefined;
  private selectedHexPrevMeta: HexMetadata | undefined;

  private robberRef: THREE.Mesh | undefined;

  public currBoardLength: number = 5;
  public currBoardWidth: number = 2;

  public showMenuButtons: boolean = false;

  public hexNumbers: number[] = CatanHelperService.getTokenNumbers();
  public allHexTypes: HexType[] = allHexTypes;
  public hexTypeColors: string[] = allHexTypes.map((type) => { return '#' + MaterialColors.getColorForHexType(type).toString(16)});
  public players: PlayerMetadata[] = [];

  private intensiveAssets: IntensiveAsset[] = [];
  public now: number = performance.now();
  public last: number = performance.now();
  public delta: number = 0;

  @ViewChild('canvas', { static: true })
  private canvasRef!: ElementRef;
  private get canvas(): HTMLCanvasElement {
    return this.canvasRef.nativeElement;
  }

  public controls!: OrbitControls;

  // This boolean determines whether to display animated assets
  // that need a new render every animation frame.
  // Leave disabled for devices that can't take the heat.
  public intensiveAssetsEnabled!: boolean;

  /* LIFECYCLE */
  public ngOnInit() {
    this.loadAssets().pipe(take(1))
      .subscribe((complete) => {});
    this.gameState.getPlayers().pipe(takeUntil(this.ngUnsub))
    .subscribe((players) => {
      this.players = players;
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
    this.sceneManager.createCamera(this.canvas);
    this.render.initRenderer(this.canvas);
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

  private resize() {
    this.sceneManager.resize(this.canvas);
    this.render.updateSize(this.canvas);
  }

  public onMouseClick(event: MouseEvent) {
    event.preventDefault();
    if (this.gameMode === 'structure') {
      let intersects = this.sceneManager.raycast(
        event, Array.from(this.structureMetadataFromRef.keys()), this.canvas);

      if ( intersects.length > 0 ) {
        if (this.selectedMesh !== intersects[0].object) {
          // If new object is selected
          if (this.selectedMesh) {
            // If there is an old selected object, reset it.
            this.resetSelectedStructure();
          }

          this.selectedMesh = intersects[0].object as THREE.Mesh;

          // Backup newly selected material in "prev" and apply the "selected" material
          this.selectedStructurePrevMaterial = this.selectedMesh.material;
          this.selectedMesh.material = this.materialRefs.get("selected")!;
          // Backup the newly selected object metadata in case it needs resetting.
          this.selectedStructureMeta = this.structureMetadataFromRef.get(this.selectedMesh);
          this.selectedStructurePrevMeta = Object.assign({}, this.selectedStructureMeta);
          if (this.selectedStructureMeta && StructureTypeModifiables.has(this.selectedStructureMeta.type)) {
            this.structureTypeModifiables = StructureTypeModifiables.get(this.selectedStructureMeta.type);
          } else {
            this.structureTypeModifiables = undefined;
          }
        } else {
          // Selected structure has been selected again. Reset it to a settlement ghost.
          if (this.selectedMesh && this.selectedStructureMeta) {
            this.selectedStructureMeta.instantiated = false;
            if (this.selectedStructureMeta.type === StructureType.CITY) {
              this.setSelectedStructureType(StructureType.SETTLEMENT);
            }
            this.selectedMesh.material = this.materialRefs.get("ghost")!;
          }
          this.clearSelectedObj();
        }
      }
      this.sceneManager.setSceneUpdated(true);
    }
    if (this.gameMode === 'robber' || this.gameMode === 'board') {
      let intersects = this.sceneManager.raycast(
        event, Array.from(this.hexMetadataFromRef.keys()), this.canvas);

      if ( intersects.length > 0 ) {
        // Get the mesh and metadata for selected hex
        let hexMesh = intersects[0].object as THREE.Mesh;
        let metadata = this.hexMetadataFromRef.get(hexMesh);
        if (this.gameMode === 'robber') {
          if (metadata!.type !== HexType.OCEAN) {
            this.placeRobber(metadata!.x, metadata!.y);
          }
        } else if (this.selectedMesh !== hexMesh) {
          // If new object is selected
          if (this.selectedMesh) {
            // If there is an old selected hex, reset it.
            this.resetSelectedHex();
          }

          this.selectedMesh = hexMesh;

          // Backup newly selected material in "prev" and apply the "selected" material
          this.selectedHexPrevMaterial = this.selectedMesh.material;
          this.selectedMesh.material = this.materialRefs.get("selected")!;
          // Backup the newly selected object metadata in case it needs resetting.
          this.selectedHexMeta = metadata;
          this.selectedHexPrevMeta = Object.assign({}, this.selectedHexMeta);
        } else {
          // Selected hex has been selected again. Reset it to its previous state.
          this.resetSelectedHex();
        }
      }
      this.sceneManager.setSceneUpdated(true);
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
    if (ev.key === 'i') {
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
    if (this.selectedMesh && this.selectedStructureMeta) {
      this.selectedMesh.material = new THREE.MeshLambertMaterial({color: player.color});
      this.selectedStructureMeta.ownerId = player.id;
      this.sceneManager.setSceneUpdated(true);
    }
  }

  public setSelectedStructureType(structureType: StructureType) {
    if (this.selectedMesh && this.selectedStructureMeta) {
      if (structureType !== this.selectedStructureMeta.type) {
        let newGeom;
        switch (structureType) {
          case "Settlement":
            newGeom = this.geomRefs.get("settlement");
            this.selectedStructureMeta.type = StructureType.SETTLEMENT;
            break;
          case "City":
            newGeom = this.geomRefs.get("city");
            this.selectedStructureMeta.type = StructureType.CITY;
            break;
          default:
            return;
        }
        // Remove the old structure
        if (this.selectedMesh != null) {
          this.sceneManager.removeFromScene(this.selectedMesh);
          this.structureMetadataFromRef.delete(this.selectedMesh);
        }

        // Create the new structure
        let position = CatanHelperService.calculateCornerPositionFromCoords(this.selectedStructureMeta.x, this.selectedStructureMeta.y);
        this.selectedMesh = new THREE.Mesh(
          newGeom, this.selectedMesh.material);
        this.selectedMesh.position.set(position.x, ScaleConstants.HEX_HEIGHT, position.y);
        this.structureMetadataFromRef.set(this.selectedMesh, this.selectedStructureMeta);
        this.sceneManager.addToScene(this.selectedMesh);
      }
    } else {
      console.error("No selected object metadata or selected object mesh found!");
    }
  }

  public setSelectedOwner(player: PlayerMetadata) {
    if (this.selectedMesh && this.selectedStructureMeta) {
      this.selectedStructureMeta.ownerId = player.id;
      if (!player.material) {
        player.material = new THREE.MeshLambertMaterial({ color: player.color });
      }
      this.selectedMesh.material = player.material;
    }
  }

  public setHexResource(hexMeta: HexMetadata, hexType: HexType) {
    // hexMeta.type = hexType;
    console.warn("setting hex %s to type %s", hexMeta, hexType);
    // TODO FINISH
  }

  public instantiateSelectedObj() {
    if (this.selectedMesh && this.selectedStructureMeta
      && this.selectedStructureMeta.ownerId !== 0) {
      this.selectedStructureMeta.instantiated = true;
      this.sceneManager.setSceneUpdated(true);
      this.clearSelectedObj();
    }
  }

  private clearSelectedObj() {
    this.selectedMesh = undefined;

    this.selectedStructureMeta = undefined;
    this.selectedStructurePrevMeta = undefined;
    this.selectedStructurePrevMaterial = undefined;

    this.selectedHexMeta = undefined;
    this.selectedHexPrevMeta = undefined;
    this.selectedHexPrevMaterial = undefined;
  }

  // Sets the selected obj from what was stored in the "prev" obj
  private resetSelectedStructure() {
    if (!this.selectedStructurePrevMaterial || !this.selectedStructurePrevMeta) {
      console.log("No reset data stored. Skipping selected object reset.")
      return;
    }
    if (this.selectedMesh == undefined) {
      console.log("No selected object to reset. Skipping selected object reset.")
      return;
    }
    this.selectedMesh.material = this.selectedStructurePrevMaterial;
    if (this.selectedStructurePrevMeta?.type) {
      this.setSelectedStructureType(this.selectedStructurePrevMeta.type);
    }
    this.selectedStructureMeta = this.selectedStructurePrevMeta;
    this.structureMetadataFromRef.set(this.selectedMesh, this.selectedStructurePrevMeta);

    this.selectedMesh = undefined;
    this.selectedStructurePrevMaterial = undefined;
    this.selectedStructureMeta = undefined;

    this.sceneManager.setSceneUpdated(true);
  }

  private resetSelectedHex() {
    if (!this.selectedHexPrevMaterial || !this.selectedHexPrevMeta) {
      console.log("No reset data stored. Skipping selected object reset.")
      return;
    }
    if (this.selectedMesh == undefined) {
      console.log("No selected object to reset. Skipping selected object reset.")
      return;
    }
    this.selectedMesh.material = this.selectedHexPrevMaterial;
    this.selectedHexMeta = this.selectedHexPrevMeta;
    this.hexMetadataFromRef.set(this.selectedMesh, this.selectedHexPrevMeta);

    this.selectedMesh = undefined;
    this.selectedHexPrevMaterial = undefined;
    this.selectedHexMeta = undefined;

    this.sceneManager.setSceneUpdated(true);
  }

  /* Does not check that the given xCoord and yCoord map to a valid tile placement
   * (For example, does not check that the tile is not an ocean tile) */
  private placeRobber(xCoord: number, yCoord: number) {
    if (this.robberRef) {
      let position = CatanHelperService.calculateTilePosition(xCoord, yCoord);
      this.robberRef.position.set(position.x, 0.5, position.y);
      this.robberRef.updateMatrix();
      this.sceneManager.setSceneUpdated(true);
    } else {
      console.log("Tried to move robber but no robberRef found!");
    }
  }

  toggleGameMode(newGameMode: GameMode) {
    this.gameMode = (this.gameMode === newGameMode) ? '' : newGameMode;
    if (this.gameMode === 'structure') {
      this.showStructureGhosts();
    } else {
      this.hideStructureGhosts();
    }
    if (this.selectedMesh && this.selectedStructureMeta) {
      this.resetSelectedStructure();
    }
    if (this.selectedMesh && this.selectedHexMeta) {
      this.resetSelectedHex();
    }
  }

  public resetBoard() {
    // TODO: Look for memory leaks here
    this.sceneManager.resetScene();
    this.hexMetadataFromCoords = new Map();
    this.hexMetadataFromRef = new Map();
    this.structureRefs = new Map();
    this.structureMetadataFromRef = new Map();
    this.generateBoard(this.currBoardLength, this.currBoardWidth);
    this.hideStructureGhosts();
  }

  private hideStructureGhosts() {
    if (this.selectedStructureMeta && this.selectedStructureMeta.instantiated === false) {
      if (this.selectedStructureMeta.type === StructureType.CITY) {
        this.setSelectedStructureType(StructureType.SETTLEMENT);
      }
      this.resetSelectedStructure();
    }
    this.structureMetadataFromRef.forEach((metadata, mesh) => {
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
    this.structureMetadataFromRef.forEach((metadata, mesh) => {
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
      this.hexMetadataFromRef.forEach((metadata) => {
        this.createStructureGhosts(metadata.x, metadata.y);
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
    let tokenNums = CatanHelperService.getTokenNumbersByProbability();
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
    if (!this.geomRefs.get("hex") && this.materialRefs.get(refName)) {
      console.log("Asset type: " + refName + " not loaded!");
      return;
    }
    let position = CatanHelperService.calculateTilePosition(xCoord, yCoord);
    const newTile = new THREE.Mesh(this.geomRefs.get("hex"), this.materialRefs.get(refName));
    // Don't allow change in the yCoordinate, which would be vertical.
    newTile.position.set(position.x, 0, position.y);
    if (!this.hexMetadataFromCoords.get(xCoord)) {
      this.hexMetadataFromCoords.set(xCoord, new Map());
    }
    let numberTokenRef: THREE.Group | undefined;
    if (resourceNumber) {
      numberTokenRef = this.createToken(resourceNumber, position);
      this.sceneManager.addToScene(numberTokenRef);
    }
    if (hexType === HexType.DESERT && this.robberRef) {
      this.placeRobber(xCoord, yCoord);
      this.sceneManager.addToScene(this.robberRef);
    }
    let hexMeta: HexMetadata = { 
      x: xCoord, y: yCoord, instantiated: true,
      type: hexType, resourceNumber,
      hexRef: newTile, numberTokenRef
    }
    this.hexMetadataFromCoords.get(xCoord)!.set(yCoord, hexMeta);
    this.hexMetadataFromRef.set(newTile, hexMeta);
    this.sceneManager.addToScene(newTile);
  }

  private removeTile(hexMeta: HexMetadata) {
    if (hexMeta.harborRef) {
      this.sceneManager.removeFromScene(hexMeta.harborRef);
    }
    if (hexMeta.numberTokenRef) {
      this.sceneManager.removeFromScene(hexMeta.numberTokenRef);
    }
    this.sceneManager.removeFromScene(hexMeta.hexRef);
    this.hexMetadataFromCoords.get(hexMeta.x)!.delete(hexMeta.y);
  }

  private createToken(resourceNumber: number, coordinates: XYPair): THREE.Group {
    if (!this.geomRefs.get("token_base") && this.geomRefs.get("token_text_" + resourceNumber)) {
      console.log("Asset type: `token_base` or `token_text_" + resourceNumber + "` not loaded!");
      return new THREE.Group();
    }
    const tokenBase: THREE.Mesh = new THREE.Mesh(this.geomRefs.get("token_base"), this.materialRefs.get("token_base"));
    const tokenText: THREE.Mesh = new THREE.Mesh(this.geomRefs.get("token_text_" + resourceNumber),
        (resourceNumber == 6 || resourceNumber == 8) ? this.materialRefs.get("token_text__red") : this.materialRefs.get("token_text"));
    const digitFactor = resourceNumber.toString().length;
    tokenText.position.set(
      coordinates.x - (digitFactor * ScaleConstants.TOKEN_TEXT_SCALE),
      0.5,
      coordinates.y + (0.6 * ScaleConstants.TOKEN_TEXT_SCALE));
    tokenBase.position.set(coordinates.x, 0.3, coordinates.y);
    const completeToken = new THREE.Group();
    completeToken.add(tokenBase);
    completeToken.add(tokenText);
    return completeToken;
  }

  private createHarbor(hexXCoord: number, hexYCoord: number,
                       cornerOffset: HexOffset, edgeOffset: HexOffset,
                       harborType: HarborType | undefined) {
    if (!harborType) {
      console.log("Attempted creation of harbor with no type specified");
      return;
    }
    let materialRef = "harbor_" + harborType;
    if (!this.geomRefs.get("harbor") || !this.materialRefs.get(materialRef)) {
      console.log("Geometry: `harbor` or Material: `" + materialRef + "` not loaded!");
      return;
    }
    let harborLocation = CatanHelperService.calculateEdgeLocation(hexXCoord, hexYCoord, cornerOffset, edgeOffset);
    let harborPosition = harborLocation.pos;
    let harborRef = new THREE.Mesh(this.geomRefs.get("harbor"), this.materialRefs.get(materialRef));
    harborRef.position.set(harborPosition.x, 0.3, harborPosition.y);
    harborRef.rotateY(harborPosition.rot);
    let hexMeta = this.hexMetadataFromCoords.get(hexXCoord)!.get(hexYCoord);
    hexMeta!.harborRef = harborRef;
    hexMeta!.harborPosition = { corner: cornerOffset, edge: edgeOffset };
    hexMeta!.harborType = harborType;
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
    let structureRef = this.structureRefs.get(cornerXCoord)!.get(cornerYCoord);
    let settlementPosition = CatanHelperService.calculateCornerPosition(hexXCoord, hexYCoord, cornerOffset);
    let settlementRef = new THREE.Mesh(
      this.geomRefs.get("settlement"), this.materialRefs.get("ghost"));
    settlementRef.position.set(settlementPosition.x, ScaleConstants.HEX_HEIGHT, settlementPosition.y);
    structureRef["corner_building"] = settlementRef;
    this.structureMetadataFromRef.set(settlementRef, {x: cornerXCoord, y: cornerYCoord, instantiated: false, type: StructureType.SETTLEMENT, ownerId: 0});
    structureRef.ghosts.push(settlementRef);
    this.sceneManager.addToScene(settlementRef);

    let adjacentTiles = CatanHelperService.getAdjacentTileCoords(cornerXCoord, cornerYCoord);
    if ((cornerXCoord + cornerYCoord) % 2 === 0) {
      let upperLeft = adjacentTiles.get(HexOffset.UPPER_LEFT)!;
      let upperRight = adjacentTiles.get(HexOffset.UPPER_RIGHT)!;
      if ((this.hexMetadataFromCoords.get(upperLeft.x) && this.hexMetadataFromCoords.get(upperLeft.x)!.get(upperLeft.y))
          || (this.hexMetadataFromCoords.get(upperRight.x) && this.hexMetadataFromCoords.get(upperRight.x)!.get(upperRight.y))) {
        this.createRoadGhost(structureRef, hexXCoord, hexYCoord, cornerOffset, HexOffset.TOP);
      }
    } else {
      let lowerLeft = adjacentTiles.get(HexOffset.LOWER_LEFT)!;
      let lowerRight = adjacentTiles.get(HexOffset.LOWER_RIGHT)!;
      let top = adjacentTiles.get(HexOffset.TOP)!;
      if (this.hexMetadataFromCoords.get(top.x) &&
        (this.hexMetadataFromCoords.get(top.x)!.get(top.y) || this.hexMetadataFromCoords.get(lowerLeft.x)!.get(lowerLeft.y))) {
        this.createRoadGhost(structureRef, hexXCoord, hexYCoord, cornerOffset, HexOffset.UPPER_LEFT);
      }
      if ((this.hexMetadataFromCoords.get(top.x) && this.hexMetadataFromCoords.get(top.x)!.get(top.y))
          || (this.hexMetadataFromCoords.get(lowerRight.x) && this.hexMetadataFromCoords.get(lowerRight.x)!.get(lowerRight.y))) {
        this.createRoadGhost(structureRef, hexXCoord, hexYCoord, cornerOffset, HexOffset.UPPER_RIGHT);
      }
    }
  }

  private createRoadGhost(buildingRef: any, hexXCoord: number, hexYCoord: number, cornerOffset: HexOffset, edgeOffset: HexOffset) {
    let roadLocation = CatanHelperService.calculateEdgeLocation(hexXCoord, hexYCoord, cornerOffset, edgeOffset);
    let roadPosition = roadLocation.pos;
    let roadCoords = roadLocation.coords;
    let roadRef = new THREE.Mesh(
      this.geomRefs.get("road"), this.materialRefs.get("ghost"));
    roadRef.position.set(roadPosition.x, 0.3, roadPosition.y);
    roadRef.rotateY(roadPosition.rot);
    buildingRef["road_" + edgeOffset] = roadRef;
    buildingRef.ghosts.push(roadRef);
    this.structureMetadataFromRef.set(roadRef, {x: roadCoords.x, y: roadCoords.y, instantiated: false, type: StructureType.ROAD, ownerId: 0});
    this.sceneManager.addToScene(roadRef);
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

  private initControls() {
    // helpful link for OrbitControls properties:
    // https://threejs.org/docs/#examples/controls/OrbitControls
    this.controls = new OrbitControls(this.sceneManager.getCamera(), this.render.getRenderer().domElement);
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
  }

  /* LOADERS */

  private loadAssets(): Observable<boolean> {
    if (this.assetRefsLoaded) {
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
        this.assetRefsLoaded = true;
      }
      return !errors;
    }));
  }

  private loadMaterials(): Observable<boolean> {
    const loadingComplete = new ReplaySubject<boolean>(1);

    this.materialRefs.set("harbor_3:1", new THREE.MeshLambertMaterial(
      {color: MaterialColors.getColorForHexType(HexType.DESERT)}));
    this.materialRefs.set("ghost", new THREE.MeshLambertMaterial(
      {transparent: true, opacity: 0.5, color: MaterialColors.GHOST_MATERIAL}));
    this.materialRefs.set("selected", new THREE.MeshLambertMaterial(
      {emissive: 0x00ff00, color: MaterialColors.SELECTED_MATERIAL}));

    loadingComplete.next(true);
    loadingComplete.complete();
    return loadingComplete;
  }

  private loadHexes(): Observable<boolean> {
    const loadingComplete = new ReplaySubject<boolean>(1);
    this.geomRefs.set("hex", new THREE.CylinderGeometry(
      ScaleConstants.HEX_TOP_RADIUS, ScaleConstants.HEX_BOTTOM_RADIUS, 0.5, 6
    ));
    allHexTypes.forEach((type: HexType) => {
      this.materialRefs.set("hex_" + type.toString(),
      new THREE.MeshLambertMaterial({
        color: MaterialColors.getColorForHexType(type),
        transparent: type === HexType.OCEAN,
        opacity: 0.5
      }));
    });
    loadingComplete.next(true);
    loadingComplete.complete();
    return loadingComplete;
  }

  /* Loads objects that appear on hexes, like number tokens, the robber, harbors, etc. */
  private loadHexTokens(): Observable<boolean> {

    const loadingComplete = new Subject<boolean>();
    const fontLoader = new FontLoader();
    this.geomRefs.set("token_base", new THREE.CylinderGeometry(2, 2, 0.5, 16));
    this.materialRefs.set("token_base", new THREE.MeshLambertMaterial({color: MaterialColors.TOKEN_BASE}));
    let tokenPipGeom = new THREE.CylinderGeometry(0.2, 0.2, 0.3, 5);
    fontLoader.load('./assets/fonts/gentilis_regular.typeface.json', (font: Font) => {
      // Create a token for each possible resource number
      const resourceNumbers = CatanHelperService.getTokenNumbersByProbability().map((num: number) => {

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
        this.geomRefs.set("token_text_" + num, totalGeometry);
      });
      this.materialRefs.set("token_text", new THREE.MeshLambertMaterial({ color: MaterialColors.TOKEN_TEXT }));
      this.materialRefs.set("token_text__red", new THREE.MeshLambertMaterial({ color: MaterialColors.TOKEN_TEXT__RED }));
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
    this.geomRefs.set("harbor", harborGeom);

    resourceHexTypes.forEach((type: HexType) => {
      this.materialRefs.set("harbor_" + type, new THREE.MeshLambertMaterial({color: MaterialColors.getColorForHexType(type)}));
    });
    this.materialRefs.set("harbor_3:1", new THREE.MeshLambertMaterial({color:  MaterialColors.getColorForHexType(HexType.DESERT)}));

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
    this.geomRefs.set("settlement", settlementGeom);

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
    this.geomRefs.set("city", cityGeom);


    // Road
    this.geomRefs.set("road", new THREE.BoxGeometry(0.7, 0.9, 4));

    loadingComplete.next(true);
    loadingComplete.complete();
    return loadingComplete;
  }

  // Adding these assets to the board state dramatically increases CPU/GPU usage.
  private loadIntensiveAssets(): Observable<boolean> {
    return of(false);
    // if (this.assetRefs["intensive_loaded"]) {
    //   return of(true);
    // }
    // const loadingComplete = new ReplaySubject<boolean>(1);
    // // Sheep
    // let sheepBodyGeom = new THREE.SphereGeometry(1, 8, 4);
    // let sheepHeadGeom = new THREE.LatheGeometry(
    //   [new THREE.Vector2(0, 0.2), new THREE.Vector2(0.4, 0.8)],
    //   2, 0, Math.PI);
    // sheepBodyGeom.scale(1.4, 1, 1);
    // sheepHeadGeom.rotateZ(Math.PI / 3);
    // sheepHeadGeom.translate(1.7, 0, 0);
    // let sheepBodyMaterial = new THREE.MeshLambertMaterial({ color: MaterialColors.SHEEP_BODY });
    // let sheepHeadMaterial = new THREE.MeshLambertMaterial({ color: MaterialColors.SHEEP_HEAD });
    // let sheepBody = new THREE.Mesh(sheepBodyGeom, sheepBodyMaterial);
    // let sheepHead = new THREE.Mesh(sheepHeadGeom, sheepHeadMaterial);
    // sheepBody.matrixAutoUpdate = false;
    // sheepBody.updateMatrix();
    // sheepHead.matrixAutoUpdate = false;
    // sheepHead.updateMatrix();
    // let sheepGroup = new THREE.Group();
    // sheepGroup.add(sheepBody);
    // sheepGroup.add(sheepHead);
    // sheepGroup.scale.set(0.1, 0.1, 0.1);
    // this.assetRefs["sheep"] = sheepGroup;
    // loadingComplete.next(true);
    // loadingComplete.complete();
    // this.assetRefs["intensive_loaded"] = true;
    // return loadingComplete;
  }

  // private castMouseToPlane() {
  //   if (this.mouseChanged || this.render.viewDirty) {
  //     this.raycaster.setFromCamera( this.mouse, this.camera );
  //     const intersection = this.raycaster.intersectObject(this.sceneManager.INTERSECTION_PLANE);
  //     this.mouseOnPlane = intersection.length && intersection[0] && intersection[0].point;
  //     this.mouseChanged = false;
  //   }
  // }
}
