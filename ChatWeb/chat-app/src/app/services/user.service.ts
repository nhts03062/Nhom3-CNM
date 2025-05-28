import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Userr } from '../models/user.model';
import { Messagee } from '../models/message.model';
import { ApiService } from './api.service';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UserService {
  users: Userr[] = [];
  conversations: Messagee[] = [];
  idNguoiDungHienTai: string | null = sessionStorage.getItem('userId');

  constructor(private http: HttpClient, private apiService: ApiService) { }

// Observable để theo dõi trạng thái người dùng
  private userSource = new BehaviorSubject<any>(null); 
  user$ = this.userSource.asObservable();

  setUser(user: any) {
    this.userSource.next(user);
  }

  getUserValue() {
    return this.userSource.getValue();
  }
//------------------------------
  getHeaders(): HttpHeaders {
    const token = sessionStorage.getItem('token');
    return new HttpHeaders({ 'Authorization': `${token}` });
  }

  getUsers(): Observable<Userr[]> {
    return this.http.get<Userr[]>(this.apiService.getApiUrl('user/alluser'), {
      headers: this.getHeaders()
    });
  }

  getFriends(): Observable<Userr[]> {
    return this.http.get<Userr[]>(this.apiService.getApiUrl('user/allfriend'), {
      headers: this.getHeaders()
    });
  }

  updateUser( name:string, avatarUrl:string, phone:string, address:string): Observable<Userr> {
    const body = {name, avatarUrl, phone, address};
    return this.http.put<Userr>(this.apiService.getApiUrl('user/updateuser'), body, {
      headers: this.getHeaders()
    });
  }

  getUserById(userId: string): Observable<Userr> {
    return this.http.get<Userr>(this.apiService.getApiUrl(`user/${userId}`), {
      headers: this.getHeaders()
    });
  }

  addFriend(userId: string): Observable<Userr> {
    const body = { userId };
    return this.http.post<Userr>(this.apiService.getApiUrl('user/sendreqfriend'), body, {
      headers: this.getHeaders()
    });
  }

  requestResponse(code: string, userId: string): Observable<Userr[]> {
    const body = { userId };
    return this.http.post<Userr[]>(this.apiService.getApiUrl(`user/resfriend/${code}`), body, {
      headers: this.getHeaders()
    });
  }
  cancelRequestFriend(userId: string): Observable<Userr>{
    const body = {userId};
    return this.http.post<Userr>(this.apiService.getApiUrl('user/cancelreqfriend'), body, {
      headers: this.getHeaders()
    });
  }

  unFriendRequest(friendId: string): Observable<Userr> {
    const options = {
      headers: this.getHeaders(),
      body: { friendId }
    };
    return this.http.delete<Userr>(this.apiService.getApiUrl('user/unfriend'), options);
  }
  changePassword(oldPassword: string, newPassword: string): Observable<any[]> {
    const body = { oldPassword, newPassword };
    return this.http.post<Userr[]>(this.apiService.getApiUrl('user/changepassword'), body, {
      headers: this.getHeaders()
    });
  }
}
