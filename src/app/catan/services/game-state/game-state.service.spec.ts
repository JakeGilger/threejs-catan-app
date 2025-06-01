import { TestBed } from '@angular/core/testing';

import { GameStateService } from './game-state.service';

describe('SceneManagerService', () => {
  beforeEach(() => TestBed.configureTestingModule({
    providers: [ GameStateService ]
  }));

  it('should be created', () => {
    const service: GameStateService = TestBed.get(GameStateService);
    expect(service).toBeTruthy();
  });
});
