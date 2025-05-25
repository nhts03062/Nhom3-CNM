import { ChangeDetectorRef, Component, EventEmitter, Input, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatRoomService } from '../../../services/chatRoom.service';
import { ChatRoom } from '../../../models/chatRoom.model';
import { UserService } from '../../../services/user.service';
import { User } from '../../../models/user.model';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';
import { Messagee } from '../../../models/message.model';
import { MessageService } from '../../../services/message.service';
import { SocketService } from '../../../socket.service';

@Component({
  selector: 'app-modal-profile',
  imports: [CommonModule],
  standalone: true,
  templateUrl: './modal-profile.component.html',
  styleUrl: './modal-profile.component.css'
})
export class ModalProfileComponent {

  @Input() isOpen: boolean = false;
  @Input() user: User | undefined;
  @Input() currentUser: User | undefined;
  // @Input() trangThaiKetBan: string = '';
  @Output() closeModal: EventEmitter<void> = new EventEmitter<void>();
  chatRoom: ChatRoom | undefined;
  currentUserId: string = sessionStorage.getItem('userId')!;
  isFriend: boolean = false;
  requestSent: boolean = false;
  receiveRequest: boolean = false;
  defaulGroupAvatarUrl = 'https://static.vecteezy.com/system/resources/previews/026/019/617/original/group-profile-avatar-icon-default-social-media-forum-profile-photo-vector.jpg';
  messagees: Messagee[] = [];
  trangThaiKetBan: string = '';

  constructor(private chatRoomService: ChatRoomService,
    private userService: UserService,
    private router: Router,
    private socketService: SocketService, private cdr: ChangeDetectorRef
  ) { }

  close() {
    this.closeModal.emit();
  }


  ngOnInit(): void {
    // this.loadUser();
    if (this.user) {
      this.kiemTraBanHayDaGuiYeuCauKetBan(this.user._id);
      console.log("🚀 ~ ModalProfileComponent ~ this.userService.getUserById ~ this.kiemTraBanHayDaGuiYeuCauKetBan(this.user._id):", this.kiemTraBanHayDaGuiYeuCauKetBan(this.user._id))
    }

    this.socketService.nhanskThemBan((data: any) => {
      if (data._id === this.user?._id) {
        this.trangThaiKetBan = 'daGuiYeuCau'; // hoặc cập nhật lại đúng logic
        this.cdr.detectChanges();
      }
    });


    this.socketService.nhanskHuyKetBan((data: any) => {
      if (data === this.user?._id) {
        this.reloadUserProfile();
      }
    });

    this.socketService.nhanskDongYKetBan((data: any) => {
      if (data._id === this.user?._id) {
        this.reloadUserProfile();
      }
    });

    this.socketService.nhanskHuyBanBe((data: any) => {
      if (data === this.user?._id) {
        this.reloadUserProfile();
      }
    });


  }
  ngOnDestroy(): void {
    this.socketService.offNhanSkThemBan();
    this.socketService.offNhanSkHuyKetBan();
    this.socketService.offNhanSkDongYKetBan();
    this.socketService.offNhanskHuyBanBe();
  }
  updateProfile() {
    this.router.navigate(['/profile']);
  }

  kiemTraBanHayDaGuiYeuCauKetBan = (userId: string): void => {
    const ban = this.currentUser?.friends?.some(friend => friend._id === userId);
    const daGuiYeuCau = this.currentUser?.requestfriends?.some(req => req._id === userId);
    const daNhanYeuCau = this.currentUser?.friendRequestsReceived?.some(req => req._id === userId);

    this.trangThaiKetBan = ban
      ? 'ban'
      : daNhanYeuCau
        ? 'daNhanYeuCau'
        : daGuiYeuCau
          ? 'daGuiYeuCau'
          : 'chuaKetBan';
  };


  startChat(friendId: string): void {
    if (!this.user || !this.user._id) {
      console.error("⚠️ Cannot start chat: user._id is undefined");
      return;
    }
    const roomData = {
      members: [this.user?._id, friendId],
      chatRoomName: '', // để trống nếu là phòng 2 người
      image: this.defaulGroupAvatarUrl
    };
    this.chatRoomService.getChatRooms().subscribe({
      next: (chatRooms) => {
        // Check if a chat room already exists with the friend
        const existingRoom = chatRooms.find(room => room.members.includes(friendId));

        if (existingRoom) {
          console.log('Chat Room Exists:', existingRoom);
          this.navigateToChatRoom(existingRoom._id);
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
  navigateToChatRoom(chatRoomId: string): void {
    console.log("Navigating to chat room:", chatRoomId);
    //navigate to chat page
    this.chatRoomService.setRoomId(chatRoomId);
    this.router.navigate(['/chat']);
  }


  thongBao: string = '';
  loi: boolean = false;

  sendRequest(userId: string) {
    if (this.trangThaiKetBan === "chuaKetBan") {
      this.guiYeuCauKetBan(userId);
    }
    if (this.trangThaiKetBan === 'daGuiYeuCau') {
      this.huyYeuCauKetBan(userId);
    }
    // this.close()
  }


  guiYeuCauKetBan(userId: string) {
    this.userService.addFriend(userId).subscribe({
      next: () => {
        // this.reloadUserProfile();
        console.log("Request sent to:", this.user);
        if (this.currentUserId) {
          // Tìm kiếm thông tin người dùng hiện tại
          this.userService.getUserById(this.currentUserId).subscribe({
            next: (res: User) => {
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
      next: () => {
        // this.reloadUserProfile();
        this.socketService.huyKetBan(userId);
        console.log("Cancel request sent to:", this.user);
      },
      error: (err) => {
        console.error('Lỗi khi hủy yêu cầu kết bạn:', err);
        alert("❌ Hủy yêu cầu kết bạn thất bại!");
      }
    });
  }


  reloadUserProfile(): void {
    if (!this.user?._id) return;

    this.userService.getUserById(this.user._id).subscribe({
      next: (resUser) => {
        this.user = resUser;

        // cập nhật luôn currentUser
        if (this.currentUserId) {
          this.userService.getUserById(this.currentUserId).subscribe({
            next: (resCurrentUser) => {
              this.currentUser = resCurrentUser;
              this.kiemTraBanHayDaGuiYeuCauKetBan(this.user!._id);
            },
            error: (err) => console.error('❌ Không thể lấy currentUser:', err)
          });
        }
      },
      error: (err) => console.error('❌ Không thể reload user:', err)
    });
  }


}

