import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LobbyViewComponent } from './lobby-view.component';

describe('LobbyViewComponent', () => {
  let component: LobbyViewComponent;
  let fixture: ComponentFixture<LobbyViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ LobbyViewComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LobbyViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
