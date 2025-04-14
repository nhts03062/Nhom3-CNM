export interface User {
    id: string;
    name: string;
    avatarUrl?: string |null;
    online: boolean;
    lastSeen: Date;
    address?:string;
    email:string;
    phone:string;
    friends:string[];
  }
  