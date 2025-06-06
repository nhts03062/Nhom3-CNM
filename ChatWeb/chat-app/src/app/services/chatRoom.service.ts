import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { Userr } from '../models/user.model';
import { Messagee } from '../models/message.model';
import { ChatRoom } from '../models/chatRoom.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class ChatRoomService {
  users: Userr[] = [];
  conversations: Messagee[] = [];
  chatRoom: ChatRoom[] = [];
  idNguoiDungHienTai: string | null = sessionStorage.getItem('userId');

  constructor(private http: HttpClient, private apiService: ApiService) { }

  getHeaders(): HttpHeaders {
    const token = sessionStorage.getItem('token');
    return new HttpHeaders({ 'Authorization': `${token}` });
  }

  createChatRoom(roomData: { members: string[], chatRoomName?: string, image?: string }): Observable<ChatRoom> {
    return this.http.post<ChatRoom>(this.apiService.getApiUrl('chatroom'), roomData, {
      headers: this.getHeaders()
    });
  }

  getChatRooms(): Observable<ChatRoom[]> {
    return this.http.get<ChatRoom[]>(this.apiService.getApiUrl('chatroom'), {
      headers: this.getHeaders()
    });
  }

  getChatRoomById(chatRoomId: string): Observable<ChatRoom> {
    return this.http.get<ChatRoom>(this.apiService.getApiUrl(`chatroom/${chatRoomId}`), {
      headers: this.getHeaders()
    });
  }

  updateChatRoom(data: {
    chatRoomId: string;
    chatRoomName?: string;
    members?: string[];
    image?: string;
    newAdminId?: string;
  }): Observable<ChatRoom> {
    return this.http.put<ChatRoom>(
      this.apiService.getApiUrl('chatroom'),
      data,
      { headers: this.getHeaders() }
    );
  }
  

  inviteToChatRoom(data:{userId: string, chatRoomId: string}): Observable<any> {
    return this.http.post<any>(
      this.apiService.getApiUrl('chatroom/invite'),
      data,
      { headers: this.getHeaders() }
    );
  }

  addMembersChatRoom(data:{userIds: string[], chatRoomId: string}): Observable<any> {
    return this.http.post<any>(
      this.apiService.getApiUrl('chatroom/invitemany'),
      data,
      { headers: this.getHeaders() }
    );
  }
  roiPhongChat(chatRoomId:string):Observable<any>{
    return this.http.delete<any>(
      this.apiService.getApiUrl(`chatroom/leave/${chatRoomId}`),
      { headers: this.getHeaders() }
    );
  }

  deleteChatRoom(chatRoomId: string): Observable<ChatRoom> {
    return this.http.delete<ChatRoom>(this.apiService.getApiUrl(`chatroom/${chatRoomId}`), {
      headers: this.getHeaders()
    });
  }

  
  private selectedRoomId = new BehaviorSubject<string | null>(null);
  selectedRoomId$ = this.selectedRoomId.asObservable();

  setRoomId(id: string) {
    this.selectedRoomId.next(id);
  }
}