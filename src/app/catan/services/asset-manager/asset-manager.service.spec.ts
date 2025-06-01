import { TestBed } from '@angular/core/testing';

import { AssetManagerService } from './asset-manager.service';

describe('AssetManagerService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: AssetManagerService = TestBed.get(AssetManagerService);
    expect(service).toBeTruthy();
  });
});
