import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollPopupComponent } from './scroll-popup/scroll-popup.component';
import { ScrollPopupService } from './scroll-popup/scroll-popup.service';
import { TABLE_DATA, TableRow } from './mock-data/table-data';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ScrollPopupComponent],
  providers: [ScrollPopupService],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  tableData = TABLE_DATA;
}
