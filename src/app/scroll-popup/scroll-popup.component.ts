import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollPopupService } from './scroll-popup.service';

/**
 * Scroll Popup Component
 *
 * This component displays a popup that appears when the user scrolls in a table.
 * The popup is positioned to the right of the table's scrollbar and follows
 * the scrollbar thumb position as the user scrolls.
 *
 * Features:
 * - Shows/hides based on scroll activity
 * - Positions itself relative to the scrollbar
 * - Displays month/year information (configurable)
 * - Automatically hides after scrolling stops
 * - Non-intrusive (pointer-events: none)
 * - Soft fade in/out transitions
 */
@Component({
  selector: 'app-scroll-popup',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!--
      Popup container that appears when scrolling
      Uses Angular signals for reactive positioning and visibility
      Simple fade transitions for smooth appearance/disappearance
    -->
    <div
      *ngIf="scrollPopupService.isVisible()"
      class="scroll-popup"
      [style.top.px]="scrollPopupService.top()"
      [style.left.px]="scrollPopupService.left()"
    >
      <!-- Display the month and year text from the service -->
      {{ scrollPopupService.monthYear() }}
    </div>
  `,
  styles: [`
    /*
      Main popup container styling
      Uses fixed positioning to appear outside the table boundaries
      Simple fade transitions for smooth appearance/disappearance
    */
    .scroll-popup {
      position: fixed;                    /* Position relative to viewport, not parent */
      background: white;                  /* Clean white background for readability */
      color: #333;                        /* Dark text for good contrast */
      padding: 8px 12px;                  /* Comfortable internal spacing */
      border-radius: 6px;                 /* Rounded corners for modern look */
      font-size: 14px;                    /* Readable font size */
      font-weight: 500;                   /* Medium weight for emphasis */
      box-shadow: 0 2px 8px rgba(0,0,0,0.1); /* Subtle shadow for depth */
      z-index: 1000;                      /* High z-index to appear above other content */
      pointer-events: none;               /* Prevents popup from blocking interactions */
      border: 1px solid #e0e0e0;         /* Light border for definition */
      width: 60px;                       /* Fixed width for consistent sizing */
      text-align: center;                 /* Center text within fixed width */

      /* Simple, soft fade transition */
      transition: opacity 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);

      /*
        Arrow pointing to the scrollbar (left side since popup is to the right)
        Creates a visual connection between popup and scrollbar
      */
      &::after {
        content: '';
        position: absolute;
        left: -6px;                       /* Position arrow to the left of popup */
        top: 50%;                         /* Center arrow vertically */
        transform: translateY(-50%);       /* Perfect vertical centering */
        width: 0;
        height: 0;
        border-right: 6px solid white;    /* White arrow pointing left */
        border-top: 6px solid transparent;
        border-bottom: 6px solid transparent;
      }

      /*
        Arrow border outline for better visibility
        Creates a subtle outline around the white arrow
      */
      &::before {
        content: '';
        position: absolute;
        left: -7px;                       /* Slightly larger than the white arrow */
        top: 50%;                         /* Center vertically */
        transform: translateY(-50%);       /* Perfect vertical centering */
        width: 0;
        height: 0;
        border-right: 7px solid #e0e0e0; /* Light gray outline */
        border-top: 7px solid transparent;
        border-bottom: 7px solid transparent;
      }
    }
  `]
})
export class ScrollPopupComponent {
  // Inject the scroll popup service
  private readonly scrollPopupService = inject(ScrollPopupService);

  // No need for ngOnDestroy cleanup since service is singleton and component is destroyed with page
}
