import { Message } from './message.model';

export interface Conversation {
  // timeAgo: string;
  id: string;
  participantIds: string[];
  messages: Message[];
  lastMessage?: Message;
  isGroup: boolean;
  groupName?: string;
  groupAvatarUrl?: string;
}
