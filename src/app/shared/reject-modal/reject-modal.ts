import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-reject-modal',
  templateUrl: './reject-modal.html',
  styleUrl: './reject-modal.scss',
  imports: [FormsModule],
})
export class RejectModal {
  @Input() visible = false;
  @Input() title = 'Reject User';
  @Output() confirmed = new EventEmitter<string>();
  @Output() cancelled = new EventEmitter<void>();

  reason = signal('');

  readonly placeholders = [
    'Instagram handle missing',
    'Profile incomplete',
    'Invalid business details',
    'Suspicious account',
  ];

  onBackdropClick() {
    this.cancelled.emit();
    this.reason.set('');
  }

  onCancel() {
    this.cancelled.emit();
    this.reason.set('');
  }

  onConfirm() {
    const r = this.reason().trim();
    if (!r) return;
    this.confirmed.emit(r);
    this.reason.set('');
  }
}
