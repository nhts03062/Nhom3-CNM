import { User } from '../models/user.model';
import { Message } from '../models/message.model';
import { Conversation } from '../models/conversation.model';

export const sampleUsers: User[] = [
  {
    id: 'u0',
    name: 'Alex Carter',
    email: 'eve.holt@reqres.in',
    phone: '+1-555-123-4567',
    address: '123 Main Street, Springfield, IL',
    avatarUrl: 'https://randomuser.me/api/portraits/men/70.jpg',
    friends: ['u1', 'u2'],
    online: true,
    lastSeen: new Date()
  },
  {
    id: 'u1',
    name: 'Megan Leib',
    avatarUrl: 'https://randomuser.me/api/portraits/women/44.jpg',
    online: true,
    lastSeen: new Date(),
    address: '456 Elm Street, New York, NY',
    email: 'megan.leib@example.com',
    phone: '+1-555-101-2020',
    friends: ['u0','u2']
  },
  {
    id: 'u2',
    name: 'John Doe',
    avatarUrl: 'https://robohash.org/36.png?set=set4',
    online: false,
    lastSeen: new Date(Date.now() - 5 * 60 * 1000),
    address: '789 Oak Avenue, Los Angeles, CA',
    email: 'john.doe@example.com',
    phone: '+1-555-303-4040',
    friends: ['u0','u1']
  },
  {
    id: 'u3',
    name: 'Lara Croft',
    avatarUrl: 'https://randomuser.me/api/portraits/women/45.jpg',
    online: true,
    lastSeen: new Date(),
    address: '321 Raider Road, London, UK',
    email: 'lara.croft@example.com',
    phone: '+44-20-1234-5678',
    friends: [] // not friends with anyone in this sample
  }
];


export const sampleMessagesConvo1: Message[] = [
  {
    id: 'm1',
    senderId: 'u0',
    content: "Hey!",
    type: 'text',
    timestamp: new Date(Date.now() - 8 * 60 * 1000),
    readBy: ['u1']
  },
  
  {
    id: 'm2',
    senderId: 'u2',
    content: "Hi!!",
    type: 'text',
    timestamp: new Date(Date.now() - 10 * 60 * 1000),
    readBy: ['u0']
  },
  {
    id: 'm5',
    senderId: 'u0',
    content: "Hey! It's been a while 😄",
    type: 'text',
    timestamp: new Date(Date.now() - 8 * 60 * 1000),
    readBy: ['u1']
  },
  {
    id: 'm6',
    senderId: 'u2',
    content: "Yeah! When can we catch up?",
    type: 'text',
    timestamp: new Date(Date.now() - 10 * 60 * 1000),
    readBy: ['u0']
  },
];

export const sampleMessagesConvo2: Message[] = [
  {
    id: 'm3',
    senderId: 'u3',
    content: "Hi, I'm Lara Croft. Nice to meet you",
    type: 'text',
    timestamp: new Date(Date.now() - 20 * 60 * 1000),
    readBy: ['u0'] 
  },
  {
    id: 'm4',
    senderId: 'u0',
    content: "Nice to meet you too!",
    type: 'text',
    timestamp: new Date(Date.now() - 19 * 60 * 1000),
    readBy: [] 
  }
];

export const sampleMessagesConvo3: Message[] = [
  {
    id: 'm7',
    senderId: 'u1',
    content: "Hi, how are you?",
    type: 'text',
    timestamp: new Date(Date.now() - 20 * 60 * 1000),
    readBy: ['u0'] 
  },
  {
    id: 'm4',
    senderId: 'u0',
    content: "Can't be better! What are you doing tonight? Want to go take a drink?",
    type: 'text',
    timestamp: new Date(Date.now() - 19 * 60 * 1000),
    readBy: [] 
  }
];

export const sampleConversations: Conversation[] = [
  {
    id: 'c1',
    participantIds: ['u0', 'u2'],
    messages: sampleMessagesConvo1,
    lastMessage: sampleMessagesConvo1[sampleMessagesConvo1.length - 1],
    isGroup: false
  },
  {
    id: 'c2',
    participantIds: ['u0','u3'],
    messages: sampleMessagesConvo2,
    lastMessage: sampleMessagesConvo2[sampleMessagesConvo2.length - 1],
    isGroup: false
  },
  {
    id: 'c3',
    participantIds: ['u0','u1'],
    messages: sampleMessagesConvo3,
    lastMessage: sampleMessagesConvo3[sampleMessagesConvo3.length - 1],
    isGroup: false
  }
];
