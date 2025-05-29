// export interface Userr {
//     find(arg0: (u: any) => boolean): any;
//     _id: string;
//     name: string;
//     avatarUrl?: string;
//     online: boolean;
//     address?:string;
//     email:string;
//     phone:string;
//     friends:string[];
//   }

export interface User {
  _id: string;
  name: string;
  email: string;
  password: string;
  isVerified: boolean;
  phone: string;
  address: string;
  avatarUrl: string;
  requestfriends: string[]; // array of user IDs
  friendRequestsReceived: string[];
  friends: string[];
  // friends: User[];
  // friendRequestsReceived: User[];
  // requestfriends: User[];
  createdAt: string;
  updatedAt: string;
  __v?: number;
  online?: boolean;
}
