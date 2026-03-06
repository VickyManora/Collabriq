import { Component } from '@angular/core';

@Component({
  selector: 'app-pending-banner',
  template: `
    <div class="pending-banner">
      <svg class="pending-banner__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
      </svg>
      <p>Your account is pending approval. You can explore the platform but some actions will unlock after approval.</p>
    </div>
  `,
  styles: [`
    .pending-banner {
      display: flex;
      align-items: flex-start;
      gap: 0.625rem;
      background: var(--color-accent-alpha, #fff8e6);
      border: 1px solid var(--color-accent-border, #f0d060);
      border-radius: 8px;
      padding: 0.75rem 1rem;
      margin-bottom: 1.25rem;

      &__icon {
        flex-shrink: 0;
        color: var(--color-accent-dark, #b8860b);
        margin-top: 0.125rem;
      }

      p {
        margin: 0;
        font-size: 0.875rem;
        color: var(--color-text-secondary, #7a5a00);
        line-height: 1.5;
      }
    }
  `],
})
export class PendingBanner {}
