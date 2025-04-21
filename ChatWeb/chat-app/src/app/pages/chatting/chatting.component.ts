
import { Component, OnInit,ElementRef, ViewChild  } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { formatDistanceToNow } from 'date-fns';
import { ModalComponent } from '../modal/modal.component';
import { PickerComponent } from '@ctrl/ngx-emoji-mart';
import { HttpClient, HttpHeaders, HttpClientModule } from '@angular/common/http';

import { ChatRoom } from '../../models/chatRoom.model';
import { Messagee } from '../../models/message.model';
import { SocketService } from '../../socket.service';
import { UserService } from '../../services/user.service';
import { ChatRoomService } from '../../services/chatRoom.service';
import { Userr } from '../../models/user.model';
import { ActivatedRoute } from '@angular/router';
import { MessageService } from '../../services/message.service';

@Component({
  selector: 'app-chatting',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent, PickerComponent,HttpClientModule],
  templateUrl: './chatting.component.html',
  styleUrl: './chatting.component.css',
})
export class ChattingComponent implements OnInit {
  @ViewChild('imageInput') imageInput!: ElementRef<HTMLInputElement>;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  defaultAvatarUrl = 'https://i1.rgstatic.net/ii/profile.image/1039614412341248-1624874799001_Q512/Meryem-Laval.jpg';
  defaulGrouptAvatarUrl= 'https://static.vecteezy.com/system/resources/previews/026/019/617/original/group-profile-avatar-icon-default-social-media-forum-profile-photo-vector.jpg';
  idNguoiDungHienTai: string | null  = sessionStorage.getItem('userId')
  chatRooms: ChatRoom [] = [];
  messagees : Messagee [] = [];
  messageText: string = '';
  chatRoomIdDuocChon: string | null = null;
  imageFiles: File[] = [];
  docFiles: File[] = [];
  nguoiDung:Userr [] =[];
  showEmojiPicker: boolean = false;
  showModal = false;
  searchTerm: string = '';
  selectedRoom? : ChatRoom | undefined;
  otherUsersChat: Userr[] = [];


  constructor(private http :HttpClient, private socketService : SocketService , 
    private userService : UserService, 
    private chatRoomService: ChatRoomService,
    private route: ActivatedRoute,
    private messageService: MessageService
  
  ){};
  
  ngOnInit(): void {
    this.getChatRooms();

    this.socketService.onNewMessage( msg =>{
      this.messagees.push(msg);
      console.log('tin nhắn tới',msg)
    })

    if(this.idNguoiDungHienTai){
      this.socketService.joinRoom(this.idNguoiDungHienTai)
    }

    this.socketService.onNewRecall( recal =>{
      this.messagees = this.messagees.map(msg => msg._id === recal._id ? recal : msg )
      console.log('thu hồi đã được gọi', recal)
    })
    this.route.queryParams.subscribe(params => {
      this.chatRoomIdDuocChon = params['roomId'];
      console.log("Selected chat room ID:", this.chatRoomIdDuocChon);
      if (this.chatRoomIdDuocChon) {
        this.getRoom(this.chatRoomIdDuocChon);
      }
    });

    
  }
  toggleModal(): void {
    this.showModal = !this.showModal;
  }
  
  getHeaders(): HttpHeaders {
    const token = sessionStorage.getItem('token');
    return new HttpHeaders({ 'Authorization': `${token}` });
  }

  

  // layNguoiDungKhac(room: ChatRoom, allUsers: Userr[]): { isGroupChat: boolean, avatarUrl?: string, name?: string, chatRoomName?: string, latestMessage?: string } {
  //   const otherIds = room.members.filter(id => id !== this.idNguoiDungHienTai);
  //   // If only one member left (the current user is excluded), it's not a group chat
  //   if (otherIds.length > 1) {
  //     return {
  //       isGroupChat: true,
  //       avatarUrl: room.image || this.defaulGrouptAvatarUrl,
  //       chatRoomName: room.chatRoomName,  // Group name
  //       latestMessage: room.latestMessage
  //     };
  //   } else {
  //     // User chat logic
  //     const user = allUsers.find(user => user._id === otherIds[0]);
  //     return {
  //       isGroupChat: false,
  //       avatarUrl: user?.avatarUrl || this.defaultAvatarUrl,
  //       name: user?.name,
  //       latestMessage: room.latestMessage
  //     };
  //   }
  // }

  layNguoiDungKhac(room: ChatRoom): Userr[] {
    // We assume members are now full user objects (after create or fetch)
    const otherUsers = (room.members as any[]).filter((member: any) => {
      // Get member._id if it's an object, otherwise just use the string
      const memberId = typeof member === 'string' ? member : member._id;
      return memberId !== this.idNguoiDungHienTai;
    }).filter((member: any) => typeof member !== 'string'); // Only keep objects (Userr)

    return otherUsers;
  }
  
  getMessageById(id: string): Messagee | undefined {
    return this.messagees.find(m => m._id === id);
  }
  

