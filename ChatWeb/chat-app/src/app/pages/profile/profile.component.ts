import { Component, OnInit } from '@angular/core';
import { Userr } from '../../models/user.model';
import { ModalComponent } from './modal-change-pass/modal-change-pass.component';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserService } from '../../services/user.service';

@Component({
  standalone: true,
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
  imports: [ModalComponent, CommonModule, FormsModule, ReactiveFormsModule]
})
export class ProfileComponent implements OnInit {
  user?: Userr;
  showModal = false;
  defaultAvatarUrl = 'https://i1.rgstatic.net/ii/profile.image/1039614412341248-1624874799001_Q512/Meryem-Laval.jpg';
  infoChangeForm: FormGroup;
  loading: boolean = false;
  formSubmitted: boolean = false;
  isSuccess: boolean = false;

  constructor(private fb: FormBuilder, private userService: UserService) {
    this.infoChangeForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      name: ['', Validators.required],
      phone: ['', Validators.required],
      address: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    const userId = sessionStorage.getItem('userId');
    if (userId) {
      this.loadUserData(userId);
    } else {
      console.error('User ID is missing in session storage');
      alert('Bạn chưa đăng nhập. Vui lòng đăng nhập lại.');
    }
  }

  loadUserData(userId: string): void {
    this.userService.getUserById(userId).subscribe({
      next: (res: Userr) => {
        this.user = res;
        this.patchUserInfo();
        console.log('User data loaded:', this.user);
      },
      error: (err) => {
        console.error('Failed to load user:', err);
        alert('Không thể tải thông tin người dùng.');
      }
    });
  }

  patchUserInfo() {
    if (this.user) {
      this.infoChangeForm.patchValue({
        name: this.user.name || '',
        email: this.user.email || '',
        phone: this.user.phone || '',
        address: this.user.address || ''
      });
    }
  }

  toggleModal(): void {
    this.showModal = !this.showModal;
  }

  saveChanges() {
    if (this.infoChangeForm.valid) {
      this.loading = true;
      const userData = this.infoChangeForm.value;
      this.userService.updateUser(userData).subscribe({
        next: (res: Userr) => {
          this.user = res;
          this.loading = false;
          this.formSubmitted = true;
          this.isSuccess = true;
          console.log('Change info successfully:', res);
          setTimeout(() => {
            this.formSubmitted = false;
            this.isSuccess = false;
          }, 3000);
        },
        error: (err) => {
          this.loading = false;
          this.formSubmitted = true;
          this.isSuccess = false;
          console.error('Failed to update user:', err);
          alert('Không thể cập nhật thông tin.');
          setTimeout(() => {
            this.formSubmitted = false;
            this.isSuccess = false;
          }, 3000);
        }
      });
    } else {
      this.formSubmitted = true;
      this.isSuccess = false;
      console.log('Form is invalid');
      setTimeout(() => {
        this.formSubmitted = false;
        this.isSuccess = false;
      }, 1000);
    }
  }
}