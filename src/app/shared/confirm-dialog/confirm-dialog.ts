import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.scss',
})
export class ConfirmDialog {
  @Input() message = 'Are you sure?';
  @Input() visible = false;
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  onBackdropClick() {
    this.cancelled.emit();
  }

  onCancel() {
    this.cancelled.emit();
  }

  onConfirm() {
    this.confirmed.emit();
  }
}
