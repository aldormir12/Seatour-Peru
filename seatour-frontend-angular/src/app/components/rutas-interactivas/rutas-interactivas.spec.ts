import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RutasInteractivas } from './rutas-interactivas';

describe('RutasInteractivas', () => {
  let component: RutasInteractivas;
  let fixture: ComponentFixture<RutasInteractivas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RutasInteractivas],
    }).compileComponents();

    fixture = TestBed.createComponent(RutasInteractivas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
