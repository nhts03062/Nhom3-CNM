import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { apiUrl } from '../../../contants';

@Component({
  selector: 'app-change-pass',
  standalone:true,
  imports: [FormsModule,CommonModule,ReactiveFormsModule],
  templateUrl: './change-pass.component.html',
  styleUrl: './change-pass.component.css'
})
export class ChangePassComponent {
changePassForm: FormGroup;
  loading: boolean = false;
  formSubmitted: boolean = false;
  token:string = '';
  room:string = '';
  userId:string = '';
  private http = inject(HttpClient);

  constructor(private fb: FormBuilder, private router: Router, private route: ActivatedRoute) {
    this.changePassForm = this.fb.group({
      password : ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    });
  }
  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.token = params['token'];
      console.log('Token:', this.token);

      // Gọi API verify token:
      if (this.token) {
        this.http.post(`${apiUrl}/auth/verify-token`, { token: this.token })

          .subscribe({
            next: (res:any) => {
              this.userId = res.userId;
              // token hợp lệ
              console.log("Token hợp lệ");
              // Cho phép người dùng nhập mật khẩu mới
            },
            error: () => {
              alert("❌ Xác thực thất bại hoặc token đã hết hạn!");
              // Chặn người dùng nhập mật khẩu mới, hoặc redirect
            }
          });
      } else {
        alert("Không tìm thấy token!");
      }
    });
  }


  isSuccess = false;
    
  onChange() {
    if (this.changePassForm.valid) {
      this.loading = true;
      if (!this.userId) {
        alert("Không tìm thấy userId! Hãy thử lại từ email đặt lại mật khẩu.");
        return;
      }
      const payload = {
        userId: this.userId, // từ verify-token
        newPassword: this.changePassForm.value.password
      };
      const newPass = this.changePassForm.value.password 
        this.http.post(`${apiUrl}/auth/reset-password`, payload)
          .subscribe({
            next: () => {
              
              this.loading = false;
              this.formSubmitted = true;
              this.isSuccess = true;
              setTimeout(() => {
                this.router.navigateByUrl('/auth');        
              }, 2000);
            },
            error: (error:HttpErrorResponse) => {
              console.log("❌ Lỗi : " + (error.error?.message || "Có lỗi xảy ra!"));
            }
        });

    } else {
      this.formSubmitted = true;
      this.isSuccess = false;
      console.log('Form is invalid');
  
      setTimeout(() => {
        this.formSubmitted = false;
      }, 1000);
    }
  }
  
  close() {
    this.changePassForm.reset();        // clear form inputs
    this.formSubmitted = false;            // reset alert
    this.isSuccess = false;
  }
  
}
