import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket;

  constructor() {
    this.socket = io('https://chat.fff3l.click');

    this.socket.on('connect', () => {
      console.log('Socket connected successfully!');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('Socket disconnected:', reason);
    });
  }

  joinRoom(userId: string): void {
    this.socket.emit("join", userId);
    console.log('User joined room:', userId);
  }

  onNewMessage(callback: (message: any) => void): void {
    this.socket.on("message-created", callback);
  }

  onNewChatRoom(callback: (chatRoom: any) => void): void {
    this.socket.on("new-chatRoom", callback);
  }

  onNewRecall(callback: (recallmessage: any) => void): void {
    this.socket.on('recall', callback);
  }

  sendMessage(chatRoomId: string, message: any): void {
    console.log('Sending message via socket:', { chatRoomId, message });

    this.socket.emit('create-message', { chatRoomId, data: message });

  }
 /**--------------------Kết bạn socket -------------*/
  //Gửi sự kiện kết bạn
  themBan(friendId: string, data: any):void{
    console.log('Đã gửi yêu cầu kết bạn');
    this.socket.emit('send-friend-request',friendId,data)
  }
  huyKetBan(userId: string):void{
    console.log('Đã hủy kết bạn');
    this.socket.emit('cancel-reqFriend',userId) //userId này là người gửi yêu cầu kết bạn
  }
  dongYKetBan(userId: string, data: any): void{
    console.log('Đã đồng ý kết bạn');
    this.socket.emit('accept-friend-request', userId,data); //userId naỳ là người gửi yêu cầu kết bạn
  }
  tuChoiKetBan(userId: string):void{
    console.log('Đã từ chối kết bạn');
    this.socket.emit('reject-friend-request', userId); //userId này là người gửi yêu cầu kết bạn
  }
  huyBanBe(userId: string):void{
    console.log('Đã hủy kết bạn');
    this.socket.emit('unfriend', userId); //userId người muốn hủy kết bạn
  }

  //Bắt sự kiện kết bạn

  nhanskThemBan(callback: (data: any) => void):void{
    this.socket.on('received-friend-request', callback); //data là thông tin người gửi sự kiện di nguyên cái user
  }
  nhanskHuyKetBan(callback: (data: any) => void):void{
    this.socket.on('reqFriend-canceled', callback); //data là userId người hủy kết bạn
  }
  nhanskDongYKetBan(callback: (data:any) => void):void {
    this.socket.on('accepted-friend-request', callback); //data là thông tin người gửi sự kiện di nguyên cái user
  }
  nhanskTuChoiKetBan(callback: (data:any) => void):void {
    this.socket.on('rejected-friend-request', callback); //data là userId người hủy kết bạn
  }
  nhanskHuyBanBe(callback: (data:any) => void):void {
    this.socket.on('unfriended', callback); //data là userId người đã hủy kết bạn
  }

  //off sự kiện socket kết bạn

  offNhanSkThemBan(): void {
    this.socket.off('received-friend-request');
  }
  offNhanSkHuyKetBan(): void {
    this.socket.off('reqFriend-canceled');
  }
  offNhanSkDongYKetBan(): void {
    this.socket.off('accepted-friend-request');
  }
  offNhanSkTuChoiKetBan(): void {
    this.socket.off('rejected-friend-request');
  }
  offNhanskHuyBanBe():void{
    this.socket.off('unfriended');
  }
  /**--------------------Kết bạn socket -------------*/
}