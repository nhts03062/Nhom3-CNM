import { Component, OnInit, ElementRef, ViewChild, HostListener, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { formatDistanceToNow } from 'date-fns';
import { ModalComponent } from '../modal/modal.component';
import { PickerComponent } from '@ctrl/ngx-emoji-mart';
import { HttpClient, HttpHeaders, HttpClientModule } from '@angular/common/http';

import { ChatRoom } from '../../models/chatRoom.model';
import { UploadService } from '../../services/upload.service';
import { Messagee } from '../../models/message.model';
import { SocketService } from '../../socket.service';
import { UserService } from '../../services/user.service';
import { ChatRoomService } from '../../services/chatRoom.service';
import { Userr } from '../../models/user.model';
import { ActivatedRoute } from '@angular/router';
import { MessageService } from '../../services/message.service';
import { defaultAvatarUrl, apiUrl, defaulGrouptAvatarUrl } from '../../contants';
import { ModalProfileComponent } from '../profile/modal-profile/modal-profile.component';
import { MembersModalComponent } from "./members-modal/members-modal.component";
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';


@Component({
  selector: 'app-chatting',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent, PickerComponent, HttpClientModule, ModalProfileComponent, MembersModalComponent],
  templateUrl: './chatting.component.html',
  styleUrl: './chatting.component.css',
})
export class ChattingComponent implements OnInit {
 

  @ViewChild('imageInput') imageInput!: ElementRef<HTMLInputElement>;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('sidebarRef') sidebarRef!: ElementRef;
  addedMembers: string[] = [];
  idNguoiDungHienTai: string = sessionStorage.getItem('userId')!;
  chatRooms: ChatRoom[] = [];
  messagees: Messagee[] = [];
  messageText: string = '';
  chatRoomIdDuocChon: string | null = null;
  imageFiles: {
    file: File;
    name: string;
    preview: string;
  }[] = [];
  docFiles: {
    file: File;
    name: string;
    // preview: string;
     preview: SafeResourceUrl
  }[] = [];
  nguoiDung: Userr[] = [];
  showEmojiPicker: boolean = false;
  showModal = false;
  searchTerm: string = '';
  messageSearchTerm: string = ''; // Thêm cho tìm kiếm tin nhắn
  selectedRoom?: ChatRoom | undefined;
  otherUsersChat: Userr[] = [];
  isSidebarOpen: boolean = false;
  searchTermMember: string = '';
  tbLoiAdmin: string = '';

  private baseApiUrl = apiUrl;
  defaulGrouptAvatarUrl = defaulGrouptAvatarUrl;
  defaultAvatarUrl = defaultAvatarUrl;
  membersList: Userr[] = [];
  showProfileModal = false;

  usersList: Userr[] = [];
  showMembers: boolean = false;

  selectedHighlightMessageId: string | null = null;
  onClickSearchedMessage(msg: Messagee) {
  this.selectedHighlightMessageId = msg._id;
  this.searchTerm = ''; // ẩn dropdown tìm kiếm

  // Cuộn đến message, delay 1 chút để DOM cập nhật
  setTimeout(() => {
    this.scrollToMessage();
  }, 100);
}

  constructor(
    private http: HttpClient,
    private socketService: SocketService,
    private userService: UserService,
    private chatRoomService: ChatRoomService,
    private route: ActivatedRoute,
    private messageService: MessageService,
     private uploadService: UploadService,
     private sanitizer: DomSanitizer
  ) { };

  ngOnInit(): void {
    this.getChatRooms();

    this.chatRooms.forEach(room => {
  room.unreadCount = Math.floor(Math.random() * 5); // từ 0 đến 4 tin chưa đọc
});

this.socketService.onUserOnline((userId: string) => {
    console.log(`User ${userId} is online`);
    this.updateUserOnlineStatus(userId, true);
  });

  // Xử lý sự kiện người dùng offline
  this.socketService.onUserOffline((userId: string) => {
    console.log(`User ${userId} is offline`);
    this.updateUserOnlineStatus(userId, false);
  });


    //Xử lý khi có tin nhắn mới socket
    this.socketService.onNewMessage(msg => {
      console.log('New message received:', msg);

      const messageData = msg.data || msg;
      //Trường hợp tin nhắn đến từ phòng chat đã chọn
      if (messageData.chatId === this.chatRoomIdDuocChon ||
        (messageData.chatId && messageData.chatId._id === this.chatRoomIdDuocChon)) {
        this.messagees.push(messageData);

        setTimeout(() => {
          const chatContainer = document.querySelector('.messages-chat');
          if (chatContainer) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
          }
        }, 100);
        if(this.selectedRoom) {
          this.selectedRoom.latestMessage = messageData;
           //xử lý đem phòng chat có tin nhắn mới lên đầu
           const index = this.chatRooms.findIndex(r => r._id === this.chatRoomIdDuocChon);
           if(index !== -1){
             const [chatRoomCoTinNhanMoi] = this.chatRooms.splice(index, 1);
             this.chatRooms.unshift(chatRoomCoTinNhanMoi);
           }}
      } else { //Trường hợp tin nhắn mới ko đến từ phòng đã chọn
        this.chatRooms.forEach(room => {
          if (room._id === messageData.chatId._id) {
            room.latestMessage = messageData;
             //xử lý đem phòng chat có tin nhắn mới lên đầu
             const index = this.chatRooms.findIndex(r => r._id === room._id);
             if(index !== -1){
               const [chatRoomCoTinNhanMoi] = this.chatRooms.splice(index, 1);
               this.chatRooms.unshift(chatRoomCoTinNhanMoi);
             }}
        })
      }
    });

