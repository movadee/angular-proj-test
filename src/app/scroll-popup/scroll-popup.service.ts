import { Injectable, signal, computed, OnDestroy } from '@angular/core';

/**
 * Interface defining the state of the scroll popup
 * Contains all the data needed to display and position the popup
 */
export interface PopupState {
  isVisible: boolean;    // Whether the popup should be displayed
  monthYear: string;     // The month and year text to show in the popup
  top: number;           // Vertical position of the popup (in pixels)
  left: number;          // Horizontal position of the popup (in pixels)
}

/**
 * Service responsible for managing the scroll popup behavior
 *
 * This service:
 * - Listens to scroll events from the table
 * - Calculates the popup position to align with the scrollbar thumb
 * - Manages popup visibility (show on scroll, hide after delay)
 * - Provides reactive state via Angular signals
 */
@Injectable()
export class ScrollPopupService implements OnDestroy {
  // Private signals for internal state management
  private readonly _isVisible = signal(false);    // Controls popup visibility
  private readonly _monthYear = signal('');       // Stores the month/year text
  private readonly _top = signal(0);              // Stores the vertical position
  private readonly _left = signal(0);             // Stores the horizontal position

  // Public read-only signals for components to consume
  readonly isVisible = this._isVisible.asReadonly();
  readonly monthYear = this._monthYear.asReadonly();
  readonly top = this._top.asReadonly();
  readonly left = this._left.asReadonly();

  // Scroll management properties
  private scrollTimeout: any;                     // Timer for hiding popup after scroll stops
  private lastScrollTime = 0;                     // Timestamp of last scroll event
  private readonly hideDelay = 1200;              // Milliseconds to wait before hiding popup
  private lastMonthUpdateTime = 0;                // Timestamp of last month/year update
  private readonly monthUpdateThrottle = 100;     // Minimum ms between month/year updates

  constructor() {
    // Delay setup to ensure DOM elements are available
    setTimeout(() => this.setupScrollListener(), 100);
  }

  /**
   * Sets up the scroll event listener on the table wrapper
   *
   * The table wrapper is the scrollable container that contains the table.
   * We listen to its scroll events rather than window scroll events
   * because the table has its own scrollbar and scrollable area.
   */
  private setupScrollListener(): void {
    // Find the table wrapper element (the scrollable container)
    const tableWrapper = document.querySelector('.table-wrapper');

    if (tableWrapper) {
      // Use passive: true for better scroll performance
      tableWrapper.addEventListener('scroll', this.handleScroll.bind(this), { passive: true });
    } else {
      // Fallback to window scroll if table wrapper isn't found
      if (typeof window !== 'undefined') {
        window.addEventListener('scroll', this.handleScroll.bind(this), { passive: true });
      }
    }
  }

  /**
   * Handles scroll events from the table
   *
   * This method:
   * - Shows the popup immediately when scrolling starts
   * - Resets the hide timer on each scroll event
   * - Schedules the popup to hide after scrolling stops
   *
   * @param event - The scroll event object
   */
  private handleScroll(event: Event): void {
    const now = Date.now();
    this.lastScrollTime = now;

    // Show popup immediately when scrolling starts
    this.showPopup();

    // Clear any existing hide timeout to prevent premature hiding
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }

