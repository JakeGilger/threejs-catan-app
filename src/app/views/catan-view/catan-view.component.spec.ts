import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CatanViewComponent } from './catan-view.component';
import { NO_ERRORS_SCHEMA } from "@angular/core";

describe('CatanViewComponent', () => {
  let component: CatanViewComponent;
  let fixture: ComponentFixture<CatanViewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CatanViewComponent ],
      schemas: [ NO_ERRORS_SCHEMA ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CatanViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
