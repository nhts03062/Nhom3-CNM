import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class ApiService {
    private baseUrl = 'http://172.20.10.3:5000/api';

    getApiUrl(endpoint: string): string {
        return `${this.baseUrl}/${endpoint}`;
    }
}