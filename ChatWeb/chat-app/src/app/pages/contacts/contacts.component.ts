import { Component, OnInit } from '@angular/core';
import { ModalComponent } from '../modal/modal.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalProfileComponent } from '../profile/modal-profile/modal-profile.component';
import { UserService } from '../../services/user.service';
import { Userr } from '../../models/user.model';
import { firstValueFrom, Observable } from 'rxjs';
import { ChatRoomService } from '../../services/chatRoom.service';
import { SearchService } from '../../services/serachService.service';
import { Router } from '@angular/router';
import { ChatRoom } from '../../models/chatRoom.model';

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
  searchTermGroup: string = '';
  friendsList: Userr[] = [];
  groupsList: ChatRoom[]=[];
  user: Userr | undefined;
  userMap: { [id: string]: Userr } = {};
  currentUser : Userr | undefined;
  foundUser : Userr | undefined;
  friendRequests : Userr[]=[]; 
  sentRequests:Userr[]=[];

  constructor(private userService : UserService, 
    private chatRoomService: ChatRoomService,
    private searchService: SearchService,
    private router: Router
  ){}

  // Lifecycle Hook for Initialization
  ngOnInit(): void {
    this.loadFriends();
    this.loadUser();
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

  getUserById(userId: string): Observable<Userr> {
    const user$ = this.userService.getUserById(userId);
    user$.subscribe(user => {
      console.log("🚀 ~ ContactsComponent ~ getUserById ~ user:", user);
    });
    return user$;
  }
  
  getFriendRequestsList(){
    this.currentUser?.friendRequestsReceived.forEach(userId => {
      this.userService.getUserById(userId).subscribe({
        next: (user) => {
          this.friendRequests = [...this.friendRequests, user]; 
        },
        error: (err) => console.error('Failed to load friend request user:', err)
      });
    });
  }

  getSentRequestsList(){
    this.currentUser?.requestfriends.forEach(userId => {
      this.userService.getUserById(userId).subscribe({
        next: (user) => {
          this.sentRequests = [...this.sentRequests,user];
        },
        error: (err) => console.error('Failed to load friend request user:', err)
      });
    });
  }
  
  loadUser(): void {
    const userId = sessionStorage.getItem('userId'); 
    if (userId) {
      this.userService.getUserById(userId).subscribe({
        next: (user) => {
          this.currentUser = user;
          console.log("Current User:", this.currentUser);
          this.getFriendRequestsList();
          this.getSentRequestsList();
        },
        error: (err) => console.error("Failed to load user:", err)
      });
    }
  }
  

  loadFriends(): void {
    console.log("🔄 Starting to load friends...");
  
    this.userService.getFriends().subscribe({
      next: (friends: Userr[]) => {
        console.log("📥 Friends loaded:", friends);
        this.friendsList = friends; // Store the list of friends directly
      },
      error: err => {
        console.error("❌ Failed to load friends:", err);
      }
    });
  }
  loadChatRooms(): void {
    this.chatRoomService.getChatRooms().subscribe({
      next: (rooms: ChatRoom[]) => {
        console.log("📥 rooms loaded:", rooms);
        this.groupsList = rooms;
      },
      error: err => {
        console.error("❌ Failed to load rooms:", err);
      }
    });
  }
  
  get filteredFriends(): Userr[] {
    return this.friendsList.filter(friend =>
      friend.name.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }
  get filteredGroups(): ChatRoom[] {
    return this.groupsList.filter(room =>
      room.chatRoomName?.toLowerCase().includes(this.searchTermGroup.toLowerCase())
    );
  }

  // Navigate directly to the chat room
  navigateToChatRoom(chatRoomId: string): void {
    console.log("Navigating to chat room with ID:", chatRoomId);
    // For example, if you're using Angular Router:
    this.router.navigate([`/chat-room/${chatRoomId}`]);
  }
  


  unFriend(friendId: string): void {
    this.userService.unFriendRequest(friendId).subscribe({
      next: (res: Userr) => {
        this.user = res; console.log(" Unfriend:", this.user);
      },
      error: (err) => {
        console.error("Failed to add friend:", err);
      }
    });
  }
  

  async requestResponse(code: string, userId: string): Promise<any> {
    try {
      const reponse = await firstValueFrom(this.userService.requestResponse(code, userId));
      return reponse;
    } catch (err) {
      console.error("Request failed:", err);
      throw err;
    }
  }
  
  
  async acceptRequest(requestId: string): Promise<void> {
    try {
      const res = await this.requestResponse('1',requestId);
      console.log('✅ Request accepted response:', res);
      // this.addNewFriend(requestId);
      this.loadFriends();
    } catch (error) {
      console.error("Error accepting request:", error);
    }
  }

   
}