  getChatRooms(): void{
    this.chatRoomService.getChatRooms().subscribe({
      next: (res : any) => {
        this.chatRooms = res;
        console.log('các phòng chat: ',res)
      }, error: err =>{
        console.log(err)
      }
    })
  }
  getRoom(roomId: string): void {
    if (!roomId) {
      console.error('⛔️ roomId không tồn tại khi gọi getRoom');
      return;
    }
  
    this.chatRoomIdDuocChon = roomId;
    console.log("🚀 Gọi getRoom với roomId:", this.chatRoomIdDuocChon);
  
    this.chatRoomService.getChatRoomsById(this.chatRoomIdDuocChon).subscribe({
      next: (res: any) => {
        this.selectedRoom = res;
        console.log('✅ phòng chat nhận được: ', this.selectedRoom);
  
        // Gọi tiếp xử lý tin nhắn
        if (this.chatRoomIdDuocChon) {
          this.chatRoomDuocChon(this.chatRoomIdDuocChon);
        }
        // if (this.selectedRoom) {
        //   this.otherUsersChat = this.layNguoiDungKhac(this.selectedRoom);
        // }
        if (this.selectedRoom && Array.isArray(this.otherUsersChat)) {
          this.selectedRoom.isGroupChat = this.otherUsersChat.length > 1;
        }
        
        
        console.log('👥 Other users in this chat:', this.otherUsersChat);
      },
      error: err => {
        console.error('❌ Lỗi khi gọi getChatRoomsById:', err);
      }
    });
  }
  


  chatRoomDuocChon(id: string): void {
    this.chatRoomIdDuocChon = id;
    console.log("chatRoomDuocChon",this.chatRoomIdDuocChon)
  
    this.messageService.getAllMessages(this.chatRoomIdDuocChon).subscribe({
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
      this.imageFiles = arr.filter(file => file.type.startsWith('image/'));
    } else {
      this.docFiles = arr.filter(file => !file.type.startsWith('image/'));
    }
  }

  xoaFile(loai: 'image' | 'doc', index: number) {
    if (loai === 'image') {
      this.imageFiles.splice(index, 1);
    } else {
      this.docFiles.splice(index, 1);
    }
  }
  

  createMessage(text: string): void {
    const chatRoom = this.chatRoomIdDuocChon; // Đây phải là một đối tượng ChatRoom
    const user = this.idNguoiDungHienTai; // Đây phải là một đối tượng Userr

    // Kiểm tra nếu thiếu thông tin cần thiết
    if (!chatRoom || !user) {
      console.warn("Chat room or user information is missing.");
      return;
    }
    const hasFiles = this.imageFiles?.length || this.docFiles?.length;

    if (!hasFiles) {
    if (this.replyingTo){
      const newReplyMessage : any = {
        _id : this.replyingTo._id,
        content: {
          type: "text",
          text: text,
          media: [],
          files: [],
        },
      }
      this.http.post<Messagee>(`http://localhost:5000/api/message/reply/`, newReplyMessage,{
        headers : this.getHeaders()
      }).subscribe({
        next: (res :Messagee) =>{
          console.log("Tin nhắn vừa trả lời: ", res);
          this.messagees.push(res);
          this.replyingTo = null;
          this.messageText = "";
        }
      })
    }else{
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
    console.log("newMessage",newMessage);
  
    // Gửi tin nhắn đến API
    this.http.post<Messagee>(`http://localhost:5000/api/message/`, newMessage, {
      headers: this.getHeaders(),
    }).subscribe({
      next: (res: Messagee) => {
        console.log("Tin nhắn vừa tạo xong: ", res);
  
        // Đẩy tin nhắn mới vào danh sách tin nhắn hiện tại
        this.messagees.push(res);
  
        // Xóa trạng thái trả lời (replyingTo) sau khi gửi
        this.replyingTo = null;
  
        // Xóa nội dung input
        this.messageText = "";
      },
      error: (err) => {
        console.error("Lỗi khi tạo tin nhắn: ", err);
      },
    });
    }
  }else{
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
      this.imageFiles.forEach(file => formData.append('media', file));
    }

    if (this.docFiles?.length) {
      this.docFiles.forEach(file => formData.append('file', file)); // Quan trọng: key là `file` để backend bắt đúng
    }

    if (this.replyingTo){
     
      this.http.post<Messagee>(`http://localhost:5000/api/message/reply/`, formData,{
        headers : this.getHeaders()
      }).subscribe({
        next: (res :Messagee) =>{
          console.log("Tin nhắn vừa trả lời: ", res);
          this.messagees.push(res);
          this.replyingTo = null;
          this.messageText = "";
        }
      })
    }else{
    // Gửi tin nhắn đến API
    this.http.post<Messagee>(`http://localhost:5000/api/message/`, formData, {
      headers: this.getHeaders(),
    }).subscribe({
      next: (res: Messagee) => {
        console.log("Tin nhắn vừa tạo xong: ", res);
  
        // Đẩy tin nhắn mới vào danh sách tin nhắn hiện tại
        this.messagees.push(res);
  
        // Xóa trạng thái trả lời (replyingTo) sau khi gửi
        this.replyingTo = null;
  
        // Xóa nội dung input
        this.messageText = "";
        this.imageFiles = [];
        this.docFiles =[];
      },
      error: (err) => {
        console.error("Lỗi khi tạo tin nhắn: ", err);
      },
    });
    }

  }
   
  }
  
