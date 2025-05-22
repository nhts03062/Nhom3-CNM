import { ChangeDetectorRef, Component, EventEmitter, Input, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatRoomService } from '../../../services/chatRoom.service';
import { ChatRoom } from '../../../models/chatRoom.model';
import { UserService } from '../../../services/user.service';
import { Userr } from '../../../models/user.model';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';
import { Messagee } from '../../../models/message.model';
import { MessageService } from '../../../services/message.service';
import { SocketService } from '../../../socket.service';

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
  @Input() trangThaiKetBan?: string;
  @Output() closeModal: EventEmitter<void> = new EventEmitter<void>();
  chatRoom: ChatRoom | undefined;
  currentUserId: string | null  = sessionStorage.getItem('userId')
  isFriend:boolean = false;
  requestSent: boolean = false;
  receiveRequest:boolean = false;
  defaulGroupAvatarUrl= 'https://static.vecteezy.com/system/resources/previews/026/019/617/original/group-profile-avatar-icon-default-social-media-forum-profile-photo-vector.jpg';
  messagees : Messagee [] = [];

  constructor(private chatRoomService : ChatRoomService, 
    private userService: UserService,
    private router: Router,
    private socketService: SocketService
  ){}

  close() {
    this.closeModal.emit();
  }

  friendIds: string[] = [];

  ngOnInit(): void {

  }
  
  startChat(friendId: string): void {
    if (!this.user || !this.user._id) {
      console.error("⚠️ Cannot start chat: user._id is undefined");
      return;
    }
    const roomData = {
      members: [this.user?._id, friendId],
      chatRoomName: '', // để trống nếu là phòng 2 người
      image:this.defaulGroupAvatarUrl
    };
    this.chatRoomService.getChatRooms().subscribe({
      next: (chatRooms) => {
        // Check if a chat room already exists with the friend
        // const existingRoom = chatRooms.find(room => room.members.includes(friendId));
        const existingRoom ="682d7153309675e7fe137ea4";
        
        if (existingRoom) {
          console.log('Chat Room Exists:', existingRoom);
          this.navigateToChatRoom(existingRoom);
          this.isOpen = false;
        } else {
          this.chatRoomService.createChatRoom(roomData).subscribe({
            next: (newRoom) => {
              console.log('Chat Room Created:', newRoom);
              this.socketService.taoPhongChat(newRoom._id, newRoom);
              this.navigateToChatRoom(newRoom._id);
              this.isOpen = false;
            },
            error: (err) => console.error('Failed to create chat room:', err)
          });
        }
      },
      error: (err) => console.error('Error fetching chat rooms:', err)
    });
  }
  navigateToChatRoom(chatRoomId:string): void {
    console.log("Navigating to chat room:", chatRoomId);
    //navigate to chat page
    this.chatRoomService.setRoomId(chatRoomId);
    this.router.navigate(['/chat']);
  }
  thongBao: string = '';
  loi: boolean = false;

  sendRequest(userId:string){
    if(this.trangThaiKetBan === "chuaKetBan"){
        this.guiYeuCauKetBan(userId);
      }
    if(this.trangThaiKetBan === 'daGuiYeuCau'){
      this.huyYeuCauKetBan(userId);
    }
    this.close()
  }


guiYeuCauKetBan(userId: string) {
  this.userService.addFriend(userId).subscribe({
    next: (res: any) => {
      this.user = res;
      console.log("Request sent to:", this.user);
      alert("✅ Đã gửi yêu cầu kết bạn thành công!");
      if (this.currentUserId) {
        // Tìm kiếm thông tin người dùng hiện tại
        this.userService.getUserById(this.currentUserId).subscribe({
          next: (res: any) => {
            const currentUser = res;
            // socket
            this.socketService.themBan(userId, currentUser);
          },
          error: (err) => {
            console.error('Lỗi khi lấy thông tin người dùng hiện tại:', err);
          }
        });
      }
    },
    error: (err) => {
      console.error('Lỗi khi gửi yêu cầu kết bạn:', err);
      alert("❌ Gửi yêu cầu kết bạn thất bại!");
    }
  });
}

huyYeuCauKetBan(userId: string) {
  this.userService.cancelRequestFriend(userId).subscribe({
    next: (res: any) => {
      this.user = res;
      this.socketService.huyKetBan(userId);
      alert("✅ Đã hủy yêu cầu kết bạn!");
      console.log("Cancel request sent to:", this.user);
    },
    error: (err) => {
      console.error('Lỗi khi hủy yêu cầu kết bạn:', err);
      alert("❌ Hủy yêu cầu kết bạn thất bại!");
    }
  });
}

}
  
