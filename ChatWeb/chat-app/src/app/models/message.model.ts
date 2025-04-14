export interface Message {
    id: string;
    senderId: string;
    content: string;
    type: 'text' | 'image' | 'video' | 'file';
    timestamp: Date;
    readBy: string[]; // userIds
  }
  