    //Xử lý xóa tin nhắn socket
    this.socketService.nhanskXoaTinNhan(recal => {
      if(recal.chatId._id.toString() == this.chatRoomIdDuocChon?.toString()) {
        this.messagees = this.messagees.map(msg => msg._id === recal._id ? recal : msg);
      }
      this.chatRooms.forEach(room =>{
        if(room.latestMessage?._id.toString() === recal._id.toString()) {
          room.latestMessage = recal;
        }
      })
    });

    //Xử lý khi có phòng chat mới socket
    this.socketService.nhanskTaoPhongChat((chatRoom: any) =>{
      const kiemTraCoTrongPhong = chatRoom.members.some((mem:any) => {
        // Kiểm tra nếu là đối tượng, so sánh với _id
        if (typeof mem === 'object' && mem._id) {
          return mem._id.toString() === this.idNguoiDungHienTai;
        }
        // Kiểm tra nếu là ID dạng string
        if (typeof mem === 'string') {
          return mem === this.idNguoiDungHienTai;
        }
        return false;
      });
      if(kiemTraCoTrongPhong) {
      chatRoom.otherMembers = this.layNguoiDungKhac(chatRoom);
      if(!this.chatRooms.some(room => room._id === chatRoom._id)){
        this.chatRooms.unshift(chatRoom);
        this.socketService.thamGiaPhongChat(chatRoom._id);
      }
      }
    })

    //Xử lý khi nhận sự kiện xóa phòng chat
    this.socketService.nhanskXoaPhongChat((roomId: string) => {
      this.chatRooms = this.chatRooms.filter(room => room._id !== roomId);
      if(this.chatRoomIdDuocChon === roomId){
        this.chatRoomIdDuocChon = null;
        this.selectedRoom = undefined;
        this.messagees = [];
      }
    })

    //Xử lý khi nhận sự kiện cập nhật phòng chat
    this.socketService.nhanskCapNhatPhongChat((room: any) => {
      const index = this.chatRooms.findIndex(r => r._id === room._id);
      if (index !== -1) {
        this.chatRooms[index] = room;
        if (!this.chatRooms[index].members.some(member => member?._id.toString() === this.idNguoiDungHienTai)) {
          this.chatRooms.splice(index, 1);
           if (this.chatRoomIdDuocChon === room._id) {
            this.chatRoomIdDuocChon = null;
            this.selectedRoom = undefined;
            this.messagees = [];
        }
        }
        if (this.chatRoomIdDuocChon === room._id) {
          this.selectedRoom = room;
          this.membersList = this.filteredMembers(room);
        }
      }
    });

    //Xử lý khi nhận sự kiện rời phòng chat
    this.socketService.nhanskRoiPhongChat((chatRoomId: string, userId: string) => {
      const index = this.chatRooms.findIndex(r => r._id === chatRoomId);

      if (index !== -1) {
          const room = this.chatRooms[index];
          room.members = room.members.filter((mem: any) => {
            return this.getId(mem) !== userId;
          })
           if(this.chatRoomIdDuocChon === chatRoomId) {
             this.selectedRoom = room;
           }
          this.membersList = this.filteredMembers(room);

      }
    });

