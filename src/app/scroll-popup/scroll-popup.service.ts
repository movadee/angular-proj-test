import { Injectable, signal, computed, OnDestroy } from '@angular/core';

export interface PopupState {
  isVisible: boolean;
  monthYear: string;
  top: number;
}

@Injectable()
export class ScrollPopupService implements OnDestroy {
  private readonly _isVisible = signal(false);
  private readonly _monthYear = signal('');
  private readonly _top = signal(0);

  // Public signals
  readonly isVisible = this._isVisible.asReadonly();
  readonly monthYear = this._monthYear.asReadonly();
  readonly top = this._top.asReadonly();

  private scrollTimeout: any;
  private lastScrollTime = 0;
  private readonly hideDelay = 1000; // Hide popup 1 second after scrolling stops

  constructor() {
    // Delay setup to ensure DOM is ready
    setTimeout(() => this.setupScrollListener(), 100);
  }

  private setupScrollListener(): void {
    // Find the table-wrapper element
    const tableWrapper = document.querySelector('.table-wrapper');
    if (tableWrapper) {
      console.log('Scroll listener attached to table-wrapper');
      tableWrapper.addEventListener('scroll', this.handleScroll.bind(this), { passive: true });
    } else {
      console.log('Table wrapper not found, falling back to window scroll');
      if (typeof window !== 'undefined') {
        window.addEventListener('scroll', this.handleScroll.bind(this), { passive: true });
      }
    }
  }

  private handleScroll(event: Event): void {
    console.log('Scroll event detected!');
    const now = Date.now();
    this.lastScrollTime = now;

    // Show popup immediately when scrolling
    this.showPopup();

    // Clear existing timeout
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }

    // Set timeout to hide popup after scrolling stops
    this.scrollTimeout = setTimeout(() => {
      if (Date.now() - this.lastScrollTime >= this.hideDelay) {
        this.hidePopup();
      }
    }, this.hideDelay);
  }

  private showPopup(): void {
    console.log('Showing popup');
    this._isVisible.set(true);
    this.updateMonthYear();
    this.updatePosition();
  }

  private hidePopup(): void {
    console.log('Hiding popup');
    this._isVisible.set(false);
  }

  private updateMonthYear(): void {
    const currentDate = new Date();
    const month = currentDate.toLocaleDateString('en-US', { month: 'long' });
    const year = currentDate.getFullYear();
    this._monthYear.set(`${month} ${year}`);
  }

  private updatePosition(): void {
    const tableWrapper = document.querySelector('.table-wrapper');
    if (tableWrapper) {
      const scrollTop = tableWrapper.scrollTop;
      const containerHeight = tableWrapper.clientHeight;
      const popupHeight = 40; // Approximate popup height

      // Position popup near the scroll position, but keep it visible
      let top = scrollTop + (containerHeight / 2);

      // Ensure popup doesn't go off-screen
      if (top + popupHeight > containerHeight) {
        top = containerHeight - popupHeight - 20;
      }
      if (top < 20) {
        top = 20;
      }

      this._top.set(top);
    }
  }

  cleanup(): void {
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }

    const tableWrapper = document.querySelector('.table-wrapper');
    if (tableWrapper) {
      tableWrapper.removeEventListener('scroll', this.handleScroll.bind(this));
    }

    if (typeof window !== 'undefined') {
      window.removeEventListener('scroll', this.handleScroll.bind(this));
    }
  }

  ngOnDestroy(): void {
    this.cleanup();
  }
}

