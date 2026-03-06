import { Component, Input, computed, signal } from '@angular/core';

@Component({
  selector: 'app-ig-link',
  template: `
    @if (cleanHandle()) {
      <a
        class="ig-link"
        [href]="profileUrl()"
        target="_blank"
        rel="noopener"
        (click)="$event.stopPropagation()"
      >@{{ cleanHandle() }}</a>
    }
  `,
  styles: [`
    .ig-link {
      color: var(--color-text-faint);
      text-decoration: none;
      font-size: inherit;

      &:hover {
        color: var(--color-primary);
        text-decoration: underline;
      }
    }
  `],
})
export class InstagramLink {
  private _handle = signal('');

  @Input()
  set handle(value: string | null | undefined) {
    this._handle.set(value ?? '');
  }

  cleanHandle = computed(() => {
    const h = this._handle().trim().replace(/^@/, '');
    return h || null;
  });

  profileUrl = computed(() => {
    return `https://instagram.com/${this.cleanHandle()}`;
  });
}
