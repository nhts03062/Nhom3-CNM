import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  FormGroup,
  FormBuilder,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router } from '@angular/router';
import { UserService } from '../../../services/user.service';

@Component({
  selector: 'app-modal-change-pass',
  standalone: true,
  imports: [FormsModule, CommonModule, ReactiveFormsModule],
  templateUrl: './modal-change-pass.component.html',
  styleUrls: ['./modal-change-pass.component.css'],
})
export class ModalComponent {
  @Input() isOpen = false;
  @Output() closeModal = new EventEmitter<void>();

  changeNewPassForm: FormGroup;
  loading: boolean = false;
  formSubmitted: boolean = false;
  isOldPassword: boolean = false;
  isSuccess = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private userService: UserService
  ) {
    this.changeNewPassForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
      oldPassword: ['', [Validators.required, Validators.minLength(6)]],
    });
  }
  passwordsMatch(): boolean {
    const password = this.changeNewPassForm.get('password')?.value;
    const confirmPassword =
      this.changeNewPassForm.get('confirmPassword')?.value;
    return password === confirmPassword;
  }

  onChange() {
    if (this.changeNewPassForm.valid) {
      this.loading = true;
      const { password, oldPassword } = this.changeNewPassForm.value;

      this.userService.changePassword(oldPassword, password).subscribe({
        next: (res) => {
          console.log('Password changed successfully:', res);
          this.loading = false;
          this.formSubmitted = true;
          this.isSuccess = true;
          this.isOldPassword = true;

          // Ẩn thông báo sau 2s và đóng modal
          setTimeout(() => {
            this.formSubmitted = false;
            this.isSuccess = false;
            this.close(); // close the modal after success
          }, 2000);
        },
        error: (err) => {
          console.error('Error changing password:', err);
          this.loading = false;
          this.formSubmitted = true;
          this.isSuccess = false;
          this.isOldPassword = true;

          // Ẩn thông báo sau 2s nếu lỗi
          setTimeout(() => {
            this.formSubmitted = false;
          }, 2000);
        },
      });
    } else {
      this.formSubmitted = true;
      this.isSuccess = false;
      console.log('Form is invalid');

      // Ẩn thông báo sau 2s nếu form không hợp lệ
      setTimeout(() => {
        this.formSubmitted = false;
      }, 2000);
    }
  }

  close() {
    this.changeNewPassForm.reset(); // clear form inputs
    this.formSubmitted = false; // reset alert
    this.isSuccess = false;
    this.closeModal.emit(); // notify parent to close modal
    this.isOldPassword = false; // reset old password error
  }
}
