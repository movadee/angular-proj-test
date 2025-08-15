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
  private readonly monthUpdateThrottle = 100;     // Minimum ms between month/year updates

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

  constructor() {
    // Delay initialization to ensure DOM elements are available
    // This prevents errors when trying to access elements before they're rendered
    setTimeout(() => this.initialize(), 100);
  }

  /**
   * Initializes the service by setting up DOM element references and scroll listener
   * This method is called once after the DOM is ready to cache all necessary elements
   */
  private initialize(): void {
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
    this.tableContainer = document.querySelector('.table-container');
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
      this.tableWrapper.addEventListener('scroll', this.handleScroll.bind(this), { passive: true });
    } else if (typeof window !== 'undefined') {
      // Fallback to window scroll if table wrapper isn't found
      window.addEventListener('scroll', this.handleScroll.bind(this), { passive: true });
    }
  }

  /**
   * Handles scroll events with optimized logic
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

    this.showPopup();
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
   *
   * This method looks for the date cell (5th column) in the given row
   * and extracts the month/year information from it.
   *
   * @param row - The table row element to extract date from
   * @returns Formatted month/year string or null if extraction fails
   */
  private extractMonthYearFromRow(row: Element): string | null {
    // Find the date cell (5th column) in the row
    const dateCell = row.querySelector('td:nth-child(5)');
    if (!dateCell) return null;

    // Extract and clean the date text
    const dateText = dateCell.textContent?.trim();
    if (!dateText) return null;

    return this.extractMonthYearFromText(dateText);
  }

  /**
   * Extracts month and year from date text using optimized regex
   *
   * This method expects YYYY-MM-DD format and returns abbreviated month names.
   * The regex is compiled once and reused for better performance.
   *
   * @param dateText - The date text in YYYY-MM-DD format
   * @returns Formatted month/year string (e.g., "Sep 2024") or null if invalid
   */
  private extractMonthYearFromText(dateText: string): string | null {
    // Use compiled regex for better performance
    const match = this.dateRegex.exec(dateText);
    if (!match) return null;

    // Extract year and month number from regex match
    const year = match[1];
    const monthNum = parseInt(match[2], 10); // Base 10 for better performance

    // Convert month number to abbreviated name and format result
    if (monthNum >= 1 && monthNum <= 12) {
      return `${this.months[monthNum]} ${year}`;
    }

    return null;
  }

  /**
   * Sets the initial date from the first row of table data
   *
   * This method is called by the component when it has access to the table data.
   * It sets the initial month/year display that the popup shows when first loaded.
   *
   * @param dateText - The date text from the first table row
   */
  setInitialDate(dateText: string): void {
    const monthYear = this.extractMonthYearFromText(dateText);
    if (monthYear) {
      this._monthYear.set(monthYear);
    }
  }

  /**
   * Calculates and updates the popup position with optimized calculations
   *
   * This method:
   * - Calculates where the scrollbar thumb is positioned
   * - Positions the popup to the right of the table, aligned with the thumb
   * - Ensures the popup stays within the viewport bounds
   * - Uses viewport coordinates since the popup has position: fixed
   * - Updates the month/year to reflect the currently visible row
   * - Uses cached DOM elements for better performance
   */
  private updatePosition(): void {
    if (!this.tableWrapper || !this.tableContainer) return;

    // Get scroll metrics for position calculations
    const scrollTop = this.tableWrapper.scrollTop;
    const scrollHeight = this.tableWrapper.scrollHeight;
    const containerHeight = this.tableWrapper.clientHeight;
    const popupHeight = 40;

    // Calculate scrollbar thumb position using scroll ratio
    // Math.max prevents division by zero and improves calculation reliability
    const scrollRatio = scrollTop / Math.max(scrollHeight - containerHeight, 1);
    const scrollbarThumbTop = scrollRatio * (containerHeight - 20);

    // Get table position and calculate popup coordinates
    const tableRect = this.tableContainer.getBoundingClientRect();

    // Position popup to the right of the scrollbar, aligned with thumb
    let left = tableRect.right + 10;
    let top = tableRect.top + scrollbarThumbTop - 10;

    // Apply boundary constraints to keep popup within viewport
    if (top + popupHeight > window.innerHeight) {
      top = window.innerHeight - popupHeight - 20;
    }
    if (top < 20) {
      top = 20;
    }

    // Update position signals
    this._top.set(top);
    this._left.set(left);

    // Throttled month/year updates to prevent excessive processing
    // This improves performance during fast scrolling
    const now = Date.now();
    if (now - this.lastMonthUpdateTime >= this.monthUpdateThrottle) {
      this.updateMonthYear();
      this.lastMonthUpdateTime = now;
    }
  }

  /**
   * Cleans up event listeners and timers
   *
   * This method is called when the service is destroyed to prevent memory leaks.
   * It removes all event listeners and clears any pending timeouts.
   */
  cleanup(): void {
    // Clear the scroll timeout
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }

    // Remove event listeners to prevent memory leaks
    if (this.tableWrapper) {
      this.tableWrapper.removeEventListener('scroll', this.handleScroll.bind(this));
    }

    if (typeof window !== 'undefined') {
      window.removeEventListener('scroll', this.handleScroll.bind(this));
    }
  }

  /**
   * Lifecycle hook called when the service is destroyed
   * Ensures proper cleanup of resources to prevent memory leaks
   */
  ngOnDestroy(): void {
    this.cleanup();
  }
}


