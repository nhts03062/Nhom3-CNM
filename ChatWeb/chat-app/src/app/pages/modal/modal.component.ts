import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { UserService } from '../../services/user.service';
import { FormsModule } from '@angular/forms';
import { forkJoin, map, Observable } from 'rxjs';
import { ModalProfileComponent } from '../profile/modal-profile/modal-profile.component';
import { Userr } from '../../models/user.model';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule, ModalProfileComponent,FormsModule],
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.css']
})
export class ModalComponent implements OnInit {

  @Input() isOpen = false;
  @Input() title = '';
  @Output() closeModal = new EventEmitter<void>();
  // selectedEmail: string | null = null;
  showProfileModal: boolean = false;
  users!:Userr[];

  activeTab: 'friend' | 'group' = 'friend';
  searchTerm: string = '';

  constructor(private userService : UserService){}

  ngOnInit(): void {
    this.loadFriends();
  }

  close() {
    this.closeModal.emit();
    this.searchTerm='';
  }

  setTab(tab: 'friend' | 'group') {
    this.activeTab = tab;
  }
  toggleProfileModal() {
    this.showProfileModal = !this.showProfileModal;
  }
  

  friendsList: Userr[] = [];
  loadFriends(): void {
    
    if (!this.users) {
      return;
    }
    this.friendsList = []; // Clear before loading
    this.users.forEach(user => {
      user.friends.forEach(friendId => {
        this.userService.getUserById(friendId).subscribe({
          next: (friend: Userr) => {
            this.friendsList.push(friend);
          },
          error: err => console.error('Failed to load friend:', err)
        });
      });
    });
  }

  foundUser?: Userr;

  onSearchFriend() {
    this.userService.getUsers().subscribe({
      next: users => {
        const found = users.find(u => u.email === this.searchTerm);
        if (found) {
          this.foundUser = found;
          this.showProfileModal = true; // open modal
        } else {
          console.log('No user found.');
        }
      },
      error: err => {
        console.error('Failed to fetch users:', err);
      }
    });
  }
  
  
  
  
  get filteredFriends(): Userr[] {
    return this.friendsList.filter(friend =>
      friend.name.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }
  
  
  selectedFriends: string[] = [];

  toggleFriendSelection(friendId: string): void {
    if (this.selectedFriends.includes(friendId)) {
      this.selectedFriends = this.selectedFriends.filter(id => id !== friendId);
    } else {
      this.selectedFriends.push(friendId);
    }
  }



  createGroup() {
    throw new Error('Method not implemented.');
  }
}

