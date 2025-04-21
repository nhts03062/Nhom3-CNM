import { Injectable, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { forkJoin, Observable } from 'rxjs';
import { Userr } from '../models/user.model';
import { Messagee } from '../models/message.model';

@Injectable({ providedIn: 'root' })

export class UserService{
  private apiUrl = 'http://localhost:5000/api/user';
  users: Userr [] =[];
  conversations: Messagee [] = [];
  idNguoiDungHienTai: string | null  = sessionStorage.getItem('userId')

  constructor(private http: HttpClient) {}

  getHeaders(): HttpHeaders {
    const token = sessionStorage.getItem('token');
    return new HttpHeaders({ 'Authorization': `${token}` });
  }
  getUsers(): Observable<Userr[]> {
    return this.http.get<Userr[]>(`${this.apiUrl}/alluser`, {
      headers: this.getHeaders()
    });
  }

  getFriends(): Observable<Userr[]> {
    return this.http.get<Userr[]>(`${this.apiUrl}/allfriend`, {
      headers: this.getHeaders()
    });
  }
  updateUser(): Observable<Userr[]> {
    return this.http.put<Userr[]>(`${this.apiUrl}/updateuser`, {
      headers: this.getHeaders()
    });
  }
  
  getUserById(userId:string): Observable<Userr> {
    return this.http.get<Userr>(`${this.apiUrl}/${userId}`, {
      headers: this.getHeaders()
    });    
  }

  addFriend(userId: string): Observable<Userr> {
    const body = { userId };
    return this.http.post<Userr>(`${this.apiUrl}/sendreqfriend`, body, {
      headers: this.getHeaders()
    });
  }
  

  requestResponse(code: string, userId:string): Observable<Userr[]> {
    const body = { userId };
    return this.http.post<Userr[]>(`${this.apiUrl}/resfriend/${code}`,body, {
      headers: this.getHeaders()
    });
  }

  unFriendRequest(friendId: string): Observable<Userr> {
    const options = {
      headers: this.getHeaders(),
      body: { friendId }  // Ensure the body is passed correctly
    };
    return this.http.delete<Userr>(`${this.apiUrl}/unfriend`, options);
  }
  
  
}