    if (this.idNguoiDungHienTai) {
      this.socketService.joinRoom(this.idNguoiDungHienTai);
    }
  }
  ngOnDestroy():void{
    this.socketService.offNhanskTaoPhongChat();
    this.socketService.offNhanskCapNhatPhongChat();
    this.socketService.offNhanskRoiPhongChat();
    this.socketService.offNhanskXoaPhongChat();
    this.socketService.offNhanskMoiVaoPhongChat();

    this.socketService.offNhanskXoaTinNhan();
    this.socketService.offOnNewMessage();
    this.socketService.offUserOnline();
  this.socketService.offUserOffline();
  }

  toggleModal(): void {
    this.showModal = !this.showModal;
  }
  toggleSidebar(event: MouseEvent) {
    event.stopPropagation();
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    const clickedInside = this.sidebarRef?.nativeElement.contains(event.target);
    if (!clickedInside && this.isSidebarOpen) {
      this.isSidebarOpen = false;
    }
  }
  selectedMember: Userr | undefined;

  filteredMembers(room: ChatRoom): Userr[] {
    const roomUsers = (room.members as any[]).filter((member: any) => {
      const memberId = typeof member === 'string' ? member : member._id;
      return memberId;
    }).filter((member: any) => typeof member !== 'string');

    return roomUsers;
  }

  loadChattedUsers(): void {
    this.chatRoomService.getChatRooms().subscribe({
      next: (rooms: ChatRoom[]) => {
        console.log("📥 rooms loaded:", rooms);
        this.chatRooms = rooms;
  
      },
      error: err => {
        console.error("❌ Failed to load rooms:", err);
      }
    });
  }
  

  getHeaders(): HttpHeaders {
    const token = sessionStorage.getItem('token');
    return new HttpHeaders({ 'Authorization': `${token}` });
  }

  layNguoiDungKhac(room: ChatRoom): Userr[] {
    const otherUsers = (room.members as any[]).filter((member: any) => {
      const memberId = typeof member === 'string' ? member : member._id;
      return memberId !== this.idNguoiDungHienTai;
    }).filter((member: any) => typeof member !== 'string');

    return otherUsers;
  }

  getMessageById(id: string): Messagee | undefined {
    return this.messagees.find(m => m._id === id);
  }

  getChatRooms(): void {
    this.chatRoomService.getChatRooms().subscribe({
      next: (res: any) => {
        const updatedChatRooms = res.map((room: ChatRoom) => {
          return {
            ...room,
            otherMembers: this.layNguoiDungKhac(room),
            timeAgo: this.getTimeAgo(room.latestMessage?.createdAt || (''))

          }
        })
        this.chatRooms = updatedChatRooms;

        console.log('các phòng chat: ', this.chatRooms)
      }, error: err => {
        console.log(err)
      }
    })
  }
  kiemTraBanHayDaGuiYeuCauKetBan = (user: Userr): string => {
    const ban = user?.friends?.includes(this.idNguoiDungHienTai);
    const daGuiYeuCau = user?.friendRequestsReceived?.includes(this.idNguoiDungHienTai);
    const daNhanYeuCau = user?.requestfriends?.includes(this.idNguoiDungHienTai);
    const status = ban ? 'ban' : daNhanYeuCau ? 'daNhanYeuCau' : daGuiYeuCau ? 'daGuiYeuCau' : 'chuaKetBan';
    return status;
  };
  
  
