import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { CatanBoardComponent } from './components/catan-board/catan-board.component';

import { CatanHelperService } from './services/catan-helper/catan-helper.service';
import { SceneManagerService } from './services/scene-manager/scene-manager.service';
import { GameStateService } from "./services/game-state/game-state.service";
import { RenderService } from "./services/render/render.service";
import { CatanDiceComponent } from "./components/catan-dice/catan-dice.component";

const COMPONENTS = [
  CatanBoardComponent,
  CatanDiceComponent
];

const SERVICES = [
  CatanHelperService,
  GameStateService,
  RenderService,
  SceneManagerService
];

@NgModule({
    declarations: [
      ...COMPONENTS
    ],
    imports: [
      BrowserModule
    ],
    exports: [
      ...COMPONENTS
    ],
    providers: [
      ...SERVICES
    ]
  })
  export class CatanModule { }