  recallMessage(idMsg : string, index : number, code : number):void{

    const msg = this.messagees[index];
    console.log(code)
    if(code === 2){
      this.http.post<Messagee>(`http://localhost:5000/api/message/recall/${code}`, {_id :idMsg}, {
        headers : this.getHeaders()}).subscribe({
          next : (res : Messagee) =>{
              console.log('Tin nhắn đẵ thu hồi voi code là 2', res)
              msg.recall = '2'
              msg.content.text= ''
              msg.content.files= []
              msg.content.media= []
            console.log('2')
          }
        })
        
    }else if (code === 1){
      this.http.post<Messagee>(`http://localhost:5000/api/message/recall/${code}`, {_id :idMsg}, {
        headers : this.getHeaders()}).subscribe({
          next : (res : Messagee) =>{
              console.log('Tin nhắn đẵ thu hồi với code là 1', res)
              msg.recall = '1'
              msg.content.text= ''
              msg.content.files= []
              msg.content.media= []
          }
        })
        console.log('1')
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
    } else{
      return user.name;}
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

  cancelReply(): void {
    this.replyingTo = null;
  }

  // get filteredChats(): ChatRoom[] {
  //   return this.chatRooms.filter(chatRoom => {
  //     return chatRoom.members.some((member:Userr) =>
  //       member.name.toLowerCase().includes(this.searchTerm.toLowerCase())
  //       );
  //     })  
  //   }
  //   getUserFromChats(chatRoomId: string): Userr[] {
  //     const chatRoom = this.chatRooms.find(room => room._id === chatRoomId);
    
  //     if (!chatRoom) return [];
    
  //     return chatRoom.members.filter((member: Userr) =>
  //       member.name.toLowerCase().includes(this.searchTerm.toLowerCase())
  //     );
  //   }
  get filteredChats(): ChatRoom[] {
    return this.chatRooms.filter(chatRoom => {
      return chatRoom.members.some((memberId: string) => {
        const user = this.nguoiDung.find(u => u._id === memberId);
        return user?.name.toLowerCase().includes(this.searchTerm.toLowerCase());
      });
    });
  }
  
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
  
  
}    


  



  /**
   * ---------------------------------------------------------
   */
  // users: User[] = sampleUsers;
  // conversations: Conversation[] = sampleConversations;
  // currentUserId: string = this.users.length > 0 ? this.users[0].id : '';
  // selectedConversationId: string | null = null;
  // messageText: string = '';




  // selectConversation(id: string): void {
  //   this.selectedConversationId = id;

  //   const convo = this.activeConversation;
  //   const user = this.currentUser;
  //   if (convo && user) {
  //     convo.messages.forEach(msg => {
  //       if (msg.senderId !== user.id && !msg.readBy.includes(user.id)) {
  //         msg.readBy.push(user.id);
  //       }
  //     });
  //   }
  // }



  // getUserLastSeen(userId: string): Date {
  //   const user = this.users.find(u => u.id === userId);
  //   return user?.lastSeen ? new Date(user.lastSeen) : new Date();
  // }
  
  // getOtherUser(convo: Conversation): User | undefined {
  //   return this.users.find(u => u.id !== this.currentUserId && convo.participantIds.includes(u.id));
  // }

  // getTimeAgo(convo: Conversation): string {
  //   if (!convo.lastMessage) return '';
  
  //   const messageDate = new Date(convo.lastMessage.timestamp);
  //   const now = new Date();
  //   const diffMs = now.getTime() - messageDate.getTime();
  //   const diffSec = Math.floor(diffMs / 1000);
  //   const diffMin = Math.floor(diffSec / 60);
  //   const diffHr = Math.floor(diffMin / 60);
  
  //   const isYesterday =
  //     messageDate.getDate() === now.getDate() - 1 &&
  //     messageDate.getMonth() === now.getMonth() &&
  //     messageDate.getFullYear() === now.getFullYear();
  
  //   if (diffSec < 60) return 'just now';
  //   if (diffMin < 60) return `${diffMin} min ago`;
  //   if (diffHr < 24) return `${diffHr} hr ago`;
  //   if (isYesterday) return 'yesterday';
  
  //   const diffDay = Math.floor(diffHr / 24);
  //   return `${diffDay}d`;
  // }  
  

  // getLastSeenText(date: Date): string {
  //   return formatDistanceToNow(date, { addSuffix: true });
  // }

  // countUnreadMsgs(convo: Conversation): number {
  //   const user = this.currentUser;
  //   if (!user) return 0;
  //   return convo.messages.filter(
  //     msg => msg.senderId !== user.id && !msg.readBy.includes(user.id)
  //   ).length;
  // }

  // isLastOfSenderGroup(index: number, messages: Message[]): boolean {
  //   if (!messages || index >= messages.length - 1) return true;
  //   return messages[index].senderId !== messages[index + 1].senderId;
  // }


