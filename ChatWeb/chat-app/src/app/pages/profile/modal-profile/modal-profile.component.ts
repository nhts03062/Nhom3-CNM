import { Component, EventEmitter, Input, Output } from '@angular/core';
import { User } from '../../../models/user.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal-profile',
  imports: [CommonModule],
  standalone:true,
  templateUrl: './modal-profile.component.html',
  styleUrl: './modal-profile.component.css'
})
export class ModalProfileComponent {
  @Input() isOpen: boolean = false; // To control modal visibility
  @Input() user: User | undefined; // Selected user passed from parent component
  @Output() closeModal: EventEmitter<void> = new EventEmitter<void>(); // Event emitter to close modal

  // Close the modal
  close() {
    this.closeModal.emit(); // Emit event to parent to close the modal
  }
}
