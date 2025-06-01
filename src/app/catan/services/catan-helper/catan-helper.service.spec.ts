import { TestBed, inject } from '@angular/core/testing';

import { CatanHelperService } from './catan-helper.service';

describe('CatanHelperService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CatanHelperService]
    });
  });

  it('should be created', inject([CatanHelperService], (service: CatanHelperService) => {
    expect(service).toBeTruthy();
  }));
});
