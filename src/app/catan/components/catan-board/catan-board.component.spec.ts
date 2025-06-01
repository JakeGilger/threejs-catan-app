import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CatanBoardComponent } from './catan-board.component';
import { CatanHelperService } from "../../services/catan-helper/catan-helper.service";
import { SceneManagerService } from "../../services/scene-manager/scene-manager.service";
import { GameStateService } from "../../services/game-state/game-state.service";
import { RenderService } from "../../services/render/render.service";

describe('CatanBoardComponent', () => {
  let component: CatanBoardComponent;
  let fixture: ComponentFixture<CatanBoardComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CatanBoardComponent ],
      providers: [
        { provide: CatanHelperService, useValue: jasmine.createSpyObj('CatanHelperService', ['getNumPips', 'getTokenNumbers', 'shuffle']) },
        { provide: RenderService, useValue: jasmine.createSpyObj('RenderService', ['initRenderer', 'startRenderLoop', 'updateSize'])},
        { provide: SceneManagerService, useValue: jasmine.createSpyObj('SceneManagerService', ['addToScene', 'getScene', 'setSceneUpdated']) },
        { provide: GameStateService, useValue: jasmine.createSpyObj('GameStateService', ['addStructure'])}
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    TestBed.get(CatanHelperService).getTokenNumbers.and.returnValue([2, 3, 4]);
    TestBed.get(CatanHelperService).shuffle.and.returnValue([]);
    fixture = TestBed.createComponent(CatanBoardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
