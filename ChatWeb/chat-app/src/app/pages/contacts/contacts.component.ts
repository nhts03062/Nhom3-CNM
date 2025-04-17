import { Component, OnInit } from '@angular/core';
import { ModalComponent } from '../modal/modal.component';
import { CommonModule } from '@angular/common';
import { User } from '../../models/user.model';
import { sampleUsers } from '../../mock-data/mock-data'; // Assuming this contains an array of User objects
import { mockAccountOwner } from '../../mock-data/mock-account-owner';
import { FormsModule } from '@angular/forms';
import { ModalProfileComponent } from '../profile/modal-profile/modal-profile.component';

@Component({
  standalone: true,
  selector: 'app-contacts',
  imports: [ModalComponent, CommonModule,FormsModule, ModalProfileComponent],
  templateUrl: './contacts.component.html',
  styleUrls: ['./contacts.component.css']
})

export class ContactsComponent implements OnInit {
  users: User[] = [];
  showModal = false;
  showProfileModal = false;
  selectedTab: number = 0;
  tabTitles: string[] = ['Friends List', 'Group List', 'Requests'];

  // Lifecycle Hook for Initialization
  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    // Initialize the users from sampleUsers mock data
    this.users = sampleUsers; // Assuming sampleUsers is an array of User
  }

  toggleModal() {
    this.showModal = !this.showModal;
  }
  toggleProfileModal() {
    this.showProfileModal = !this.showProfileModal;
  }

  onSelectTab(tab: number) {
    this.selectedTab = tab;
  }
  
  countFriends(): number {
    return mockAccountOwner.friends.length;
  }

  selectedFriend: User | undefined;;

  selectFriend(friend: any): void {
    this.selectedFriend = friend;
    if (this.selectedFriend) {
      this.toggleProfileModal(); // Show the modal
    }
  }
  getUserById(userId: string): User | undefined {
    return this.users.find(user => user.id === userId);
  }

  get friends(): User[] {
    return mockAccountOwner.friends
      .map(friendId => this.getUserById(friendId))
      .filter((user): user is User => user !== undefined); // Filter out undefined values
  }
    searchTerm: string = '';
  
    get filteredFriends(): User[] {
      return this.friends.filter(friend =>
        friend.name.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }
}