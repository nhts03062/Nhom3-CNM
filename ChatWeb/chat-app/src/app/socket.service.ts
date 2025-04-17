import { Injectable } from '@angular/core';
import {io ,Socket} from 'socket.io-client'

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket : Socket;

  constructor() { 
    this.socket = io('http://localhost:5000')
  }

  joinRoom(userId: string) :void {
    this.socket.emit("join", userId)
    console.log('Người dùng đã tham gia vào phòng chat')
  }

  onNewMessage(callback: (message : any) => void): void{
    this.socket.on("new-message",callback)
  }

  onNewChatRoom(callback: (chatRoom : any) =>void): void{
    this.socket.on("new-chatRoom",callback)
  }

  onNewRecall(callback : (recallmessage : any) => void) : void{
    this.socket.on('recall',callback)
  }


}import { from } from 'rxjs';

