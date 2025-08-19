// scroll-popup.component.spec.ts
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { MockProvider } from 'ng-mocks';
import { signal, Signal } from '@angular/core';

import { ScrollPopupComponent } from './scroll-popup.component';
import { ScrollPopupService } from './scroll-popup.service';

describe('ScrollPopupComponent', () => {
  let spectator: Spectator<ScrollPopupComponent>;

  // 👇 mock service that preserves signal shape
  const mockSvc: Partial<Record<keyof ScrollPopupService, unknown>> = {
    isVisible: signal(false) as Signal<boolean>,
    monthYear: signal('') as Signal<string>,
    top: signal(0) as Signal<number>,
    left: signal(0) as Signal<number>,
    show: jest.fn(),
    hide: jest.fn(),
    setPosition: jest.fn(),
  };

  const createComponent = createComponentFactory({
    component: ScrollPopupComponent,
    providers: [
      // use ng-mocks but keep signals callable
      MockProvider(ScrollPopupService, mockSvc),
    ],
  });

  it('should create the app', () => {
    spectator = createComponent();
    expect(spectator.component).toBeTruthy();
  });
});
