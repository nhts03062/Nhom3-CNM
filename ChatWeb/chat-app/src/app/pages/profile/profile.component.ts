import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { User } from '../../models/user.model';
import { ModalComponent } from './modal-change-pass/modal-change-pass.component';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { UserService } from '../../services/user.service';
import { UploadService } from '../../services/upload.service';
import { defaultAvatarUrl } from '../../contants';


@Component({
  standalone: true,
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
  imports: [ModalComponent, CommonModule,
    FormsModule, ReactiveFormsModule]
})
export class ProfileComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  user?: User;
  userId: string | null = sessionStorage.getItem('userId')
  showModal = false;
  infoChangeForm: FormGroup;
  loading: boolean = false;
  formSubmitted: boolean = false;
  selectedFile: File | null = null;
  defaultAvatarUrl = defaultAvatarUrl;
  avatarUrlUpdate: string = this.user?.avatarUrl || defaultAvatarUrl;


  constructor(private fb: FormBuilder, private userService: UserService, private uploadService: UploadService) {
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
    }
  }

  loadUserData(userId: string): void {
    this.userService.getUserById(userId).subscribe({
      next: (res: User) => {
        this.user = res;
        this.patchUserInfo();
        console.log('User data loaded:', this.user);
      },
      error: (err) => {
        console.error('Failed to load user:', err);
      }
    });
  }


  toggleModal(): void {
    this.showModal = !this.showModal;
  }


  patchUserInfo() {
    this.infoChangeForm.patchValue({
      name: this.user?.name,
      email: this.user?.email,
      phone: this.user?.phone,
      address: this.user?.address
    });
  }

  triggerFileInput() {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file) {
      this.selectedFile = file;

      const reader = new FileReader();
      reader.onload = () => {
        if (this.user) {
          this.user.avatarUrl = reader.result as string; // chỉ hiển thị ảnh preview
        }
      };
      reader.readAsDataURL(file);
    }
  }

  isSuccess = false;

  saveChanges() {
    if (this.infoChangeForm.valid) {
      this.loading = true;
      const { name, email, phone, address } = this.infoChangeForm.value;

      if (this.selectedFile) {
        this.uploadService.uploadFile(this.selectedFile).subscribe({
          next: (res) => {
            this.avatarUrlUpdate = res;
            console.log('Upload avatar thành công:', res);


            this.userService.updateUser(name, this.avatarUrlUpdate, phone, address).subscribe({
              next: (res: User) => {
                this.loading = false;
                this.isSuccess = true;
                this.formSubmitted = true;
                this.user = res;
                this.user.avatarUrl = this.avatarUrlUpdate; // Cập nhật avatar mới vào user
                console.log('Cập nhật thành công:', res);
                this.userService.setUser(res)

                // reset trạng thái form submit sau 3s
                setTimeout(() => {
                  this.formSubmitted = false;
                  this.isSuccess = false;
                }, 3000);
              },
              error: (err) => {
                console.error('Cập nhật thất bại:', err);
                this.loading = false;
                this.formSubmitted = true;
                this.isSuccess = false;
              }
            });
          },
          error: (err) => {
            console.error('Upload avatar thất bại:', err);
            this.loading = false;
            this.formSubmitted = true;
            this.isSuccess = false;
          }
        });
      } else {
        // Trường hợp không chọn ảnh thì cập nhật bình thường
        this.userService.updateUser(name, this.user?.avatarUrl || defaultAvatarUrl, phone, address).subscribe({
          next: (res: User) => {
            this.loading = false;
            this.isSuccess = true;
            this.formSubmitted = true;
            this.user = res;
            console.log('Cập nhật thành công:', res);

            setTimeout(() => {
              this.formSubmitted = false;
              this.isSuccess = false;
            }, 3000);
          },
          error: (err) => {
            console.error('Cập nhật thất bại:', err);
            this.loading = false;
            this.formSubmitted = true;
            this.isSuccess = false;
          }
        });
      }

    } else {
      this.formSubmitted = true;
      this.isSuccess = false;
      console.log('Form is invalid');

      setTimeout(() => {
        this.formSubmitted = false;
        this.isSuccess = false;
      }, 1000); // Cleanup after 1 second
    }
  }
}
