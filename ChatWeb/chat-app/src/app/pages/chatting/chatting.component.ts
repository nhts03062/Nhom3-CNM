
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { formatDistanceToNow } from 'date-fns';
import { sampleUsers, sampleConversations } from '../../mock-data/mock-data';
import { Conversation } from '../../models/conversation.model';
import { Message } from '../../models/message.model';
import { User } from '../../models/user.model';
import { ModalComponent } from '../modal/modal.component';
import { PickerComponent } from '@ctrl/ngx-emoji-mart';
import { mockAccountOwner } from '../../mock-data/mock-account-owner';
import { HttpClient, HttpHeaders, HttpClientModule } from '@angular/common/http';

import { ChatRoom } from '../../models/realModel/chatRoom.model';
import { Userr } from '../../models/realModel/user.model';
import { Messagee } from '../../models/realModel/message.model';
import { SocketService } from '../../socket.service';

@Component({
  selector: 'app-chatting',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent, PickerComponent,HttpClientModule],
  templateUrl: './chatting.component.html',
  styleUrl: './chatting.component.css',
})
export class ChattingComponent implements OnInit {

  idNguoiDungHienTai: string | null  = sessionStorage.getItem('userId')
  chatRooms: ChatRoom [] = [];
  messagees : Messagee [] = [];
  messageText: string = '';
  constructor(private http :HttpClient, private socketService : SocketService ){};
  chatRoomIdDuocChon: string | null = null;
  filesDaDuocChon : File[] = []

  ngOnInit(): void {
    this.getChatRoom();

    this.socketService.onNewMessage( msg =>{
      this.messagees.push(msg);
      console.log('tin nhắn tới',msg)
    })

    if(this.idNguoiDungHienTai){
      this.socketService.joinRoom(this.idNguoiDungHienTai)
    }
    
  }

  getHeaders(): HttpHeaders {
    const token = sessionStorage.getItem('token');
    return new HttpHeaders({ 'Authorization': `${token}` });
  }


  layNguoiDungKhac(room : ChatRoom): Userr | undefined {
    return room.members.find(mem => mem._id !== this.idNguoiDungHienTai);
  }


  getChatRoom(): void{
    this.http.get('http://localhost:5000/api/chatroom', { headers: this.getHeaders() }).subscribe({
      next: (res : any) => {
        this.chatRooms = res;
        console.log('phòng chat: ',res)
      }, error: err =>{
        console.log(err)
      }
    })
  }

  chatRoomDuocChon(id: string): void {
    this.chatRoomIdDuocChon = id;
    console.log(this.chatRoomIdDuocChon)
  
    this.http.get(`http://localhost:5000/api/message/${this.chatRoomIdDuocChon}`, {
      headers: this.getHeaders(),
    }).subscribe({
      next: (res: any) => {
        this.messagees = res;
        console.log('tin nhắn: ', this.messagees);
      },
      error: err => {
        console.log(err);
      }
    });
  }
  trenFilesDaChon (event: Event) : void {
    const input = event.target as HTMLInputElement;

    if(input.files && input.files.length >0)
      this.filesDaDuocChon = Array.from(input.files)

  }
  loaiFileDaChon (index :number): void {
    this.filesDaDuocChon.splice(index,1)
  }
  createMessage(content: string): void {
    const chatRoomId = this.chatRoomIdDuocChon 
    const userId = this.idNguoiDungHienTai
    if( !chatRoomId || !userId)
      return

    const newMessage: any = {
      chatId: chatRoomId,
      sendID: userId,
      content: {
        type: 'text',
        text: content,
      },
    };
    this.http.post<Messagee>(`http://localhost:5000/api/message/`,newMessage,{
      headers: this.getHeaders()
    }).subscribe({
      next: (res: Messagee) => {
        console.log('tin nhắn vừa tạo xong: ', res);
        this.messagees.push(res)
      },
      error: err => {
        console.log(err);
      }
    });
    this.messageText = ''
  }
  
 


  /**
   * ---------------------------------------------------------
   */

  users: User[] = sampleUsers;
  conversations: Conversation[] = sampleConversations;
  selectedConversationId: string | null = null;
  // messageText: string = '';
  showEmojiPicker: boolean = false;
  showModal = false;

