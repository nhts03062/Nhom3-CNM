import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket;

  constructor() { 
    this.socket = io('http://localhost:5000');
  }

  private hasJoined = false;

joinRoom(userId: string): void {
  if (!this.hasJoined) {
    this.socket.emit("join", userId);
    this.hasJoined = true;
    console.log('Người dùng đã tham gia vào phòng chat');
  }
}

  onNewMessage(callback: (message: any) => void): void {
    this.socket.on("new-message", callback);
  }

  onNewChatRoom(callback: (chatRoom: any) => void): void {
    this.socket.on("new-chatRoom", callback);
  }

  onNewRecall(callback: (recallMessage: any) => void): void {
    this.socket.on('recall', callback);
  }

  // Thêm các sự kiện cho kết bạn
  onFriendRequested(callback: (data: any) => void): void {
    this.socket.on('friend-requested', callback);
  }

  onFriendRequestCanceled(callback: (data: any) => void): void {
    this.socket.on('friend-request-canceled', callback);
  }

  onAgreeFriend(callback: (friend: any) => void): void {
    this.socket.on('agree-friend', callback);
  }

  // Gửi yêu cầu hủy kết bạn
  cancelFriendRequest(userId: string): Observable<any> {
    return new Observable((observer) => {
      this.socket.emit('cancel-request-friend', { userId }, (response: any) => {
        if (response.error) {
          observer.error(response.error);
        } else {
          observer.next(response);
          observer.complete();
        }
      });
    });
  }

  // Gửi phản hồi kết bạn (chấp nhận/từ chối)
  responseFriend(code: '0' | '1', userId: string): Observable<any> {
    return new Observable((observer) => {
      this.socket.emit('response-friend', { code, userId }, (response: any) => {
        if (response.error) {
          observer.error(response.error);
        } else {
          observer.next(response);
          observer.complete();
        }
      });
    });
  }

  // Getter để truy cập socket từ bên ngoài
  getSocket(): Socket {
    return this.socket;
  }
}

