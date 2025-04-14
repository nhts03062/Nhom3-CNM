import { Userr } from './user.model';

export interface ChatRoom {
  // timeAgo: string;
  _id: string;
  members: Userr[];
  isGroupChat: boolean;
  chatRoomName?: string | null;
  groupAvatarUrl?: string | 'https://static.vecteezy.com/system/resources/previews/026/019/617/original/group-profile-avatar-icon-default-social-media-forum-profile-photo-vector.jpg'
}