import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports:[CommonModule],
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.css']
})
export class ModalComponent {
  @Input() isOpen = false;
  @Input() title = '';
  @Output() closeModal = new EventEmitter<void>();

  activeTab: 'friend' | 'group' = 'friend';

  close() {
    this.closeModal.emit();
  }

  setTab(tab: 'friend' | 'group') {
    this.activeTab = tab;
  }
}

