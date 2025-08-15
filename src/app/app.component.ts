import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollPopupComponent } from './scroll-popup/scroll-popup.component';
import { ScrollPopupService } from './scroll-popup/scroll-popup.service';
import { TABLE_DATA, TableRow } from './mock-data/table-data';

/**
 * Main Application Component
 *
 * This component serves as the root component of the application and displays
 * a data table with integrated scroll popup functionality.
 *
 * Features:
 * - Displays a scrollable data table
 * - Integrates the scroll popup component
 * - Provides the scroll popup service to child components
 * - Uses mock data for demonstration purposes
 *
 * The scroll popup will appear when users scroll within the table,
 * positioned to the right of the scrollbar and following the scroll position.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ScrollPopupComponent],
  providers: [ScrollPopupService], // Provide service at component level for child access
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  /**
   * Table data to be displayed
   *
   * This property contains the mock data that will be rendered in the table.
   * In a real application, this would typically come from an API service
   * or be passed down from a parent component.
   *
   * The data structure is defined by the TableRow interface from mock-data.
   */
  tableData = TABLE_DATA;
  private scrollPopupService = inject(ScrollPopupService);

  ngOnInit(): void {
    // Set the initial date from the first row of table data
    if (this.tableData.length > 0) {
      const firstRowDate = this.tableData[0].date;
      this.scrollPopupService.setInitialDate(firstRowDate);
    }
  }
}
