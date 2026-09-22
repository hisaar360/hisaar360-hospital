import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SpecialtyKey } from './specialty-keys';
import {
  filterSpecialtyLibrary,
  groupSpecialtyLibrary,
  SPECIALTY_LIBRARY_FILTER_TABS,
  SPECIALTY_LIBRARY_ITEMS,
  SpecialtyLibraryFilter,
  SpecialtyLibraryItem,
  specialtyLibraryItem,
} from './specialty-library.catalog';

@Component({
  selector: 'app-specialty-library',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './specialty-library.component.html',
  styleUrl: './specialty-library.component.scss',
})
export class SpecialtyLibraryComponent implements OnInit, OnChanges {
  /** `library` = mobile grid / full picker; `sidebar` = desktop templates list; `strip` = quick chips */
  @Input() mode: 'library' | 'sidebar' | 'strip' = 'library';
  @Input() selectedKey: SpecialtyKey | null = null;
  @Input() title = 'Specialty Library';
  /** When strip mode: show "Other Specialties" head + View All. Set false for compact quick-switch. */
  @Input() showStripHead = true;
  @Output() readonly selectSpecialty = new EventEmitter<SpecialtyKey>();
  @Output() readonly closeLibrary = new EventEmitter<void>();
  @Output() readonly viewAll = new EventEmitter<void>();

  filter: SpecialtyLibraryFilter = 'all';
  search = '';
  readonly filterTabs = SPECIALTY_LIBRARY_FILTER_TABS;

  visibleItems: SpecialtyLibraryItem[] = SPECIALTY_LIBRARY_ITEMS;
  groupedItems: Array<{ category: string; label: string; items: SpecialtyLibraryItem[] }> = [];
  stripItems: SpecialtyLibraryItem[] = SPECIALTY_LIBRARY_ITEMS.slice(0, 12);

  ngOnChanges(_changes: SimpleChanges): void {
    this.refresh();
  }

  ngOnInit(): void {
    this.refresh();
  }

  onSearchChange(): void {
    this.refresh();
  }

  setFilter(filter: SpecialtyLibraryFilter): void {
    this.filter = filter;
    this.refresh();
  }

  pick(item: SpecialtyLibraryItem): void {
    this.selectSpecialty.emit(item.key);
  }

  isSelected(item: SpecialtyLibraryItem): boolean {
    return this.selectedKey === item.key;
  }

  selectedItem(): SpecialtyLibraryItem | null {
    return specialtyLibraryItem(this.selectedKey);
  }

  trackByKey(_index: number, item: SpecialtyLibraryItem): string {
    return item.key;
  }

  private refresh(): void {
    this.visibleItems = filterSpecialtyLibrary(SPECIALTY_LIBRARY_ITEMS, {
      filter: this.filter,
      search: this.search,
    });
    this.groupedItems = groupSpecialtyLibrary(this.visibleItems);
    const selected = this.selectedKey
      ? SPECIALTY_LIBRARY_ITEMS.find((item) => item.key === this.selectedKey)
      : null;
    const rest = SPECIALTY_LIBRARY_ITEMS.filter((item) => item.key !== this.selectedKey).slice(0, 11);
    this.stripItems = selected ? [selected, ...rest] : SPECIALTY_LIBRARY_ITEMS.slice(0, 12);
  }
}