layPhongChat(roomId: string, callback?: () => void): void {
    this.chatRoomService.getChatRoomById(roomId).subscribe({
      next: (res) => {
        this.selectedRoom = res;
        this.membersList = this.filteredMembers(res);
        console.log("✅ selectedRoom:", this.selectedRoom);
        this.nguoiDung = this.layNguoiDungKhac(res);
        if (this.nguoiDung) {
          this.roomName = this.nguoiDung[0].name;
          console.log("🚀 ~ ChattingComponent ~ getRoom ~ this.roomName:", this.roomName)
        }
        if (callback) callback();
      },
      error: (err) => {
        console.log("❌ Lỗi:", err);
      }
    });
  }
  roomName: string = "Unknow";
  getRoom(roomId: string): void {
    // this.chatRoomIdDuocChon = roomId
    if (!roomId) {
      console.error('⛔️ roomId không tồn tại khi gọi getRoom');
      return;
    }
    
    this.selectedRoom = this.chatRooms.find(room => room._id.toString() === roomId)

    console.log("🚀 ~ ChattingComponent ~ getRoom ~ this.selectedRoom:", this.selectedRoom)
    if (roomId) {
      this.chatRoomDuocChon(roomId);
      console.log('Phòng chat đã chọn:', roomId);
      this.chatRoomIdDuocChon = roomId;
      this.layPhongChat(this.chatRoomIdDuocChon, () => {
        console.log("➡️ selectedRoom sau khi gọi xong:", this.selectedRoom);
      });

    }

  }



  selectMember(member: any): void {
    this.selectedMember = member;
    if (this.selectedMember) {
      this.toggleProfileModal();
    }
  }
  toggleProfileModal() {
    this.showProfileModal = !this.showProfileModal;
  }
  showAddMembersModal: boolean = false;

  toggleAddMembersModal(): void {
    this.showAddMembersModal = !this.showAddMembersModal;
  }
  toggleMembersModal(): void {
    this.showMembers = !this.showMembers;

  }
  showGroupsToInvite = false;
  toggleGroupsToInviteModal(): void {
    this.showGroupsToInvite = !this.showGroupsToInvite;
  }


  foundUser?: Userr;
  onSearchUser() {
    this.userService.getUsers().subscribe({
      next: users => {
        const found = users.find(u => u.email === this.searchTerm);
        if (found) {
          this.foundUser = found;
          console.log('Found User:', this.foundUser);
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

  chatRoomDuocChon(id: string): void {

    this.messageService.getAllMessages(id).subscribe({
      next: (res: any) => {
        this.messagees = res;
        console.log('tin nhắn: ', this.messagees);
        // Log toàn bộ sendID
        const allSendIDs = this.messagees.map(msg => msg.sendID);
        console.log('🔍 Tất cả sendID:', allSendIDs);
        console.log('🙋‍♂️ idNguoiDungHienTai:', this.idNguoiDungHienTai);

      },
      error: err => {
        console.log(err);
      }
    });
  }

  chonHinhAnh() {
    this.imageInput.nativeElement.value = ''; // reset input
    this.docFiles = []; // xoá file không cùng loại
    this.imageInput.nativeElement.click();
  }

  chonTaiLieu() {
    this.fileInput.nativeElement.value = '';
    this.imageFiles = [];
    this.fileInput.nativeElement.click();
  }

  xuLyFiles(event: any, loai: 'image' | 'doc') {
    const files: FileList = event.target.files;
    if (!files) return;

    const arr = Array.from(files);
    if (loai === 'image') {
      this.imageFiles = arr.filter(file => file.type.startsWith('image/'))
       .map(file => {
        return {
          file,
          name: file.name,
          preview: URL.createObjectURL(file)  // tạo URL xem trước
        };
      });
    } else {
      this.docFiles = arr.filter(file => !file.type.startsWith('image/'))
       .map(file => ({
        file,
        name: file.name,
        type: file.type,
        preview: this.sanitizer.bypassSecurityTrustResourceUrl(URL.createObjectURL(file)) // PDF/doc cần sanitize

      }));
    }
  }
xoaFile(type: 'image' | 'doc', index: number) {
  if (type === 'image') {
    URL.revokeObjectURL(this.imageFiles[index].preview);
    this.imageFiles.splice(index, 1);
  } else {
    this.docFiles.splice(index, 1);
  }
}

  createMessage(text: string): void {
    const chatRoom = this.selectedRoom?._id; // Đây phải là một đối tượng ChatRoom
    const user = this.idNguoiDungHienTai; // Đây phải là một đối tượng Userr

    // Kiểm tra nếu thiếu thông tin cần thiết
    if (!chatRoom || !user) {
      console.warn("Chat room or user information is missing.");
      return;
    }
    const hasFiles = this.imageFiles?.length || this.docFiles?.length;

    if (!hasFiles) {
      if (this.replyingTo) {
        const newReplyMessage: any = {
          _id: this.replyingTo._id,
          content: {
            type: "text",
            text: text,
            media: [],
            files: [],
          },
        };

        this.http.post<Messagee>(`${this.baseApiUrl}/message/reply/`, newReplyMessage, {
          headers: this.getHeaders()
        }).subscribe({
          next: (res: Messagee) => {
            console.log("Tin nhắn vừa trả lời: ", res);
            this.messagees.push(res);

            this.socketService.sendMessage(chatRoom, res);

            this.replyingTo = null;
            this.messageText = "";

            setTimeout(() => {
              const chatContainer = document.querySelector('.messages-chat');
              if (chatContainer) {
                chatContainer.scrollTop = chatContainer.scrollHeight;
              }
            }, 100);

            if(this.selectedRoom){
              this.selectedRoom.latestMessage = res;
            }
          },
          error: (err) => {
            console.error("Error replying to message:", err);
          }
        });
      } else {
        // Tạo dữ liệu tin nhắn mới
        const newMessage: any = {
          chatId: chatRoom, // Gán đối tượng ChatRoom
          sendID: user, // Gán đối tượng Userr
          content: {
            type: "text",
            text: text,
            media: [],
            files: [],
          },
          replyToMessage: this.replyingTo || null,
        };
        console.log("newMessage", newMessage);

        this.http.post<Messagee>(`${this.baseApiUrl}/message/`, newMessage, {
          headers: this.getHeaders(),
        }).subscribe({
          next: (res: Messagee) => {
            console.log("Tin nhắn vừa tạo xong: ", res);

            // Đẩy tin nhắn mới vào danh sách tin nhắn hiện tại
            this.messagees.push(res);

            this.socketService.sendMessage(chatRoom, res);


            // Xóa trạng thái trả lời (replyingTo) sau khi gửi
            this.replyingTo = null;

            // Xóa nội dung input
            this.messageText = "";

      
            setTimeout(() => {
              const chatContainer = document.querySelector('.messages-chat');
              if (chatContainer) {
                chatContainer.scrollTop = chatContainer.scrollHeight;
              }
            }, 100);

            if(this.selectedRoom){
              this.selectedRoom.latestMessage = res;
            }

          },
          error: (err) => {
            console.error("Lỗi khi tạo tin nhắn: ", err);
          },
        });
      }
    } else {
      const formData = new FormData();

      const content = {
        type: this.imageFiles?.length ? 'media' : 'file',
        text: this.messageText || '',
        media: [],
        files: [],
      };

      formData.append('chatId', chatRoom);
      formData.append('content', JSON.stringify(content)); // Gửi content dưới dạng stringified JSON

      if (this.imageFiles?.length) {
        this.imageFiles.forEach(file => formData.append('media', file.file));
      }

      if (this.docFiles?.length) {
        this.docFiles.forEach(file => formData.append('file', file.file)); // Quan trọng: key là `file` để backend bắt đúng
      }

      if (this.replyingTo) {
        this.http.post<Messagee>(`${this.baseApiUrl}/message/reply/`, formData, {
          headers: this.getHeaders()
        }).subscribe({
          next: (res: Messagee) => {
            console.log("Tin nhắn vừa trả lời: ", res);
            this.messagees.push(res);

            this.socketService.sendMessage(chatRoom, res);

            this.replyingTo = null;
            this.messageText = "";
            this.imageFiles = [];
            this.docFiles = [];

            setTimeout(() => {
              const chatContainer = document.querySelector('.messages-chat');
              if (chatContainer) {
                chatContainer.scrollTop = chatContainer.scrollHeight;
              }
            }, 100);
            if(this.selectedRoom){
              this.selectedRoom.latestMessage = res;
            }
          },
          error: (err) => {
            console.error("Error replying with files:", err);
          }
        });
      } else {
        this.http.post<Messagee>(`${this.baseApiUrl}/message/`, formData, {
          headers: this.getHeaders(),
        }).subscribe({
          next: (res: Messagee) => {
            console.log("Tin nhắn vừa tạo xong: ", res);

            // Đẩy tin nhắn mới vào danh sách tin nhắn hiện tại
            this.messagees.push(res);

            this.socketService.sendMessage(chatRoom, res);

            // Xóa trạng thái trả lời (replyingTo) sau khi gửi
            this.replyingTo = null;

            // Xóa nội dung input
            this.messageText = "";
            this.imageFiles = [];
            this.docFiles = [];

            setTimeout(() => {
              const chatContainer = document.querySelector('.messages-chat');
              if (chatContainer) {
                chatContainer.scrollTop = chatContainer.scrollHeight;
              }
            }, 100);
            if(this.selectedRoom){
              this.selectedRoom.latestMessage = res;

            }
          },
          error: (err) => {
            console.error("Lỗi khi tạo tin nhắn: ", err);
          },
        });
      }
    }
    //xử lý đem phòng chat có tin nhắn mới lên đầu
    const index = this.chatRooms.findIndex(r => r._id === this.chatRoomIdDuocChon);
    if(index !== -1){
      const [chatRoomCoTinNhanMoi] = this.chatRooms.splice(index, 1);
      this.chatRooms.unshift(chatRoomCoTinNhanMoi);
    }
  }

  leaveChatRoom():void{
   if(this.chatRoomIdDuocChon){
      this.chatRoomService.roiPhongChat(this.chatRoomIdDuocChon).subscribe({
      next: (res) => {
        console.log('Đã rời khỏi phòng chat:', res);
        this.chatRooms = this.chatRooms.filter(room => room._id !== this.chatRoomIdDuocChon);
         if(this.chatRoomIdDuocChon) 
          this.socketService.roiPhongChat(this.chatRoomIdDuocChon);
        this.chatRoomIdDuocChon = null;
        this.selectedRoom = undefined;
        this.messagees = [];
      },
      error: (err) => {
        console.error('Lỗi khi rời phòng chat:', err);
      }
    });
   }
  }
  /**----------------Xử lý update nhóm---------------- */
  changedAdmin: string = '';
  editingName: boolean = false;
  editingImage: boolean = false;
  editedRoomName: string = '';
  tempImageFile: any = null;
  changedImage: string = '';

    toggleEditName(): void {
    this.editingName = true;
    this.editedRoomName = this.selectedRoom?.chatRoomName || '';
  }
    saveRoomName(): void {
    if (this.editedRoomName && this.editedRoomName !== this.selectedRoom?.chatRoomName) {
      this.updateChatRoom();
    }
    this.editingName = false;
  }
    cancelEditName(): void {
    this.editingName = false;
    this.editedRoomName = this.selectedRoom?.chatRoomName || '';
  }
    toggleEditImage(): void {
    this.editingImage = true;
  }
    chonHinhAnhGroup(): void {
    this.imageInput.nativeElement.click();
  }
  onImageSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const img = new Image();
      const reader = new FileReader();
  
      reader.onload = (e: any) => {
        img.src = e.target.result;
  
        img.onload = () => {
          const size = 200; // desired size for avatar
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
  
          canvas.width = size;
          canvas.height = size;
  
          // Draw circle mask
          ctx.beginPath();
          ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
  
          // Draw the image centered
          const scale = Math.max(size / img.width, size / img.height);
          const x = (size - img.width * scale) / 2;
          const y = (size - img.height * scale) / 2;
  
          ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
  
          const base64Image = canvas.toDataURL('image/jpeg', 0.9);
          this.changedImage = base64Image;
          // Không gọi updateChatRoom() ngay lập tức - đợi người dùng nhấn lưu
        };
      };
  
      reader.readAsDataURL(file);
    }
  }
  saveImage(): void {
    if (this.changedImage) {
      this.uploadService.uploadBase64Image(this.changedImage).subscribe({
        next: (res) => {
          if (res) {
            this.changedImage = res; // cập nhật lại thành URL trả về từ server      // sau đó mới gọi update
            if(this.selectedRoom){
              this.selectedRoom.image = res;
            }
             this.updateChatRoom(); 
          } else {
            alert('Upload ảnh thất bại ❌');
          }
        },
        error: (err) => {
          console.error('Lỗi upload ảnh:', err);
          alert('Lỗi upload ảnh ❌');
        }
      });
    } else {
      this.editingImage = false;
    }
  }

  cancelEditImage(): void {
    this.editingImage = false;
    this.changedImage = '';
    this.tempImageFile = null;
  }
   updateChatRoom(): void {
    const updateData: any = {
      chatRoomId: this.selectedRoom?._id
    };    

  
    if (this.editingName && this.editedRoomName && this.editedRoomName !== this.selectedRoom?.chatRoomName) {
      updateData.chatRoomName = this.editedRoomName;
    }
  
    if (this.addedMembers.length > 0) {
      updateData.members = this.addedMembers;
    }
  
    if (this.changedImage) {
      updateData.image = this.changedImage;
    }
  
    if (this.changedAdmin) {
      updateData.newAdminId = this.changedAdmin;
    }
  
    // Chỉ gọi API nếu có thay đổi
    if (Object.keys(updateData).length > 1) { // Vì luôn có chatRoomId
      this.chatRoomService.updateChatRoom(updateData).subscribe({
        next: (updatedRoom) => {

          const index = this.chatRooms.findIndex(r => r._id === updatedRoom._id);
          if (index !== -1) {
            this.chatRooms[index] = updatedRoom;
          }
          this.selectedRoom = updatedRoom;

          if(this.selectedRoom)
            this.socketService.capNhatPhongChat(this.selectedRoom._id, this.selectedRoom);

          // Reset form values/UI states
          this.showAddMembersModal = false;
          this.editingName = false;
          this.editingImage = false;
          this.addedMembers = [];
          this.changedImage = '';
          this.changedAdmin = '';
          this.tempImageFile = null;
        },
        error: (err) => {
          console.error('Update failed', err);
          alert('Không thể cập nhật phòng chat: ' + (err.error?.msg || 'Lỗi không xác định ❌'));
        }
      });
    } else {
      // Reset UI nếu không có thay đổi
      this.editingName = false;
      this.editingImage = false;

  
    }
  }
   /**----------End------Xử lý update nhóm---------------- */
  onConfirmUpdate(members: string[]): void {
    this.addedMembers = members;
    console.log("🚀 ~ ChattingComponent ~ onConfirmUpdate ~ members:", members)
    this.addManyMemsChatRoom();
  }

  addManyMemsChatRoom(): void {
    const updateData: any = {
      chatRoomId: this.selectedRoom?._id
    };
    if (this.addedMembers.length > 0) {
      updateData.userIds = this.addedMembers;
    }

    this.chatRoomService.addMembersChatRoom(updateData).subscribe({
      next: (updatedRoom: ChatRoom) => {
        this.layPhongChat(updatedRoom._id);
        if (this.selectedRoom) {
          this.socketService.capNhatPhongChat(this.selectedRoom._id, this.selectedRoom);
        }
        // Reset form values/UI states
        this.showAddMembersModal = false;
        this.addedMembers = [];
      },
      error: (err) => {
        console.error('Update failed', err);
        alert('Không thể cập nhật phòng chat: ' + (err.error?.msg || 'Lỗi không xác định ❌'));
      }
    });
  }

  addMemChatRoom(): void {
    const updateData: any = {
      chatRoomId: this.selectedRoom?._id
    };

    if (this.addedMembers.length > 0) {
      updateData.members = this.addedMembers;
    }

    this.chatRoomService.inviteToChatRoom(updateData).subscribe({
      next: (updatedRoom) => {
        console.log("🚀 ~ ChattingComponent ~ this.chatRoomService.inviteToChatRoom ~ updatedRoom:", updatedRoom)
        this.membersList = this.filteredMembers(updatedRoom); // ✅ Update members list if needed
        if (this.selectedRoom) {
          this.socketService.capNhatPhongChat(this.selectedRoom._id, this.selectedRoom);
        }
        // Reset form values/UI states
        this.showAddMembersModal = false;
        this.addedMembers = [];
      },
      error: (err) => {
        console.error('Update failed', err);
        alert('Không thể cập nhật phòng chat: ' + (err.error?.msg || 'Lỗi không xác định ❌'));
      }
    });
  }

  getId(admin: any): string {
    return typeof admin === 'string' ? admin : admin?._id;
  }

  removeMember(memberId: string): void {
    if (!this.selectedRoom) return;

    // Confirm before removing
    // const confirmDelete = confirm('Bạn có chắc chắn muốn xóa thành viên này khỏi nhóm không?');
    // if (!confirmDelete) return;

    // Remove the member
    const updatedMembers = this.selectedRoom.members
      .map((m: any) => typeof m === 'string' ? m : m._id)
      .filter(id => id !== memberId);

    const updateData = {
      chatRoomId: this.selectedRoom._id,
      members: updatedMembers
    };

    this.chatRoomService.updateChatRoom(updateData).subscribe({
      next: (updatedRoom) => {
        // alert('Đã xóa thành viên khỏi nhóm');
        const index = this.chatRooms.findIndex(r => r._id === updatedRoom._id);
        if (index !== -1) {
          this.chatRooms[index] = updatedRoom;
        }
        this.selectedRoom = updatedRoom; // 🔄 Refresh selectedRoom
        this.membersList = this.filteredMembers(updatedRoom); // ✅ Update members list if you're using this
        console.log('chatRoom sau khi xoa', updatedRoom)
        if (this.selectedRoom) {
          this.socketService.capNhatPhongChat(this.selectedRoom._id, this.selectedRoom);
        }
      },
      error: (err) => {
        console.error('Xóa thành viên thất bại:', err);
        alert('Không thể xóa thành viên: ' + (err.error?.msg || 'Lỗi không xác định'));
      }
    });
  }


  deleteChatRoom(): void {
    if (!this.selectedRoom) {
      console.error('Chưa chọn phòng chat');
      return;
    }

    // Hỏi xác nhận trước khi xóa
    if (confirm('Bạn có chắc chắn muốn xóa phòng chat này không?')) {
      this.chatRoomService.deleteChatRoom(this.selectedRoom._id).subscribe({
        next: () => {
          console.log('Đã xóa phòng chat thành công');
          // Xóa phòng chat khỏi danh sách
          this.chatRooms = this.chatRooms.filter(room => room._id !== this.selectedRoom?._id);
          if (this.selectedRoom)
            this.socketService.xoaPhongChat(this.selectedRoom._id);
          // Reset phòng chat đã chọn
          this.selectedRoom = undefined;
          this.chatRoomIdDuocChon = null;
          // Xóa tin nhắn
          this.messagees = [];
          // Hiển thị thông báo thành công
          alert('Đã xóa phòng chat');

        },
        error: (err) => {
          console.error('Không thể xóa phòng chat:', err);
          alert('Không thể xóa phòng chat: ' + (err.error?.msg || 'Lỗi không xác định'));
        }
      });
    }
  }






  recallMessage(idMsg: string, index: number, code: number): void {
    const msg = this.messagees[index];
    console.log(code);

    if (code === 2) {
      this.http.post<Messagee>(`${this.baseApiUrl}/message/recall/${code}`, { _id: idMsg }, {
        headers: this.getHeaders()
      }).subscribe({
        next: (res: Messagee) => {
          console.log('Tin nhắn đẵ thu hồi voi code là 2', res);
          msg.recall = '2';
          msg.content.text = '';
          msg.content.files = [];
          msg.content.media = [];
          console.log('2');

          if (this.chatRoomIdDuocChon)
            this.socketService.xoaTinNhan(this.chatRoomIdDuocChon, msg);
        }
      });
    } else if (code === 1) {
      this.http.post<Messagee>(`${this.baseApiUrl}/message/recall/${code}`, { _id: idMsg }, {
        headers: this.getHeaders()
      }).subscribe({
        next: (res: Messagee) => {
          console.log('Tin nhắn đẵ thu hồi với code là 1', res);
          msg.recall = '1';
          msg.content.text = '';
          msg.content.files = [];
          msg.content.media = [];

        }
      });
      console.log('1');
    }

    this.closeMessageOptions();
  }

  toggleEmojiPicker(): void {
    this.showEmojiPicker = !this.showEmojiPicker;
  }

  addEmoji($event: any) {
    const emoji = $event.emoji.native;
    this.messageText += emoji;
    this.showEmojiPicker = false;
  }

  getDisplayName(userId: string): string {
    const user = this.nguoiDung.find(u => u._id === userId);
    if (!user) {
      return 'Me';
    } else {
      return user.name;
    }
  }
  // getReplySenderId(sendID: any): string {
  //   // If it's an object, return the _id, otherwise return the value directly
  //   return typeof sendID === 'object' && sendID !== null ? sendID._id : sendID;
  // }

  selectedMessageIndex: number | null = null;
  replyingTo: Messagee | null = null;

  toggleMessageOptions(index: number): void {
    this.selectedMessageIndex = this.selectedMessageIndex === index ? null : index;
  }

  closeMessageOptions(): void {
    this.selectedMessageIndex = null;
  }

  replyToMessage(index: number): void {
    this.replyingTo = this.messagees[index];
    console.log("Đang reply đến:", this.replyingTo);
    this.closeMessageOptions();
  }

  cancelReply(): void {
    this.replyingTo = null;
  }

  get filteredChatRooms(): ChatRoom[] {
    const term = this.searchTerm?.trim().toLowerCase();
    if (!term) return [];
    return this.chatRooms.filter(chatRoom => {
      if (chatRoom.isGroupChat) {
        return chatRoom.chatRoomName?.toLowerCase().includes(term);
      } else {
        return chatRoom.otherMembers?.[0]?.name.toLowerCase().includes(term);
      }
    });
  }

  get filteredMessages(): Messagee[] {
    const term = this.messageSearchTerm?.trim().toLowerCase();
    if (!term || !Array.isArray(this.messagees)) return [];
    return this.messagees.filter(
      (msg) => msg.content?.type === 'text' && msg.content.text?.toLowerCase().includes(term)
    );
  }

goToMessage(msg: Messagee): void {
  const el = document.getElementById('msg-' + msg._id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('highlighted-message');

    // Xóa class sau 2 giây
    setTimeout(() => el.classList.remove('highlighted-message'), 2000);
  }
}

searchedMembers(room: ChatRoom): Userr[] {
  const members = this.filteredMembers(room); // giữ nguyên xử lý của bạn
  return members.filter(member =>
    member.name.toLowerCase().includes(this.searchTermMember.toLowerCase())
  );
}

scrollToMessage() {
  if (this.selectedHighlightMessageId) {
    const el = document.getElementById('msg-' + this.selectedHighlightMessageId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
}

// Hàm cập nhật trạng thái online/offline
private updateUserOnlineStatus(userId: string, isOnline: boolean): void {
  this.chatRooms.forEach(room => {
    if (!room.isGroupChat && room.otherMembers?.length > 0) {
      const member = room.otherMembers[0];
      if (member._id === userId) {
        member.online = isOnline;
      }
    }
  });
  // Cập nhật lại giao diện nếu cần
  this.chatRooms = [...this.chatRooms]; // Trigger change detection
}

//...

  getUserFromChats(chatRoomId: string): Userr[] {
    const chatRoom = this.chatRooms.find(room => room._id === chatRoomId);

    if (!chatRoom) return [];

    return chatRoom.members
      .map((memberId: string) => this.nguoiDung.find(u => u._id === memberId))
      .filter((user): user is Userr =>
        !!user && user.name.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
  }
  

  getUserFromId(userId: string): Userr | undefined {
    return this.nguoiDung.find(user => user._id === userId);
  }
  getUserName(userId: string): string {
    const user = this.getUserFromId(userId);
    return user ? user.name : 'Unknown User';
  }

  processIncomingMessage(msg: any): void {
    console.log('Processing incoming message:', msg);

    const messageData = msg.data || msg;

    this.messagees.push(messageData);

    setTimeout(() => {
      const chatContainer = document.querySelector('.messages-chat');
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }, 100);
  }

  //Thời gian sau khi nhận tin nhắn mới nhất được gởi

  getTimeAgo(time: string): string {
    if (!time) return '';

    const messageDate = new Date(time);
    const now = new Date();
    const diffMs = now.getTime() - messageDate.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);

    const isYesterday =
      messageDate.getDate() === now.getDate() - 1 &&
      messageDate.getMonth() === now.getMonth() &&
      messageDate.getFullYear() === now.getFullYear();

    if (diffSec < 60) return 'Vừa xong';
    if (diffMin < 60) return `${diffMin} phút trước`;
    if (diffHr < 24) return `${diffHr} giờ trước`;
    if (isYesterday) return 'Hôm qua';

    const diffDay = Math.floor(diffHr / 24);
    console.log("🚀 ~ ChattingComponent ~ getTimeAgo ~ diffDay:", diffDay)
    return `${diffDay} ngày trước`;
  }

}
