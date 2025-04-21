import { Injectable, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Userr } from '../models/user.model';
import { Messagee } from '../models/message.model';
import { ChatRoom } from '../models/chatRoom.model';

@Injectable({ providedIn: 'root' })

export class SearchService{
  private apiUrl = 'http://localhost:5000/api/search';
  users: Userr [] =[];
  conversations: Messagee [] = [];
  chatRoom : ChatRoom [] = [];
  idNguoiDungHienTai: string | null  = sessionStorage.getItem('userId')

  constructor(private http: HttpClient) {}

  getHeaders(): HttpHeaders {
    const token = sessionStorage.getItem('token');
    return new HttpHeaders({ 'Authorization': `${token}` });
  }

  // Tìm kiếm thành viên trong nhóm
  search(searchTerm: string): Observable<Userr[]> {
    if (!searchTerm) {
      throw new Error('Chưa nhập thông tin để tìm');
    }
    return this.http.post<Userr[]>(`${this.apiUrl}/`, { searchTerm }, { headers: this.getHeaders() });
  }

  
}