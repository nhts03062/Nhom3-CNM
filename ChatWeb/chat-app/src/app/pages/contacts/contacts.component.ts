import { Component, OnInit } from '@angular/core';
import { ModalComponent } from '../modal/modal.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalProfileComponent } from '../profile/modal-profile/modal-profile.component';
import { UserService } from '../../services/user.service';
import { Userr } from '../../models/user.model';
import { ChatRoomService } from '../../services/chatRoom.service';

@Component({
  standalone: true,
  selector: 'app-contacts',
  imports: [ModalComponent, CommonModule, FormsModule, ModalProfileComponent],
  templateUrl: './contacts.component.html',
  styleUrls: ['./contacts.component.css'],
})
export class ContactsComponent implements OnInit {
  users: Userr[] = [];
  showModal = false;
  showProfileModal = false;
  selectedTab: number = 0;
  tabTitles: string[] = ['Friends List', 'Group List', 'Requests'];
  defaultAvatarUrl = 'https://i1.rgstatic.net/ii/profile.image/1039614412341248-1624874799001_Q512/Meryem-Laval.jpg';
  defaulGrouptAvatarUrl = 'https://static.vecteezy.com/system/resources/previews/026/019/617/original/group-profile-avatar-icon-default-social-media-forum-profile-photo-vector.jpg';
  searchTerm: string = '';
  friendsList: Userr[] = [];
  user: Userr | undefined;
  userMap: { [id: string]: Userr } = {};
  idNguoiDungHienTai: string | null = sessionStorage.getItem('userId');

  constructor(private userService: UserService, private chatRoomService: ChatRoomService) {}

  ngOnInit(): void {
    this.loadUserData();
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

  selectedFriend: Userr | undefined;

  selectFriend(friend: Userr): void {
    this.selectedFriend = friend;
    if (this.selectedFriend) {
      this.toggleProfileModal();
    }
  }

  getUserById(userId: string): Userr | undefined {
    return this.userMap[userId];
  }

  loadUserData(): void {
    const userId = this.idNguoiDungHienTai;
    if (userId && !this.userMap[userId]) {
      this.userService.getUserById(userId).subscribe({
        next: (user) => {
          this.userMap[userId] = user;
          this.user = user;
          this.loadFriends(); // Call loadFriends after user is loaded
        },
        error: (err) => console.error('User load failed:', err),
      });
    }
  }
  loadFriends(): void {
    this.friendsList = []; // Clear before loading
    if (this.user && this.user.friends?.length) {
      this.user.friends.forEach((friendId) => {
        this.userService.getUserById(friendId).subscribe({
          next: (friend: Userr) => {
            this.friendsList.push(friend);
            this.userMap[friendId] = friend; // Cache friend in userMap
          },
          error: (err) => console.error(`Failed to load friend with ID ${friendId}:`, err),
        });
      });
    }
  }

  get filteredFriends(): Userr[] {
    if (!this.friendsList) {
      return [];
    }
    return this.friendsList.filter((friend) =>
      friend.name?.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  addNewFriend(friendId: string): void {
    this.userService.addFriend(friendId).subscribe({
      next: (res: Userr) => {
        this.user = res;
        this.loadFriends(); // Reload friends after adding a new one
        this.chatRoomService.getChatRooms().subscribe({
          next: (chatRooms) => {
            const existingRoom = chatRooms.find((room) => room.members.includes(friendId));
            if (existingRoom) {
              console.log('Chat Room Already Exists:', existingRoom);
            } else {
              this.chatRoomService.createChatRoom([friendId],'','').subscribe({
                next: (newRoom) => console.log('Chat Room Created:', newRoom),
                error: (err) => console.error('Failed to create chat room:', err),
              });
            }
          },
          error: (err) => console.error('Error fetching chat rooms:', err),
        });
        console.log('Added friend:', this.user);
      },
      error: (err) => console.error('Failed to add friend:', err),
    });
  }

  handleFriendRequestResponse(code: '0' | '1', receivedRequest: string): void {
    this.userService.requestResponse(code, receivedRequest).subscribe({
      next: (res) => {
        console.log(res?.msg || 'Đã xử lý lời mời kết bạn');
        if (code === '1') {
          this.addNewFriend(receivedRequest);
          this.chatRoomService.createChatRoom([receivedRequest], '', '').subscribe({
            next: (newRoom) => console.log('Chat Room Created:', newRoom),
            error: (err) => console.error('Failed to create chat room:', err),
          });
        }
        this.removeRequestFromList(receivedRequest);
      },
      error: (err) => console.error('Lỗi xử lý lời mời kết bạn:', err),
    });
  }

  removeRequestFromList(requestId: string): void {
    if (this.user) {
      this.user.friendRequestsReceived = this.user.friendRequestsReceived.filter((id) => id !== requestId);
    }
  }
}