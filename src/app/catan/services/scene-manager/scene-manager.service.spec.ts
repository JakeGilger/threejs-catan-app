import { TestBed } from '@angular/core/testing';

import { SceneManagerService } from './scene-manager.service';

describe('SceneManagerService', () => {
  beforeEach(() => TestBed.configureTestingModule({
    providers: [ SceneManagerService ]
  }));

  it('should be created', () => {
    const service: SceneManagerService = TestBed.get(SceneManagerService);
    expect(service).toBeTruthy();
  });
});
