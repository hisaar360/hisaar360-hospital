import { DOCUMENT } from '@angular/common';
import { Component, effect, inject } from '@angular/core';
import { LoadingService } from '../../../core/services/loading.service';

@Component({
  selector: 'app-pyramid-loader',
  standalone: true,
  templateUrl: './pyramid-loader.component.html',
  styleUrl: './pyramid-loader.component.scss',
  host: {
    '[class.is-active]': 'isLoading()',
    '[attr.aria-hidden]': 'isLoading() ? null : "true"',
  },
})
export class PyramidLoaderComponent {
  readonly loadingService = inject(LoadingService);
  private readonly document = inject(DOCUMENT);

  readonly logoUrl = 'assets/hisar1.png';

  isLoading(): boolean {
    return this.loadingService.loading();
  }

  constructor() {
    effect(() => {
      const active = this.isLoading();
      const body = this.document?.body;
      if (!body) {
        return;
      }
      body.classList.toggle('hms-loader-lock', active);
    });
  }
}
