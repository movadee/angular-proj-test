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
 * - Uses optimized algorithms for better performance
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
  private readonly monthUpdateThrottle = 50;      // Reduced from 100ms to 50ms for better responsiveness

  // Scrollbar configuration
  private scrollbarButtonHeight = 17;             // Height of scrollbar buttons (up/down arrows)
  private minScrollbarThumbPx = 20;               // Minimum thumb height approximation (varies by browser)

  // Cached DOM elements for better performance
  // These are cached once during initialization to avoid repeated DOM queries
  private tableWrapper: Element | null = null;    // The scrollable table container
  private tableContainer: Element | null = null;  // The main table container for positioning
  private tableBody: Element | null = null;       // The table body containing all rows
  private rows: Element[] = [];                   // Cached array of table row elements
  private isInitialized = false;                  // Flag to ensure proper initialization

  // Month abbreviations array (index 0 is unused, months are 1-12)
  // This is readonly since it never changes and improves performance
  private readonly months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Compiled regex for better performance (compile once, reuse many times)
  private readonly dateRegex = /^(\d{4})-(\d{2})-\d{2}$/;

  // Keep a stable bound handler so add/removeEventListener can match
  private boundScrollHandler: (e: Event) => void = this.handleScroll.bind(this);

  // Empty constructor — initialization is triggered from component lifecycle
  constructor() {}

  /**
   * Initializes the service by setting up DOM element references and scroll listener
   * This must be called once the component DOM is rendered (e.g., ngAfterViewInit)
   */
  public initialize(): void {
    if (this.isInitialized) return;
    this.cacheDOMElements();
    this.setupScrollListener();
    this.isInitialized = true;
  }

  /**
   * Caches DOM elements to avoid repeated queries during scrolling
   * This is a key performance optimization that reduces DOM access overhead
   */
  private cacheDOMElements(): void {
    this.tableWrapper = document.querySelector('.table-wrapper');
    this.tableBody = document.querySelector('.data-table tbody');

    if (this.tableBody) {
      this.rows = Array.from(this.tableBody.querySelectorAll('tr'));
    }
  }

  /**
   * Sets up the scroll event listener on the table wrapper
   * Uses passive: true for better scroll performance
   */
  private setupScrollListener(): void {
    if (this.tableWrapper) {
      this.tableWrapper.addEventListener('scroll', this.boundScrollHandler, { passive: true });
    } else if (typeof window !== 'undefined') {
      // Fallback to window scroll if table wrapper isn't found
      window.addEventListener('scroll', this.boundScrollHandler, { passive: true });
    }
  }

  /**
   * Handles scroll events with optimized logic
   *
   * This method:
   * - Shows the popup immediately when scrolling starts
   * - Updates month/year immediately on first scroll
   * - Resets the hide timer on each scroll event
   * - Schedules the popup to hide after scrolling stops
   *
   * @param event - The scroll event object
   */
  private handleScroll(event: Event): void {
    const now = Date.now();
    this.lastScrollTime = now;

    // Show popup immediately and update position
    this.showPopup();

    // Update month/year immediately on first scroll or if enough time has passed
    if (now - this.lastMonthUpdateTime >= this.monthUpdateThrottle) {
      this.updateMonthYear();
      this.lastMonthUpdateTime = now;
    }

    // Schedule hide after scrolling stops
    this.scheduleHidePopup();
  }

  /**
   * Schedules the popup to hide after scrolling stops
   * Clears any existing timeout and sets a new one
   */
  private scheduleHidePopup(): void {
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }

    this.scrollTimeout = setTimeout(() => {
      if (Date.now() - this.lastScrollTime >= this.hideDelay) {
        this.hidePopup();
      }
    }, this.hideDelay);
  }

  /**
   * Shows the popup and updates its content and position immediately
   * Called whenever scrolling starts
   */
  private showPopup(): void {
    this._isVisible.set(true);

    // Update position and month/year immediately for instant response
    this.updatePosition();

    // Also update month/year directly if not already done in handleScroll
    if (Date.now() - this.lastMonthUpdateTime >= this.monthUpdateThrottle) {
      this.updateMonthYear();
      this.lastMonthUpdateTime = Date.now();
    }
  }

  /**
   * Hides the popup
   * Called after scrolling stops and the delay period expires
   */
  private hidePopup(): void {
    this._isVisible.set(false);
  }

  /**
   * Updates the month and year text with optimized row detection
   *
   * This method finds the first visible row in the table and extracts
   * the month and year from that row's date field. It uses cached DOM
   * elements and optimized algorithms for better performance.
   */
  private updateMonthYear(): void {
    if (!this.isInitialized || !this.tableWrapper || !this.tableBody) {
      this._monthYear.set('');
      return;
    }

    // Refresh rows if needed (in case table content changed dynamically)
    if (this.rows.length === 0) {
      this.rows = Array.from(this.tableBody!.querySelectorAll('tr'));
    }

    if (this.rows.length === 0) {
      this._monthYear.set('');
      return;
    }

    const firstVisibleRow = this.findFirstVisibleRow();
    if (firstVisibleRow) {
      const monthYear = this.extractMonthYearFromRow(firstVisibleRow);
      if (monthYear) {
        this._monthYear.set(monthYear);
        return;
      }
    }

    this._monthYear.set('');
  }

  /**
   * Finds the first visible row using optimized algorithm
   *
   * Since our table data is always sorted and we have a sticky header,
   * we can use binary search to find the first visible row efficiently.
   * This gives us O(log n) complexity instead of O(n).
   *
   * @returns The first visible row element or null if none found
   */
  private findFirstVisibleRow(): Element | null {
    if (!this.tableWrapper || this.rows.length === 0) return null;

    const wrapperRect = this.tableWrapper.getBoundingClientRect();

    // Use binary search since data is sorted
    // This gives us O(log n) complexity
    return this.binarySearchVisibleRow(wrapperRect);
  }

  /**
   * Uses binary search to find the first visible row
   * Since table data is sorted, we can use binary search for O(log n) performance
   */
  private binarySearchVisibleRow(wrapperRect: DOMRect): Element | null {
    // Binary search works by repeatedly dividing the search space in half
    // We start with the entire range of rows (from index 0 to rows.length - 1)
    let left = 0;                    // Left boundary of search range
    let right = this.rows.length - 1; // Right boundary of search range
    let result: Element | null = null; // Store the best visible row found so far

    // Continue searching while there are rows in our search range
    while (left <= right) {
      // Find the middle row in our current search range
      // This is the key insight of binary search: always check the middle
      const mid = Math.floor((left + right) / 2);
      const row = this.rows[mid];

      // Get the row's position relative to the scrollable wrapper
      // rowTopRelative < 0 means row is above the visible area (covered by sticky header)
      // rowTopRelative >= 0 means row is visible or below the visible area
      const rowRect = row.getBoundingClientRect();
      const rowTopRelative = rowRect.top - wrapperRect.top;

      if (rowTopRelative >= 0) {
        // This row is visible! But we're looking for the FIRST visible row
        // There might be an earlier visible row in the left half of our search range

        // Store this row as our current best result
        result = row;

        // Narrow our search to the left half (earlier rows)
        // We've found a visible row, so we can eliminate the right half
        right = mid - 1;
      } else {
        // This row is NOT visible (it's covered by the sticky header)
        // Since our data is sorted chronologically, all rows to the LEFT of this
        // are also not visible (they're earlier dates that are further up)

        // Narrow our search to the right half (later rows)
        // We need to look at rows with later dates to find a visible one
        left = mid + 1;
      }
    }

    // At this point, left > right, which means we've exhausted our search range
    // 'result' contains the first visible row we found, or null if none found

    // Why this works:
    // 1. If we found a visible row, it's the leftmost one in our final search range
    // 2. If we didn't find any visible rows, result remains null
    // 3. Binary search guarantees we've checked the optimal points to find the boundary

    return result;
  }

  /**
   * Extracts month and year from a table row
   * First tries to get date from data-date attribute, falls back to textContent
   */
  private extractMonthYearFromRow(row: Element): string | null {
    const dateCell = row.querySelector('td:nth-child(5)');
    if (!dateCell) return null;

    // First try to get date from data-date attribute
    let dateText = (dateCell as HTMLElement).getAttribute('data-date') || null;

    // If no data-date attribute, fall back to textContent
    if (!dateText) {
      dateText = (dateCell as HTMLElement).textContent?.trim() || null;
    }

    if (!dateText) return null;

    return this.extractMonthYearFromText(dateText);
  }

  /**
   * Extracts month and year from date text using optimized regex
   */
  private extractMonthYearFromText(dateText: string): string | null {
    // Use compiled regex for better performance
    const match = this.dateRegex.exec(dateText);
    if (!match) return null;

    const year = match[1];
    const monthNum = parseInt(match[2], 10); // Base 10 for better performance

    if (monthNum >= 1 && monthNum <= 12) {
      return `${this.months[monthNum]} ${year}`;
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
   * Calculates and updates the popup position with optimized calculations
   * Accounts for scrollbar buttons that may appear at top/bottom of scrollbar
   * Aligns popup to the scrollbar thumb CENTER to avoid drift across scroll
   */
  private updatePosition(): void {
    if (!this.isInitialized || !this.tableWrapper) return;

    const scrollTop = (this.tableWrapper as any).scrollTop;
    const scrollHeight = (this.tableWrapper as any).scrollHeight;
    const containerHeight = (this.tableWrapper as any).clientHeight;
    const popupHeight = 40;

    // Compute available track excluding optional buttons
    const totalButtonHeight = this.scrollbarButtonHeight * 2;
    const availableTrackHeight = Math.max(containerHeight - totalButtonHeight, 1);

    // Ratio of how far we've scrolled within content
    const scrollRatio = scrollTop / Math.max(scrollHeight - containerHeight, 1);

    // Approximate scrollbar thumb height and travel distance for its TOP edge
    const approxThumbHeight = Math.max((containerHeight / Math.max(scrollHeight, 1)) * availableTrackHeight, this.minScrollbarThumbPx);
    const thumbTravelHeight = Math.max(availableTrackHeight - approxThumbHeight, 1);

    // Position of the top of the thumb along the track, then center of thumb
    const thumbTop = this.scrollbarButtonHeight + (scrollRatio * thumbTravelHeight);
    const thumbCenter = thumbTop + (approxThumbHeight / 2);

    const wrapperRect = this.tableWrapper.getBoundingClientRect();

    // Position popup to the right of the wrapper, vertically centered to the thumb
    let left = (wrapperRect as any).right + 10;
    let top = wrapperRect.top + thumbCenter - (popupHeight / 2);

    // Boundary checks to ensure popup stays within viewport
    if (top + popupHeight > window.innerHeight) {
      top = window.innerHeight - popupHeight - 20;
    }
    if (top < 20) {
      top = 20;
    }

    this._top.set(top);
    this._left.set(left);
  }

  /**
   * Sets the height of the scrollbar buttons.
   * This can be used to adjust the height for different projects.
   * @param height - The height in pixels.
   */
  setScrollbarButtonHeight(height: number): void {
    this.scrollbarButtonHeight = Math.max(height, 0);
  }

  /**
   * Sets the minimum scrollbar thumb height approximation (in px).
   * Adjust if your browser/theme renders very small or very large thumbs.
   */
  setMinScrollbarThumbPx(px: number): void {
    this.minScrollbarThumbPx = Math.max(px, 1);
  }

  /**
   * Cleans up event listeners and timers
   */
  cleanup(): void {
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }

    if (this.tableWrapper) {
      this.tableWrapper.removeEventListener('scroll', this.boundScrollHandler as any);
    }

    if (typeof window !== 'undefined') {
      window.removeEventListener('scroll', this.boundScrollHandler as any);
    }
  }

  /**
   * Lifecycle hook called when the service is destroyed
   */
  ngOnDestroy(): void {
    this.cleanup();
  }
}


