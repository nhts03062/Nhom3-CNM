import { Component, OnInit, ElementRef, ViewChild, HostListener, Input, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../modal/modal.component';
import { PickerComponent } from '@ctrl/ngx-emoji-mart';
import { HttpClient, HttpHeaders, HttpClientModule } from '@angular/common/http';

import { ChatRoom } from '../../models/chatRoom.model';
import { UploadService } from '../../services/upload.service';
import { ISenderId, Messagee } from '../../models/message.model';
import { SocketService } from '../../socket.service';
import { UserService } from '../../services/user.service';
import { ChatRoomService } from '../../services/chatRoom.service';
import { User } from '../../models/user.model';
import { MessageService } from '../../services/message.service';
import { defaultAvatarUrl, apiUrl, defaulGrouptAvatarUrl } from '../../contants';
import { ModalProfileComponent } from '../profile/modal-profile/modal-profile.component';
import { MembersModalComponent } from "./members-modal/members-modal.component";
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { forkJoin, startWith, Subscription } from 'rxjs';


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
  nguoiDungHienTai: User | undefined;
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
  nguoiDung: User[] = [];
  showEmojiPicker: boolean = false;
  showModal = false;
  searchTerm: string = '';
  selectedRoom?: ChatRoom | undefined;
  otherUsersChat: User[] = [];
  isSidebarOpen: boolean = false;
  searchTermMember: string = '';
  tbLoiAdmin: string = '';

  private baseApiUrl = apiUrl;
  defaulGrouptAvatarUrl = defaulGrouptAvatarUrl;
  defaultAvatarUrl = defaultAvatarUrl;
  membersList: User[] = [];
  showProfileModal = false;

  usersList: User[] = [];
  showMembers: boolean = false;
  selectedHighlightMessageId: string | null = null;
  roomIdSubscription: Subscription | undefined;
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
    private messageService: MessageService,
    private uploadService: UploadService,
    private sanitizer: DomSanitizer
  ) { };

  ngOnInit(): void {
    this.getChatRooms();
    this.loadUser();
    this.scrollToBottom();
    //Xử lý khi có tin nhắn mới socket

    this.socketService.onNewMessage(msg => {
      console.log('New message received:', msg);

      const messageData = msg.data || msg;
      const chatId = typeof messageData.chatId === 'string'
        ? messageData.chatId
        : messageData.chatId?._id;

      // Nếu tin nhắn đến từ phòng đang mở
      if (chatId === this.chatRoomIdDuocChon) {
        this.messagees.push(messageData);

        setTimeout(() => {
          const chatContainer = document.querySelector('.messages-chat');
          if (chatContainer) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
          }
        }, 100);

        if (this.selectedRoom) {
          this.selectedRoom.latestMessage = messageData;
        }

        // Đưa phòng lên đầu danh sách
        const index = this.chatRooms.findIndex(r => r._id === chatId);
        if (index !== -1) {
          const [updatedRoom] = this.chatRooms.splice(index, 1);
          updatedRoom.latestMessage = messageData;
          this.chatRooms.unshift(updatedRoom);
          this.chatRooms = [...this.chatRooms]; // Force Angular detect thay đổi
        }
      } else {
        // Tin nhắn từ phòng khác đang không mở
        const index = this.chatRooms.findIndex(r => r._id === chatId);
        if (index !== -1) {
          const [updatedRoom] = this.chatRooms.splice(index, 1);
          updatedRoom.latestMessage = messageData;
          this.chatRooms.unshift(updatedRoom);
          this.chatRooms = [...this.chatRooms]; // Trigger change detection
        }
      }
    });


    //Xử lý xóa tin nhắn socket
    this.socketService.nhanskXoaTinNhan(recal => {
      if (recal.chatId._id.toString() === this.chatRoomIdDuocChon?.toString()) {
        this.messagees = this.messagees.map(msg => msg._id === recal._id ? recal : msg);
      }
      this.chatRooms.forEach(room => {
        if (room.latestMessage?._id.toString() === recal._id.toString()) {
          room.latestMessage = recal;
        }
      })
    });

    //Xử lý khi có phòng chat mới socket
    this.socketService.nhanskTaoPhongChat((chatRoom: any) => {
      const kiemTraCoTrongPhong = chatRoom.members.some((mem: any) => {
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
      if (kiemTraCoTrongPhong) {
        chatRoom.otherMembers = this.layNguoiDungKhac(chatRoom);
        if (!this.chatRooms.some(room => room._id === chatRoom._id)) {
          this.chatRooms.unshift(chatRoom);
          this.socketService.thamGiaPhongChat(chatRoom._id);
        }
      }
    })

    //Xử lý khi nhận sự kiện xóa phòng chat
    this.socketService.nhanskXoaPhongChat((roomId: string) => {
      this.chatRooms = this.chatRooms.filter(room => room._id !== roomId);
      if (this.chatRoomIdDuocChon === roomId) {
        this.chatRoomIdDuocChon = null;
        this.selectedRoom = undefined;
        this.messagees = [];
      }
    })

    //Xử lý khi nhận sự kiện cập nhật phòng chat
    this.socketService.nhanskCapNhatPhongChat((room: ChatRoom) => {
      this.updateChatRoomsList(room, this.idNguoiDungHienTai);
    });

    //Xử lý khi nhận sự kiện rời phòng chat
    this.socketService.nhanskRoiPhongChat((chatRoomId: string, userId: string) => {
      const index = this.chatRooms.findIndex(r => r._id === chatRoomId);

      if (index !== -1) {
        const room = this.chatRooms[index];
        room.members = room.members.filter((mem: any) => {
          return this.getId(mem) !== userId;
        })
        if (this.chatRoomIdDuocChon === chatRoomId) {
          this.selectedRoom = room;
        }
        this.membersList = this.filteredMembers(room);

      }
    });
    this.socketService.nhanskMoiVaoPhongChat((invitedUser: User) => {
      if (this.selectedRoom) {
        // Thêm invitedUser vào selectedRoom.members nếu chưa có
        const exists = this.selectedRoom.members.some(u => u._id === invitedUser._id);
        if (!exists) {
          this.selectedRoom.members = [...this.selectedRoom.members, invitedUser];

        }
        // this.updateChatRoomsList(this.selectedRoom, this.idNguoiDungHienTai);
      }
      console.log('🆕 User đã được mời:', invitedUser);
      this.getChatRooms();
    });

    if (this.idNguoiDungHienTai) {
      this.socketService.joinRoom(this.idNguoiDungHienTai);
    }

    // Xử lý mở phòng chat khi chuyển trang
    const currentRoomId = this.chatRoomService.getCurrentRoomId();

    this.roomIdSubscription = this.chatRoomService.getRoomId().pipe(
      startWith(currentRoomId),           // Đẩy giá trị hiện tại vào stream
    ).subscribe((roomId) => {
      if (roomId) {
        console.log('🔄 Room ID changed or initialized:', roomId);
        this.chatRoomIdDuocChon = roomId;
        this.getRoom(roomId); // Chỉ gọi 1 lần duy nhất ban đầu + khi thay đổi
        this.isSidebarOpen = false;
        this.showProfileModal = false;
      }
    });

  }

  ngOnDestroy(): void {
    this.socketService.offNhanskTaoPhongChat();
    this.socketService.offNhanskCapNhatPhongChat();
    this.socketService.offNhanskRoiPhongChat();
    this.socketService.offNhanskXoaPhongChat();
    this.socketService.offNhanskMoiVaoPhongChat();

    this.socketService.offNhanskXoaTinNhan();
    this.socketService.offOnNewMessage();
    this.roomIdSubscription?.unsubscribe();
  }
  canSendMessage(): boolean {
    return !!(this.messageText?.trim() || this.imageFiles.length || this.docFiles.length);
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
  loadUser(): void {
    if (this.idNguoiDungHienTai) {
      this.userService.getUserById(this.idNguoiDungHienTai).subscribe({
        next: (user) => {
          this.nguoiDungHienTai = user;
          console.log("🚀 ~ ModalProfileComponent ~ this.userService.getUserById ~ this.currentUser:", this.nguoiDungHienTai)
        },
        error: (err) => console.error("Failed to load user:", err)
      });
    }
  }

  filteredMembers(room: ChatRoom): User[] {
    const roomUsers = (room.members as any[]).filter((member: any) => {
      const memberId = typeof member === 'string' ? member : member._id;
      return memberId;
    }).filter((member: any) => typeof member !== 'string');

    return roomUsers;
  }

  getHeaders(): HttpHeaders {
    const token = sessionStorage.getItem('token');
    return new HttpHeaders({ 'Authorization': `${token}` });
  }

  layNguoiDungKhac(room: ChatRoom): User[] {
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
  // Hàm dùng chung để cập nhật chatRooms list dựa trên room mới
  updateChatRoomsList(updatedRoom: ChatRoom, currentUserId: string) {
    const isMember = updatedRoom.members.some((m: User | string) =>
      (typeof m === 'string' ? m : m?._id)?.toString() === currentUserId.toString()
    );

    const index = this.chatRooms.findIndex(r => r._id === updatedRoom._id);

    if (index !== -1) {
      // Phòng đã tồn tại: cập nhật
      this.chatRooms[index] = { ...this.chatRooms[index], ...updatedRoom };

      // Nếu user hiện tại không còn là thành viên, loại khỏi danh sách
      if (!isMember) {
        this.chatRooms.splice(index, 1);

        // Nếu đang chọn phòng này thì reset selectedRoom
        if (this.chatRoomIdDuocChon === updatedRoom._id) {
          this.chatRoomIdDuocChon = null;
          this.selectedRoom = undefined;
          this.messagees = [];
        }
      }
    } else if (isMember) {
      // Phòng chưa có trong danh sách, thêm vào đầu danh sách
      if (updatedRoom.latestMessage && typeof updatedRoom.latestMessage !== 'string' && updatedRoom.latestMessage.createdAt) {
        updatedRoom.timeAgo = this.getTimeAgo(updatedRoom.latestMessage.createdAt);
      }
      this.chatRooms.unshift(updatedRoom);
    }

    // Nếu đang chọn phòng này → cập nhật selectedRoom và membersList
    if (this.chatRoomIdDuocChon === updatedRoom._id) {
      const current = this.chatRooms.find(r => r._id === updatedRoom._id);
      if (current) {
        this.selectedRoom = current;
        this.membersList = this.filteredMembers(current);
      }
    }

    this.chatRooms = [...this.chatRooms]; // Trigger UI update
  }

  updateCalled = false;
  layPhongChat(roomId: string, callback?: () => void): void {
    this.chatRoomService.getChatRoomById(roomId).subscribe({
      next: async (res: ChatRoom) => {
        if (typeof res.latestMessage === 'string') {
          const fullMessage = this.getMessageById(res.latestMessage);
          if (fullMessage) {
            res.latestMessage = fullMessage;
          }
        }

        this.selectedRoom = res;
        this.membersList = this.filteredMembers(res);
        this.nguoiDung = this.layNguoiDungKhac(res);
        console.log("🚀 ~ ChattingComponent ~ this.chatRoomService.getChatRoomById ~ res:", res)

        // Emit socket với latestMessage là Message object
        if (this.updateCalled === true) {
          this.socketService.capNhatPhongChat(res._id, res);
          this.updateChatRoomsList(res, this.idNguoiDungHienTai);
          this.updateCalled = false;
        }

        if (this.nguoiDung?.[0]) {
          this.roomName = this.nguoiDung[0].name;
        }

        if (callback) callback();
      },
      error: (err) => {
        console.error("❌ Lỗi khi lấy phòng:", err);
      }
    });
  }


  roomName: string = "Unknow";
  getRoom(roomId: string): void {
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
      if (this.chatRoomIdDuocChon) {
        const room = this.chatRooms.find(r => r._id === this.chatRoomIdDuocChon);
        const isMember = room?.members.some((m: User | string) => {
          const memberId = typeof m === 'string' ? m : m._id;
          return memberId === this.idNguoiDungHienTai;
        });

        if (isMember) {
          this.layPhongChat(this.chatRoomIdDuocChon);
        } else {
          this.chatRoomIdDuocChon = null;
          this.selectedRoom = undefined;
          this.messagees = [];
        }
      }


    }

  }
  //Scroll xuống cuối khi mở phòng chat
  @ViewChild('bottomAnchor') bottomAnchor!: ElementRef;

  private shouldScroll = false;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['messagees']) {
      this.shouldScroll = true;
    }
  }

  ngAfterViewChecked() {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }
  @ViewChild('messagesChatContainer') messagesChatContainer!: ElementRef;

  scrollToBottom() {
    if (this.messagesChatContainer) {
      this.messagesChatContainer.nativeElement.scrollTop = this.messagesChatContainer.nativeElement.scrollHeight;
    }
  }



  selectedMember: User | undefined;

  selectMember(member: User): void {
    this.selectedMember = member
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

  // Ngày của mỗi tin nhắn
  extractUniqueDates(messages: Messagee[]): string[] {
    return [...new Set(messages.map(msg => msg.createdAt.split('T')[0]))];
  }


  // Check xem phải ngày mới nhất không
  isNewDate(index: number): boolean {
    if (index === 0) return true;
    const current = this.messagees[index].createdAt.split('T')[0];
    const prev = this.messagees[index - 1].createdAt.split('T')[0];
    return current !== prev;
  }
  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }


  ngayHienThi: string[] = [];
  chatRoomDuocChon(id: string): void {

    this.messageService.getAllMessages(id).subscribe({
      next: (res: any) => {
        this.messagees = res;
        console.log('tin nhắn: ', this.messagees);
        this.ngayHienThi = this.extractUniqueDates(this.messagees);
        setTimeout(() => this.scrollToBottom(), 0); // chờ DOM update rồi mới scroll
        // Log toàn bộ sendID
        // const allSendIDs = this.messagees.map(msg => msg.sendID);
        // console.log('🔍 Tất cả sendID:', allSendIDs);
        // console.log('🙋‍♂️ idNguoiDungHienTai:', this.idNguoiDungHienTai);

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
    if (!this.canSendMessage()) {
      return;
    }
    const chatRoom = this.selectedRoom?._id;
    if (!this.nguoiDungHienTai) {
      console.warn("Thông tin người dùng bị thiếu.");
      return;
    }
    const user: ISenderId = this.nguoiDungHienTai;

    if (!chatRoom || !user) {
      console.warn("Chat room or user information is missing.");
      return;
    }

    const hasFiles = this.imageFiles?.length || this.docFiles?.length;

    if (!hasFiles) {
      // Gửi tin nhắn văn bản (có hoặc không reply)
      const newMessage: Partial<Messagee> = {
        chatId: chatRoom,
        sendID: user,
        content: {
          type: "text",
          text: text,
          media: [],
          files: [],
        },
        recall: '0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (this.replyingTo) {
        newMessage._id = this.replyingTo._id;
        console.log("Gửi reply text, replyTo ID:", this.replyingTo?._id);

        this.http.post<Messagee>(`${this.baseApiUrl}/message/reply/`, newMessage, {
          headers: this.getHeaders()
        }).subscribe(this.getHttpObserver(chatRoom));
      } else {
        newMessage.replyToMessage = this.replyingTo || null;
        this.http.post<Messagee>(`${this.baseApiUrl}/message/`, newMessage, {
          headers: this.getHeaders()
        }).subscribe(this.getHttpObserver(chatRoom));
      }
    } else {
      // Gửi tin nhắn có đính kèm media/file
      const formData = new FormData();

      const content = {
        type: this.imageFiles?.length ? "media" : "file",
        text: this.messageText || '',
        media: [],
        files: [],
      };

      formData.append('chatId', chatRoom);
      formData.append('sendID', JSON.stringify(user));
      formData.append('recall', '0');
      formData.append('content', JSON.stringify(content));
      formData.append('createdAt', new Date().toISOString());
      formData.append('updatedAt', new Date().toISOString());

      if (this.imageFiles?.length) {
        this.imageFiles.forEach(file => formData.append('media', file.file));
      }

      if (this.docFiles?.length) {
        this.docFiles.forEach(file => formData.append('file', file.file));
      }

      if (this.replyingTo) {

        formData.append('_id', this.replyingTo._id);
        console.log("Gửi reply media/file, replyTo ID:", this.replyingTo?._id);
        this.http.post<Messagee>(`${this.baseApiUrl}/message/reply/`, formData, {
          headers: this.getHeaders()
        }).subscribe(this.getHttpObserver(chatRoom));
      } else {
        this.http.post<Messagee>(`${this.baseApiUrl}/message/`, formData, {
          headers: this.getHeaders()
        }).subscribe(this.getHttpObserver(chatRoom));
      }
    }

  }

  // Tách observer ra cho gọn
  private getHttpObserver(chatRoom: string) {
    return {
      next: (res: Messagee) => {
        console.log("Tin nhắn thành công:", res);
        this.messagees.push(res);
        this.socketService.sendMessage(chatRoom, res);
        // ✅ Cập nhật latestMessage trong chatRooms
        const index = this.chatRooms.findIndex(r => r._id === this.chatRoomIdDuocChon);
        if (index !== -1) {
          this.chatRooms[index].latestMessage = res;
          const [updatedRoom] = this.chatRooms.splice(index, 1);
          this.chatRooms.unshift(updatedRoom);
        }

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

        if (this.selectedRoom) {
          this.selectedRoom.latestMessage = res;
        }
      },
      error: (err: any) => {
        console.error("Lỗi khi gửi tin nhắn:", err);
      }
    };
  }

  thongBao: string = '';
  leaveChatRoom(): void {
    if (this.chatRoomIdDuocChon) {
      this.chatRoomService.roiPhongChat(this.chatRoomIdDuocChon).subscribe({
        next: (res: ChatRoom) => {
          console.log('✅ Đã rời khỏi phòng chat:', res);

          // ✅ Cập nhật danh sách chatRooms: xóa room vừa rời
          // this.chatRooms = this.chatRooms.filter(
          //   room => room._id !== this.chatRoomIdDuocChon
          // );
          this.updateChatRoomsList(res, this.idNguoiDungHienTai);

          // ✅ Dọn dẹp trạng thái
          if (this.chatRoomIdDuocChon) {
            this.socketService.roiPhongChat(this.chatRoomIdDuocChon);
          }
          this.chatRoomIdDuocChon = null;
          this.selectedRoom = undefined;
          this.messagees = [];
        },
        error: (err) => {
          // ✅ Nếu là admin, không được rời phòng
          console.error('❌ Lỗi khi rời phòng chat:', err);
          this.thongBao = '⚠️ Bạn là admin. Vui lòng chuyển quyền trước khi rời phòng.';
          setTimeout(() => {
            this.thongBao = '';
          }, 3000);
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
            if (this.selectedRoom) {
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
          this.layPhongChat(updatedRoom._id);
          this.updateCalled = true;

          // Reset form values/UI states
          this.showMembers = false;
          this.editingName = false;
          this.editingImage = false;
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
        this.updateCalled = true;
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
      next: (updatedRoom: ChatRoom) => {
        console.log("🚀 ~ ChattingComponent ~ this.chatRoomService.inviteToChatRoom ~ updatedRoom:", updatedRoom)
        this.layPhongChat(updatedRoom._id)
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
        this.layPhongChat(updatedRoom._id);
        this.updateCalled = true;
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
          // alert('Đã xóa phòng chat');

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
      this.messageService.recallMessage(code, idMsg).subscribe({
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
      this.messageService.recallMessage(code, idMsg).subscribe({
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
      return 'Tôi';
    } else {
      return user.name;
    }
  }

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

  //Chuyển tiếp tin nhắn
  showForwardModal: boolean = false;
  toggleForwardModal() {
    this.showForwardModal = !this.showForwardModal;
  }
  selectedIdRoomToFW: string[] = [];

  forwardMsgToUsers(chatIds: string[]): void {
    if (!this.forwardTo || chatIds.length === 0) {
      alert("Vui lòng chọn người nhận hoặc tin nhắn cần chuyển tiếp.");
      return;
    }

    const senderId = this.forwardTo?._id;
    if (!senderId) {
      alert("Không xác định được người gửi.");
      return;
    }
    const requests = chatIds.map(chatId =>
      this.messageService.forwardMessage(senderId, chatId)
    );
    console.log("🚀 ~ ChattingComponent ~ forwardMsgToUsers ~ chatIds:", chatIds)

    forkJoin(requests).subscribe({
      next: () => {
        console.log('Đã forward tới tất cả phòng');
        this.toggleForwardModal();
      },
      error: err => {
        console.error('Forward thất bại:', err);
        alert("Có lỗi khi gửi tin nhắn.");
      }
    });
  }

  selectedRoomIdsToForward: string[] = [];

  onSelectedChatRoomIds(ids: string[]) {
    this.selectedRoomIdsToForward = ids;
  }
  forwardToSelectedRooms = (): void => {
    this.forwardMsgToUsers(this.selectedRoomIdsToForward);
  };



  forwardTo: Messagee | undefined;
  forwardMessage(index: number) {
    this.forwardTo = this.messagees[index];
    console.log("Đang chuyển đến:", this.forwardTo);
    this.toggleForwardModal();
    this.closeMessageOptions();
  }


  cancelReply(): void {
    this.replyingTo = null;
  }

  get filteredChats(): ChatRoom[] {
    return this.chatRooms.filter(chatRoom => {
      return chatRoom.members.some((memberId: string) => {
        const user = this.nguoiDung.find(u => u._id === memberId);
        return user?.name.toLowerCase().includes(this.searchTerm.toLowerCase());
      });
    });
  }


  getUserFromId(userId: string): User | undefined {
    return this.nguoiDung.find(user => user._id === userId);
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

  get filteredMessages(): Messagee[] {
    const term = this.searchTerm?.trim().toLowerCase();
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

  searchedMembers(room: ChatRoom): User[] {
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


}