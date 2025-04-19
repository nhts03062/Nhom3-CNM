import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatRoomService } from '../../../services/chatRoom.service';
import { ChatRoom } from '../../../models/chatRoom.model';
import { UserService } from '../../../services/user.service';
import { Userr } from '../../../models/user.model';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-modal-profile',
  imports: [CommonModule],
  standalone:true,
  templateUrl: './modal-profile.component.html',
  styleUrl: './modal-profile.component.css'
})
export class ModalProfileComponent {
  @Input() isOpen: boolean = false; 
  @Input() user: Userr | undefined; 
  @Output() closeModal: EventEmitter<void> = new EventEmitter<void>();
  chatRoom: ChatRoom | undefined;


  constructor(private chatRoomService : ChatRoomService, private userService: UserService){}
  isFriend:boolean = true;
  requestSent: boolean = false;

  close() {
    this.closeModal.emit();
  }

  startChat(friendId: string): void {
    this.chatRoomService.getChatRooms().subscribe({
      next: (chatRooms) => {
        // Check if a chat room already exists with the friend
        const existingRoom = chatRooms.find(room => room.members.includes(friendId));
        
        if (existingRoom) {
          console.log('Chat Room Exists:', existingRoom);
          // Navigate to the existing chat room or handle it as needed
        } else {
          this.chatRoomService.createChatRoom().subscribe({
            next: (newRoom) => {
              console.log('Chat Room Created:', newRoom);
              // Navigate to the new chat room or handle it accordingly
            },
            error: (err) => console.error('Failed to create chat room:', err)
          });
        }
      },
      error: (err) => console.error('Error fetching chat rooms:', err)
    });
  }
  

  friendIds: string[] = [];

  ngOnInit(): void {
    const userId = sessionStorage.getItem('userId');
    if (userId) {
      this.loadFriendsAndCheck(userId);
    }
  }
  
  loadFriendsAndCheck(userId: string): void {
    this.userService.getFriends().subscribe({
      next: (friends: Userr[]) => {
        this.friendIds = friends.map(friend => friend._id);
        this.isFriend = this.checkIfFriend(userId);
      },
      error: err => {
        console.error('Failed to fetch friends:', err);
      }
    });
  }
  
  checkIfFriend(userId: string): boolean {
    return this.friendIds.includes(userId);
  }
  

  sendAddFriend(friendId: string): void {
    this.userService.addFriend(friendId).subscribe({
      next: (res: Userr) => {
        this.user = res;
        this.requestSent = true;
        console.log("Request sent to:", this.user);
      },
      error: (err) => {
        console.error("Failed to request sent:", err);
      }
    });
  }
  
  requestResponse(code: string): Observable<any> {
    return this.userService.requestResponse(code);
  }

  sendRequest(friendId:string) {
    if (this.isFriend) return;
  
    if (!this.requestSent) {
      // Send request logic here
      this.sendAddFriend(friendId);
      this.requestSent = true;
      console.log("Friend request sent");
    } else {
      // Cancel request logic here
      this.requestResponse('0');
      this.requestSent = false;
      console.log("Friend request canceled");
    }
  }
  
}
