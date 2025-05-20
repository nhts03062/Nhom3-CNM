import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket;
  constructor() {
    // this.socket = io('https://chat.fff3l.click');
    this.socket = io('http://localhost:5000');

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

 /**--------------------Tin nhắn socket -------------*/
//Gửi sự kiện tin nhắn
sendMessage(chatRoomId: string, message: any): void {
  this.socket.emit('create-message', { chatRoomId, data: message });
}
xoaTinNhan(chatRoomId: string, data: any): void {
  this.socket.emit('delete-message', { chatRoomId, data });
}

//Nhận sự kiện tin nhắn
  nhanskXoaTinNhan(callback: (recallmessage: any) => void): void {
    this.socket.on('message-deleted', callback);
  }
  onNewMessage(callback: (message: any) => void): void {
    this.socket.on("message-created", callback);
  }

  //off sự kiện tin nhắn
  offNhanskXoaTinNhan():void {
    this.socket.off('message-deleted');
  }
  offOnNewMessage(): void {
    this.socket.off("message-created");
  }
  /**--------------------Tin nhắn socket -------------*/


 /**--------------------Phòng chat socket -------------*/
 //Gửi sự kiện phòng chat
 joinRoom(userId: string): void {
  this.socket.emit("join", userId);
  console.log('User joined room:', userId);
}
thamGiaPhongChat(chatRoomId:string) :void{
  this.socket.emit('join-chatRoom',chatRoomId)
  console.log('gửi sự kiện tham gia phòng chat');
}
taoPhongChat(chatRoomId:string,data:any) :void{
  this.socket.emit('create-chatRoom',chatRoomId,data); //chatRoomId là id của phòng chat, data là object chatRoom
  console.log('gửi sự kiện tạo phòng chat');
}
capNhatPhongChat(chatRoomId:string,data:any):void{
  this.socket.emit('update-chatRoom',{chatRoomId,data}); //chatRoomId là id của phòng chat, data là object chatRoom
  console.log('gửi sự kiện cập nhật phòng chat');
}
xoaPhongChat(chatRoomId: string): void {
  this.socket.emit('delete-chatRoom', chatRoomId);
}
moiVaoPhongChat(chatRoomId: string, data: any): void {
  this.socket.emit('invite-user', { chatRoomId, data }); //chatRoomId là id của phòng chat, data là object user dc mời
  console.log('đã gửi lời mời vào phòng chat');
}
roiPhongChat(chatRoomId: string): void{
  this.socket.emit('leave-chatRoom', chatRoomId); //chatRoomId là id của phòng chat
  console.log('gửi sự kiện rời phòng chat');
}

//Nhận sự kiện phòng chat
nhanskTaoPhongChat(callback: (data:any) => void):void{
  this.socket.on('roomChat-created', callback); //data là object chatRoom
  console.log('Nhận sự kiện tạo phòng chat');
}
nhanskCapNhatPhongChat(callback: (data:any) => void):void{
  this.socket.on('chatRoom-updated', callback);
  console.log('Nhận sự kiện cập nhật phòng chat');
}
nhanskXoaPhongChat(callback: (chatRoomid: string) => void): void{
  this.socket.on('chatRoom-deleted',callback)
}
nhanskMoiVaoPhongChat(callback: (data:any) => void):void{
  this.socket.on('user-invited', callback); //data là object user dc mời
}
nhanskRoiPhongChat(callback: (chatRoomId:string, userId:string) =>void):void{
  this.socket.on('user-left', callback); //data là object chatRoom
  console.log('Nhận sự kiện rời phòng chat');
}

//off sk phòng chat
offNhanskTaoPhongChat(): void {
  this.socket.off('roomChat-created');
}
offNhanskCapNhatPhongChat(): void {
  this.socket.off('chatRoom-updated');
}
offNhanskXoaPhongChat():void{
  this.socket.off('chatRoom-deleted');
}
offNhanskMoiVaoPhongChat():void{
  this.socket.off('user-invited');
}
offNhanskRoiPhongChat():void{
  this.socket.off('user-left');
}


  /**--------------------Phòng chat socket -------------*/
  


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