    // Set a new timeout to hide the popup after scrolling stops
    // This creates a "hide after delay" effect when scrolling ends
    this.scrollTimeout = setTimeout(() => {
      if (Date.now() - this.lastScrollTime >= this.hideDelay) {
        this.hidePopup();
      }
    }, this.hideDelay);
  }

  /**
   * Shows the popup and updates its content and position
   * Called whenever scrolling starts
   */
  private showPopup(): void {
    this._isVisible.set(true);
    this.updateMonthYear();
    this.updatePosition();
  }

  /**
   * Hides the popup
   * Called after scrolling stops and the delay period expires
   */
  private hidePopup(): void {
    this._isVisible.set(false);
  }

  /**
   * Updates the month and year text displayed in the popup
   *
   * This method finds the first visible row in the table and extracts
   * the month and year from that row's date field. This gives users
   * context about what time period they're currently viewing.
   */
  private updateMonthYear(): void {
    // Find the table body to access the rows
    const tableBody = document.querySelector('.data-table tbody');
    if (!tableBody) {
      this._monthYear.set('');
      return;
    }

    // Get all table rows
    const rows = Array.from(tableBody.querySelectorAll('tr'));
    if (rows.length === 0) {
      this._monthYear.set('');
      return;
    }

    // Find the table wrapper for scroll position
    const tableWrapper = document.querySelector('.table-wrapper');
    if (!tableWrapper) {
      this._monthYear.set('');
      return;
    }

    const scrollTop = tableWrapper.scrollTop;

    // More accurate row detection using actual DOM positions
    let firstVisibleRow = null;
    let firstVisibleRowIndex = -1;

    // Check each row to see which one is actually visible at the top
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowRect = row.getBoundingClientRect();
      const tableRect = tableWrapper.getBoundingClientRect();

      // Calculate the row's position relative to the table wrapper
      const rowTopRelativeToWrapper = rowRect.top - tableRect.top;

      // If the row is visible at the top (within the first 50px of the visible area)
      if (rowTopRelativeToWrapper >= -50 && rowTopRelativeToWrapper <= 50) {
        firstVisibleRow = row;
        firstVisibleRowIndex = i;
        break;
      }
    }

    // If no row found in the first 50px, use the first row that's not too far down
    if (!firstVisibleRow) {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowRect = row.getBoundingClientRect();
        const tableRect = tableWrapper.getBoundingClientRect();
        const rowTopRelativeToWrapper = rowRect.top - tableRect.top;

        if (rowTopRelativeToWrapper >= 0) {
          firstVisibleRow = row;
          firstVisibleRowIndex = i;
          break;
        }
      }
    }

    if (firstVisibleRow && firstVisibleRowIndex >= 0) {
      // Get the date cell (5th column, index 4)
      const dateCell = firstVisibleRow.querySelector('td:nth-child(5)');
      if (dateCell) {
        const dateText = dateCell.textContent?.trim();

        if (dateText) {
          // Extract month and year from the date text
          const monthYear = this.extractMonthYearFromText(dateText);
          if (monthYear) {
            this._monthYear.set(monthYear);
            return;
          }
        }
      }
    }

    // If no date detected, clear the popup content
    this._monthYear.set('');
  }

  /**
   * Extracts month and year from date text using abbreviated month names
   * Expects YYYY-MM-DD format and returns abbreviated month names (Jan, Feb, Mar, etc.)
   */
  private extractMonthYearFromText(dateText: string): string | null {
    // Simple array of month abbreviations (index 0 is unused, months are 1-12)
    const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Extract month and year from YYYY-MM-DD format
    const match = dateText.match(/(\d{4})-(\d{2})-\d{2}/);
    if (match) {
      const year = match[1];
      const monthNum = parseInt(match[2]);

      if (monthNum >= 1 && monthNum <= 12) {
        return `${months[monthNum]} ${year}`;
      }
    }

    return null;
  }

  /**
   * Sets the initial date from the first row of table data
   * Called by the component when it has access to the table data
   */
  setInitialDate(dateText: string): void {
    const monthYear = this.extractMonthYearFromText(dateText);
    if (monthYear) {
      this._monthYear.set(monthYear);
    }
  }

  /**
   * Calculates and updates the popup position
   *
   * This method:
   * - Calculates where the scrollbar thumb is positioned
   * - Positions the popup to the right of the table, aligned with the thumb
   * - Ensures the popup stays within the viewport bounds
   * - Uses viewport coordinates since the popup has position: fixed
   * - Updates the month/year to reflect the currently visible row
   */
  private updatePosition(): void {
    const tableWrapper = document.querySelector('.table-wrapper');
    if (tableWrapper) {
      // Get scroll and container dimensions
      const scrollTop = tableWrapper.scrollTop;           // Current scroll position
      const scrollHeight = tableWrapper.scrollHeight;     // Total scrollable height
      const containerHeight = tableWrapper.clientHeight;  // Visible container height
      const popupHeight = 40;                            // Height of the popup element

      // Calculate the scrollbar thumb position
      // The scrollbar thumb represents the visible portion of the content
      // We map the scroll position to the thumb position within the scrollbar
      const scrollRatio = scrollTop / (scrollHeight - containerHeight);
      const scrollbarThumbTop = scrollRatio * (containerHeight - 20); // 20px is approximate thumb height

      // Get the table container's position relative to the viewport
      // This is needed because the popup uses position: fixed
      const tableContainer = document.querySelector('.table-container');
      if (tableContainer) {
        const tableRect = tableContainer.getBoundingClientRect();

        // Position popup to the right of the scrollbar
        // The scrollbar is on the right edge of the table, so we position
        // the popup just outside that edge
        let left = tableRect.right + 10; // 10px to the right of the table

        // Position popup aligned with the scrollbar thumb
        // We align it with the thumb position but offset it slightly upward
        // for better visual balance
        let top = tableRect.top + scrollbarThumbTop - 10; // 10px up from scrollbar thumb

        // Ensure popup doesn't go off-screen
        // This prevents the popup from being cut off at the top or bottom
        if (top + popupHeight > window.innerHeight) {
          top = window.innerHeight - popupHeight - 20;
        }
        if (top < 20) {
          top = 20;
        }

        // Update the position signals
        this._top.set(top);
        this._left.set(left);

        // Update the month/year to reflect the currently visible row
        // This ensures the popup content stays relevant as the user scrolls
        // Throttle updates to prevent excessive processing during fast scrolling
        const now = Date.now();
        if (now - this.lastMonthUpdateTime >= this.monthUpdateThrottle) {
          this.updateMonthYear();
          this.lastMonthUpdateTime = now;
        }
      }
    }
  }

  /**
   * Cleans up event listeners and timers
   * Called when the service is destroyed to prevent memory leaks
   */
  cleanup(): void {
    // Clear the hide timeout
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }

    // Remove scroll event listeners
    const tableWrapper = document.querySelector('.table-wrapper');
    if (tableWrapper) {
      tableWrapper.removeEventListener('scroll', this.handleScroll.bind(this));
    }

    // Remove window scroll listener if it was used as fallback
    if (typeof window !== 'undefined') {
      window.removeEventListener('scroll', this.handleScroll.bind(this));
    }
  }

  /**
   * Lifecycle hook called when the service is destroyed
   * Ensures proper cleanup of resources
   */
  ngOnDestroy(): void {
    this.cleanup();
  }
}