  currentUserId: string = this.users.length > 0 ? this.users[0].id : '';

  get currentUser(): User | undefined {
    return this.users.find(user => user.id === this.currentUserId);
  }

  get activeConversation(): Conversation | undefined {
    return this.conversations.find(c => c.id === this.selectedConversationId);
  }

  toggleModal(): void {
    this.showModal = !this.showModal;
  }

  selectConversation(id: string): void {
    this.selectedConversationId = id;

    const convo = this.activeConversation;
    const user = this.currentUser;
    if (convo && user) {
      convo.messages.forEach(msg => {
        if (msg.senderId !== user.id && !msg.readBy.includes(user.id)) {
          msg.readBy.push(user.id);
        }
      });
    }
  }

  sendMessage(content: string): void {
    const user = this.currentUser;
    const convo = this.activeConversation;

    if (!content.trim() || !user || !convo) return;

    const newMessage: Message = {
      id: `msg_${Date.now()}`,
      senderId: user.id,
      content,
      type: 'text',
      timestamp: new Date(),
      readBy: []
    };
    // Log the new message to the console
    console.log('New message:', newMessage);

    convo.messages.push(newMessage);
    convo.lastMessage = newMessage;
    this.messageText = '';
  }

  getUserAvatar(userId: string): string |null| undefined {
    const user = this.users.find(u => u.id === userId);
    return user?.avatarUrl;
  }
  

  getUserOnlineStatus(userId: string): boolean {
    const user = this.users.find(u => u.id === userId);
    return !!user?.online;
  }
  getUserName(userId: string): boolean {
    const user = this.users.find(u => u.id === userId);
    return !!user?.name;
  }
  getUserLastSeen(userId: string): Date {
    const user = this.users.find(u => u.id === userId);
    return user?.lastSeen ? new Date(user.lastSeen) : new Date();
  }
  
  
  getLastMessage(convo: Conversation): string {
    const last = convo.messages[convo.messages.length - 1];
    return last ? last.content : '';
  }

  // getTimeAgo(convo: Conversation): string {
  //   return convo.lastMessage
  //     ? formatDistanceToNow(new Date(convo.lastMessage.timestamp), { addSuffix: true })
  //     : '';
  // }

  getTimeAgo(convo: Conversation): string {
    if (!convo.lastMessage) return '';
  
    const messageDate = new Date(convo.lastMessage.timestamp);
    const now = new Date();
    const diffMs = now.getTime() - messageDate.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
  
    const isYesterday =
      messageDate.getDate() === now.getDate() - 1 &&
      messageDate.getMonth() === now.getMonth() &&
      messageDate.getFullYear() === now.getFullYear();
  
    if (diffSec < 60) return 'just now';
    if (diffMin < 60) return `${diffMin} min ago`;
    if (diffHr < 24) return `${diffHr} hr ago`;
    if (isYesterday) return 'yesterday';
  
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay}d`;
  }  
  

  getLastSeenText(date: Date): string {
    return formatDistanceToNow(date, { addSuffix: true });
  }

  countUnreadMsgs(convo: Conversation): number {
    const user = this.currentUser;
    if (!user) return 0;
    return convo.messages.filter(
      msg => msg.senderId !== user.id && !msg.readBy.includes(user.id)
    ).length;
  }

  isLastOfSenderGroup(index: number, messages: Message[]): boolean {
    if (!messages || index >= messages.length - 1) return true;
    return messages[index].senderId !== messages[index + 1].senderId;
  }

  toggleEmojiPicker(): void {
    this.showEmojiPicker = !this.showEmojiPicker;
  }
  addEmoji($event: any) {
    const emoji = $event.emoji.native;
    this.messageText += emoji;
    this.showEmojiPicker = false;
    }

  getOtherUser(convo: Conversation): User | undefined {
    return this.users.find(u => u.id !== this.currentUserId && convo.participantIds.includes(u.id));
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

  get filteredConversations(): Conversation[] {
    return this.conversations.filter(convo => {
      const otherUser = this.getOtherUser(convo);
      return (
        otherUser &&
        otherUser.name.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    });
}



}
