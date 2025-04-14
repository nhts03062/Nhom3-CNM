import { Component, OnInit } from '@angular/core';
import { mockAccountOwner } from '../../mock-data/mock-account-owner';
import { User } from '../../models/user.model';
import { ModalComponent } from './modal/modal.component';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';


@Component({
  standalone:true,
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
  imports:[ModalComponent,CommonModule,
    FormsModule,ReactiveFormsModule]
})
export class ProfileComponent implements OnInit {
  user!: User;
  showModal = false;

  ngOnInit(): void {
    this.loadUserData();
    this.patchUserInfo();
  }

  loadUserData(): void {
    this.user = {
      ...mockAccountOwner,
      online: false,
      lastSeen: new Date()
    };
    console.log('User data loaded:', this.user);
  }

  toggleModal(): void {
    this.showModal = !this.showModal;
  }


  infoChangeForm: FormGroup;
  loading: boolean = false;
  formSubmitted: boolean = false;

  patchUserInfo() {
    this.infoChangeForm.patchValue({
      name: this.user.name,
      email: this.user.email,
      phone: this.user.phone,
      address: this.user.address
    });
  }

  constructor(private fb: FormBuilder) {
    this.infoChangeForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      name: ['', Validators.required],
      phone: ['', Validators.required],
      address: ['', Validators.required]
    });
  }

  isSuccess = false;
    
  saveChanges() {
    if (this.infoChangeForm.valid) {
      this.loading = true;
      setTimeout(() => {
        this.loading = false;
        this.formSubmitted = true;
        this.isSuccess = true;
        console.log('Change info successfully');
        // Optionally, reset formSubmitted and isSuccess after displaying the success message for a while
        setTimeout(() => {
          this.formSubmitted = false;
          this.isSuccess = false;
        }, 3000); // for example, show success for 3 seconds
      }, 2000);
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
