import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-profile-gate-modal',
  templateUrl: './profile-gate-modal.html',
  styleUrl: './profile-gate-modal.scss',
})
export class ProfileGateModal {
  @Input() message = 'Complete your profile before continuing.';
  @Input() visible = false;
  @Output() closed = new EventEmitter<void>();
  @Output() goToProfile = new EventEmitter<void>();

  onBackdropClick() {
    this.closed.emit();
  }

  onClose() {
    this.closed.emit();
  }

  onGoToProfile() {
    this.goToProfile.emit();
  }
}
