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

@Component({
  selector: 'app-chatting',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent, PickerComponent],
  templateUrl: './chatting.component.html',
  styleUrl: './chatting.component.css',
})
export class ChattingComponent {

  users: User[] = sampleUsers;
  conversations: Conversation[] = sampleConversations;
  selectedConversationId: string | null = null;
  messageText: string = '';
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
