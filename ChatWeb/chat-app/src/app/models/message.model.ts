import { Userr } from "./user.model";
import { ChatRoom } from "./chatRoom.model";
// export interface Messagee {
//     _id: string;
//     chatId: ChatRoom;
//     sendID: Userr;
//     replyToMessage?: Messagee | null; // optional vì default là null
//     content: {
//       type: 'text' | 'file' | 'media';
//       text: string;
//       media: string[]; // array URL
//       files: string[]; // array URL
//     };
//     recall: '0' | '1' | '2'; // dùng union type cho rõ ràng
//     createdAt?: Date;
//     updatedAt?: Date;
//   }
  
export interface Messagee {
  _id: string;
  chatId: string;
  sendID: string;
  replyToMessage?: string | null;
  content: {
    type: 'text' | 'file' | 'media';
    text: string;
    media: string[]; // array of URLs
    files: string[]; // array of file names/URLs
  };
  recall: '0' | '1' | '2';
  createdAt: string;
  updatedAt: string;
  __v?: number;
}
