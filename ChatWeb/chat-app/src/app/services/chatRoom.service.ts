import { Injectable, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Userr } from '../models/user.model';
import { Messagee } from '../models/message.model';
import { ChatRoom } from '../models/chatRoom.model';

@Injectable({ providedIn: 'root' })

export class ChatRoomService{
  private apiUrl = 'http://localhost:5000/api/chatroom';
  users: Userr [] =[];
  conversations: Messagee [] = [];
  chatRoom : ChatRoom [] = [];
  idNguoiDungHienTai: string | null  = sessionStorage.getItem('userId')

  constructor(private http: HttpClient) {}

  getHeaders(): HttpHeaders {
    const token = sessionStorage.getItem('token');
    return new HttpHeaders({ 'Authorization': `${token}` });
  }
  createChatRoom(
    members: string[],
    chatRoomName?: string,
    image?: string
  ): Observable<ChatRoom> {
    const body = {
      chatRoomName,
      members,
      image
    };
  
    return this.http.post<ChatRoom>(`${this.apiUrl}/`, body, {
      headers: this.getHeaders()
    });
  }
  
  getChatRooms(): Observable<ChatRoom[]> {
    return this.http.get<ChatRoom[]>(`${this.apiUrl}/`, {
      headers: this.getHeaders()
    });
  }
  
  getChatRoomsById(chatRoomId:string): Observable<ChatRoom> {
    return this.http.get<ChatRoom>(`${this.apiUrl}/${chatRoomId}`, {
      headers: this.getHeaders()
    });
  }

  updateChatRoom() :Observable<ChatRoom>{
    return this.http.put<ChatRoom>(`${this.apiUrl}`, {
      headers: this.getHeaders()
    });
  }

  chatRoomInvite() :Observable<ChatRoom>{
    return this.http.post<ChatRoom>(`${this.apiUrl}/invite`, {
      headers: this.getHeaders()
    });
  }

  deleteChatRoom(chatRoomId:string):Observable<ChatRoom>{
    return this.http.delete<ChatRoom>(`${this.apiUrl}/${chatRoomId}`, {
      headers: this.getHeaders()
    });
  }

}
