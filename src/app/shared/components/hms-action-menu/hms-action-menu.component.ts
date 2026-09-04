import { Overlay, OverlayModule, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  Output,
  TemplateRef,
  ViewChild,
  ViewContainerRef,
} from '@angular/core';

export interface HmsActionMenuItem {
  id?: string;
  label: string;
  icon?: string;
  disabled?: boolean;
  danger?: boolean;
}

@Component({
  selector: 'app-hms-action-menu',
  standalone: true,
  imports: [CommonModule, OverlayModule],
  template: `
    <button
      type="button"
      class="hms-action-menu__trigger"
      [attr.aria-expanded]="open"
      (click)="toggle($event)"
    >
      <ng-content></ng-content>
    </button>
    <ng-template #menuTpl>
      <div class="hms-action-menu__panel" role="menu">
        <button
          type="button"
          *ngFor="let item of items"
          class="hms-action-menu__item"
          [class.is-danger]="item.danger"
          [disabled]="item.disabled"
          (click)="select(item, $event)"
        >
          <i *ngIf="item.icon" class="fa" [ngClass]="item.icon"></i>
          {{ item.label }}
        </button>
      </div>
    </ng-template>
  `,
  styles: [`
    :host { display: inline-flex; }
    .hms-action-menu__trigger {
      align-items: center;
      background: transparent;
      border: 0;
      display: inline-flex;
      justify-content: center;
      min-height: 32px;
      min-width: 32px;
    }
    .hms-action-menu__panel {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      box-shadow: 0 16px 40px rgba(15, 23, 42, 0.16);
      display: grid;
      gap: 2px;
      min-width: 180px;
      padding: 6px;
    }
    .hms-action-menu__item {
      align-items: center;
      background: transparent;
      border: 0;
      border-radius: 6px;
      display: flex;
      gap: 8px;
      justify-content: flex-start;
      padding: 8px 10px;
      text-align: left;
      width: 100%;
    }
    .hms-action-menu__item:hover { background: #f8fafc; }
    .hms-action-menu__item.is-danger { color: #b91c1c; }
  `],
})
export class HmsActionMenuComponent implements OnDestroy {
  @Input() items: HmsActionMenuItem[] = [];
  @Output() itemSelect = new EventEmitter<HmsActionMenuItem>();
  @ViewChild('menuTpl') menuTpl!: TemplateRef<unknown>;

  open = false;
  private overlayRef: OverlayRef | null = null;

  constructor(
    private overlay: Overlay,
    private viewContainer: ViewContainerRef,
    private host: ElementRef<HTMLElement>
  ) {}

  toggle(event: Event): void {
    event.stopPropagation();
    this.open ? this.close() : this.show();
  }

  select(item: HmsActionMenuItem, event: Event): void {
    event.stopPropagation();
    if (item.disabled) return;
    this.itemSelect.emit(item);
    this.close();
  }

  show(): void {
    this.close();
    this.overlayRef = this.overlay.create({
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-transparent-backdrop',
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
      positionStrategy: this.overlay
        .position()
        .flexibleConnectedTo(this.host)
        .withFlexibleDimensions(false)
        .withPush(true)
        .withPositions([
          { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top' },
          { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom' },
        ]),
    });
    this.overlayRef.attach(new TemplatePortal(this.menuTpl, this.viewContainer));
    this.overlayRef.backdropClick().subscribe(() => this.close());
    this.open = true;
  }

  close(): void {
    this.overlayRef?.dispose();
    this.overlayRef = null;
    this.open = false;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }

  ngOnDestroy(): void {
    this.close();
  }
}
