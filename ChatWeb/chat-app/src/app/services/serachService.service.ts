import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private apiUrl = 'http://localhost:5000/api/search';
  

  constructor(private http: HttpClient) {}

  getHeaders(): HttpHeaders {
    const token = sessionStorage.getItem('token');
    return new HttpHeaders({ 'Authorization': `${token}` });
  }

  searchUsers(searchTerm: string): Observable<any> {
    return this.http.post<any>(this.apiUrl, { searchTerm: searchTerm }, { headers: this.getHeaders() });
  }
}
