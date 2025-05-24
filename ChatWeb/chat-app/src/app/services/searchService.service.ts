import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  
  constructor(private http: HttpClient, private apiService: ApiService) {}

  getHeaders(): HttpHeaders {
    const token = sessionStorage.getItem('token');
    return new HttpHeaders({ 'Authorization': `${token}` });
  }

  searchUsers(searchTerm: string): Observable<any> {
    const url = this.apiService.getApiUrl(`search`);
    const body = { searchTerm };
    return this.http.post<any>(url, body, { headers: this.getHeaders() });
  }

}
