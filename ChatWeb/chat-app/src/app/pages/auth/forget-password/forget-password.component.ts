import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { apiUrl } from '../../../contants';
// import * as bootstrap from 'bootstrap';

@Component({
  selector: 'app-forget-password',
  standalone:true,
  imports: [FormsModule,CommonModule,ReactiveFormsModule],
  templateUrl: './forget-password.component.html',
  styleUrl: './forget-password.component.css',
})
export class ForgetPasswordComponent {
  forgetPassForm: FormGroup;
  loading: boolean = false;
  formSubmitted: boolean = false;

  private http = inject(HttpClient);

  constructor(private fb: FormBuilder, private router: Router, private route: ActivatedRoute) {
    this.forgetPassForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  isSuccess = false;
    
  onReset() {
    if (this.forgetPassForm.valid) {
      this.loading = true;
        console.log("Bắt đầu gọi api")
        this.http.post<{room: string, token: string}>(`${apiUrl}/auth/forgot-password`, this.forgetPassForm.value)
          .subscribe({
            next: (res) => {
              console.log('Response from forgot-password:', res);
              this.loading = false;
              this.formSubmitted = true;
              this.isSuccess = true;
              setTimeout(() => {
                this.close();
              }, 2000);
            },     
            error: (error:HttpErrorResponse) => {
              this.formSubmitted = true;
              this.isSuccess = false;
              console.log("❌ Lỗi: " + (error.error?.message || "Có lỗi xảy ra!"));
              setTimeout(() => {
                this.formSubmitted = false;
              }, 1000);
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
    this.forgetPassForm.reset();        // clear form inputs
    this.formSubmitted = false;            // reset alert
    this.isSuccess = false;
  }
  
}
