import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { MapaMaritimo } from './components/mapa-maritimo/mapa-maritimo';
import { Component } from '@angular/core';

@Component({ selector: 'app-mapa-maritimo', template: '' })
class MapaMaritimoStub {}

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).overrideComponent(App, {
      remove: { imports: [MapaMaritimo] },
      add: { imports: [MapaMaritimoStub] },
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the map immediately below the Hero', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Explora el norte');
    expect(compiled.querySelector('.hero')?.nextElementSibling?.tagName)
      .toBe('APP-MAPA-MARITIMO');
  });
});
