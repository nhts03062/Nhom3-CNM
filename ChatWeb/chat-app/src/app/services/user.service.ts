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
    console.log('tokenn', token)
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
  updateUser(userData: Partial<Userr>): Observable<Userr> {
    return this.http.put<Userr>(`${this.apiUrl}/updateuser`, userData, {
      headers: this.getHeaders()
    });
  }

  
  getUserById(userId: string): Observable<Userr> {
    return this.http.get<Userr>(`${this.apiUrl}/${userId}`, {
      headers: this.getHeaders()
    });
  }

  addFriend(userId: string): Observable<Userr> {
    return this.http.post<Userr>(`${this.apiUrl}/sendreqfriend`, { userId }, {
      headers: this.getHeaders()
    });
  }

  requestResponse(code: string, userId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/resfriend/${code}`, { userId }, {
      headers: this.getHeaders()
    });
  }
  

  unFriendRequest(): Observable<Userr[]> {
    return this.http.delete<Userr[]>(`${this.apiUrl}/unfriend`, {
      headers: this.getHeaders()
    });
  }
}

