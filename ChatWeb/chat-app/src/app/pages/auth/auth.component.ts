import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, NavigationEnd, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ToastrModule, ToastrService } from 'ngx-toastr';
import { filter } from 'rxjs';
import { apiUrl } from '../../contants';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [FormsModule, CommonModule, ReactiveFormsModule, HttpClientModule, RouterModule],
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.css'],
})
export class AuthComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  apiUrl = apiUrl;
  isForgotPasswordRoute: boolean = false;
  isChangePasswordRoute: boolean = false;
  isSuccess = false;
  formSubmitted: boolean = false;
  thongBao:string ='';


  registerForm = this.fb.group({
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  constructor(){
    this.router.events
    .pipe(filter(e => e instanceof NavigationEnd))
    .subscribe((event: NavigationEnd) => {
      const url = event.url;
      this.isForgotPasswordRoute = url.includes('/auth/forgot-password');
      this.isChangePasswordRoute = url.includes('/auth/change-password');
    });
  }

  ngOnInit() {
    // Kiểm tra xác thực email từ URL
    this.route.queryParams.subscribe(params => {
      if (params['verified']) {
        this.formSubmitted = true;
        this.isSuccess = true;
        this.thongBao = '✅ Xác thực email thành công! Hãy đăng nhập.'
        setTimeout(() => {
          this.resetForm();
        }, 2000);
      }
    });
  }

  /**
   * Xử lý đăng nhập
   */
  onLogin() {
    if (this.loginForm.valid) {
      this.http.post(`${apiUrl}/auth/login`, this.loginForm.value)
        .subscribe({
          next: (res: any) => {
            if (res.token) {
              this.formSubmitted = true;
              this.isSuccess = true;
              sessionStorage.setItem("token", res.token);
              sessionStorage.setItem('userId',res.userDaLoc._id);
              setTimeout(() => {
                this.resetForm();
              }, 2000);
              
              this.router.navigateByUrl("/chat");
              console.log(res.UserDaLoc._id);
            } 
          },
          error: (error) => {
            this.formSubmitted = true;
            this.isSuccess = false;
            this.thongBao = '❌ Đăng nhập thất bại: Sai mật khẩu';
            setTimeout(() => {
              this.formSubmitted = false;
            }, 1000);
          }
        });
    } else {
      this.thongBao = '❌ Form đăng nhập không hợp lệ';
      this.formSubmitted = true;
      this.isSuccess = false;
      setTimeout(() => {
        this.formSubmitted = false;
      }, 1000);
    }
  }

  /**
   * Xử lý đăng ký
   */
  onRegister() {
    if (this.registerForm.valid) {
      this.http.post(`${apiUrl}/auth/register`, this.registerForm.value)
        .subscribe({
          next: () => {
            this.formSubmitted = true;
            this.isSuccess = true;
            this.thongBao = '✅ Đăng ký thành công! Kiểm tra email để xác nhận tài khoản.';
            setTimeout(() => {
                this.resetForm();
            }, 2000);
          },
          error: (error) => {
            this.formSubmitted = true;
            this.isSuccess = false; 
            this.thongBao = `❌ Đăng ký thất bại: ${error.error?.message }`;
            setTimeout(() => {
              this.formSubmitted = false;
            }, 1000);
          }
        });
    } else {
      this.thongBao = '❌ Form đăng ký không hợp lệ';
      this.formSubmitted = true;
      this.isSuccess = false;
      setTimeout(() => {
        this.formSubmitted = false;
      }, 1000);
    }
  }
  onNavigateForgotPassWord(){
    this.router.navigateByUrl('/auth/forgot-password')
  }
  
  resetForm() {
    this.loginForm.reset();        // clear form inputs
    this.registerForm.reset();
    this.formSubmitted = false;            // reset alert
    this.isSuccess = false;
  }
  

}
