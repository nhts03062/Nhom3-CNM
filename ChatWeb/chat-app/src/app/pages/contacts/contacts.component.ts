import { Component, OnInit } from '@angular/core';
import { ModalComponent } from '../modal/modal.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalProfileComponent } from '../profile/modal-profile/modal-profile.component';
import { UserService } from '../../services/user.service';
import { Userr } from '../../models/user.model';
import { Observable } from 'rxjs';
import { ChatRoomService } from '../../services/chatRoom.service';

@Component({
  standalone: true,
  selector: 'app-contacts',
  imports: [ModalComponent, CommonModule,FormsModule, ModalProfileComponent],
  templateUrl: './contacts.component.html',
  styleUrls: ['./contacts.component.css']
})

export class ContactsComponent implements OnInit {
  users: Userr[] = [];
  showModal = false;
  showProfileModal = false;
  selectedTab: number = 0;
  tabTitles: string[] = ['Friends List', 'Group List', 'Requests'];
  defaultAvatarUrl = 'https://i1.rgstatic.net/ii/profile.image/1039614412341248-1624874799001_Q512/Meryem-Laval.jpg';
  defaulGrouptAvatarUrl= 'https://static.vecteezy.com/system/resources/previews/026/019/617/original/group-profile-avatar-icon-default-social-media-forum-profile-photo-vector.jpg';
  searchTerm: string = '';
  friendsList: Userr[] = [];
  user: Userr | undefined;
  userMap: { [id: string]: Userr } = {};


  constructor(private userService : UserService, private chatRoomService: ChatRoomService){}
  // Lifecycle Hook for Initialization
  ngOnInit(): void {
    this.loadFriends();
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
  

  selectedFriend: Userr | undefined;;

  selectFriend(friend: any): void {
    this.selectedFriend = friend;
    if (this.selectedFriend) {
      this.toggleProfileModal(); // Show the modal
    }
  }

  getUserById(userId: string): Userr | undefined {
    return this.userMap[userId];
  }
  
  loadUser(userId: string): void {
    if (!this.userMap[userId]) {
      this.userService.getUserById(userId).subscribe({
        next: (user) => this.userMap[userId] = user,
        error: (err) => console.error('User load failed:', err)
      });
    }
  }
  

  loadFriends(): void {
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
  get filteredFriends(): Userr[] {
    return this.friendsList.filter(friend =>
      friend.name.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }


  //Call AddNewFriend and create chatRoom if request accepted
  addNewFriend(friendId: string): void {
    this.userService.addFriend(friendId).subscribe({
      next: (res: Userr) => {
        this.user = res;
  
        // Check if a chat room with this friend already exists
        this.chatRoomService.getChatRooms().subscribe({
          next: (chatRooms) => {
            const existingRoom = chatRooms.find(room => room.members.includes(friendId));
  
            if (existingRoom) {
              console.log("Chat Room Already Exists:", existingRoom);
            } else {
              this.chatRoomService.createChatRoom().subscribe({
                next: (newRoom) => {
                  console.log("Chat Room Created:", newRoom);
                },
                error: (err) => {
                  console.error("Failed to create chat room:", err);
                }
              });
            }
          },
          error: (err) => console.error("Error fetching chat rooms:", err)
        });
  
        console.log("Added friend:", this.user);
      },
      error: (err) => {
        console.error("Failed to add friend:", err);
      }
    });
  }
  
  

  requestResponse(code: string): Observable<any> {
    return this.userService.requestResponse(code);
  }
  
  acceptRequest(requestId: string): void {
    this.requestResponse('1').subscribe(() => {
      this.addNewFriend(requestId);
    });
  }

   
}