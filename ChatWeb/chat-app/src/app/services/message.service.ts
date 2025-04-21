import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Messagee } from '../models/message.model';  // Make sure to import the `Messagee` interface

@Injectable({
  providedIn: 'root',
})
export class MessageService {
  private apiUrl = 'http://localhost:5000/api/message';  // Base API URL for message-related endpoints

  constructor(private http: HttpClient) {}

  // Get headers for the request, including the token
  getHeaders(): HttpHeaders {
    const token = sessionStorage.getItem('token');
    return new HttpHeaders({ 'Authorization': `${token}` });
  }

  // Send a new message
  createMessage(chatId: string, content: any, files?: FormData): Observable<Messagee> {
    const body = { chatId, content };
    const headers = this.getHeaders();

    if (files) {
      // If files are present, use FormData to handle file uploads
      return this.http.post<Messagee>(this.apiUrl, files, {
        headers,
        params: { chatId },
      });
    } else {
      // Send message without files
      return this.http.post<Messagee>(this.apiUrl, body, { headers });
    }
  }

  // Get all messages in a chat room by ID
  getAllMessages(chatId: string): Observable<Messagee[]> {
    const headers = this.getHeaders();
    return this.http.get<Messagee[]>(`${this.apiUrl}/${chatId}`, { headers });
  }

  // Recall a message (either by the user or for everyone)
  recallMessage(code: string, messageId: string): Observable<Messagee> {
    const headers = this.getHeaders();
    const body = { _id: messageId };
    return this.http.post<Messagee>(`${this.apiUrl}/recall/${code}`, body, { headers });
  }

  // Reply to a message
  replyToMessage(messageId: string, replyContent: string): Observable<Messagee> {
    const body = { _id: messageId, content: replyContent };
    const headers = this.getHeaders();
    return this.http.post<Messagee>(`${this.apiUrl}/reply/`, body, { headers });
  }
}
