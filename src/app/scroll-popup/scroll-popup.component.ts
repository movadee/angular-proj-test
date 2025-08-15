import { Component, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollPopupService } from './scroll-popup.service';

@Component({
  selector: 'app-scroll-popup',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      *ngIf="scrollPopupService.isVisible()"
      class="scroll-popup"
      [style.top.px]="scrollPopupService.top()"
    >
      {{ scrollPopupService.monthYear() }}
    </div>
  `,
  styles: [`
    .scroll-popup {
      position: absolute;
      right: 20px;
      background: white;
      color: #333;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      z-index: 1000;
      pointer-events: none;
      border: 1px solid #e0e0e0;
      transition: opacity 0.2s ease-in-out;

      /* Arrow pointing to scrollbar */
      &::after {
        content: '';
        position: absolute;
        right: -6px;
        top: 50%;
        transform: translateY(-50%);
        width: 0;
        height: 0;
        border-left: 6px solid white;
        border-top: 6px solid transparent;
        border-bottom: 6px solid transparent;
      }

      /* Arrow border to make it visible */
      &::before {
        content: '';
        position: absolute;
        right: -7px;
        top: 50%;
        transform: translateY(-50%);
        width: 0;
        height: 0;
        border-left: 7px solid #e0e0e0;
        border-top: 7px solid transparent;
        border-bottom: 7px solid transparent;
      }
    }
  `]
})
export class ScrollPopupComponent implements OnDestroy {
  protected readonly scrollPopupService = inject(ScrollPopupService);

  ngOnDestroy(): void {
    this.scrollPopupService.cleanup();
  }
}
