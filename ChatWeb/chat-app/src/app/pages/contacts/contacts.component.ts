import { Component, OnInit, TrackByFunction } from '@angular/core';
import { ModalComponent } from '../modal/modal.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalProfileComponent } from '../profile/modal-profile/modal-profile.component';
import { UserService } from '../../services/user.service';
import { User } from '../../models/user.model';
import { firstValueFrom, Observable } from 'rxjs';
import { ChatRoomService } from '../../services/chatRoom.service';
import { SearchService } from '../../services/searchService.service';
import { Router } from '@angular/router';
import { ChatRoom } from '../../models/chatRoom.model';
import { defaultAvatarUrl, defaulGrouptAvatarUrl } from '../../contants';
import { SocketService } from '../../socket.service';


@Component({
  standalone: true,
  selector: 'app-contacts',
  imports: [ModalComponent, CommonModule, FormsModule, ModalProfileComponent],
  templateUrl: './contacts.component.html',
  styleUrls: ['./contacts.component.css']
})

export class ContactsComponent implements OnInit {
  users: User[] = [];
  showModal = false;
  showProfileModal = false;
  selectedTab: number = 0;
  defaultAvatarUrl = defaultAvatarUrl;
  defaulGrouptAvatarUrl = defaulGrouptAvatarUrl;
  tabTitles: string[] = ['Danh sách bạn bè', 'Danh sách nhóm', 'Lời mời'];
  searchTerm: string = '';
  searchTermGroup: string = '';
  friendsList: User[] = [];
  groupsList: ChatRoom[] = [];
  user: User | undefined;
  userMap: { [id: string]: User } = {};
  currentUser: User | undefined;
  foundUser: User | undefined;
  friendRequests: User[] = [];
  sentRequests: User[] = [];
  idNguoiDungHienTai: string | null = sessionStorage.getItem('userId');
  ban: string = 'ban';
  // sentRequests: User[] = [];


  constructor(private userService: UserService,
    private chatRoomService: ChatRoomService,
    private searchService: SearchService,
    private router: Router,
    private socketService: SocketService,
  ) { }

  ngOnInit(): void {
    this.loadFriends();
    this.loadUser();
    this.loadChatRooms();

    const userId = sessionStorage.getItem('userId');
    if (userId) {
      // Đảm bảo người dùng tham gia phòng socket của họ sau khi refresh
      this.socketService.joinRoom(userId);
    }

    this.socketService.nhanskThemBan((data:any) =>{
      console.log('Đã nhận sự kiện thêm bạn')
      this.friendRequests.push(data)
    })

    this.socketService.nhanskHuyKetBan((data:any) =>{
      console.log('Đã nhận sự kiện hủy kết bạn' ,data)
      this.friendRequests = this.friendRequests.filter(user => user._id !== data)
    })

    this.socketService.nhanskDongYKetBan((data:any) =>{
      console.log('Đã nhận sự kiện đồng ý kết bạn')
      this.friendsList.push(data)
    })
    this.socketService.nhanskHuyBanBe((data:any) =>{
      console.log('Đã nhận sự kiện hủy bạn bè')
      this.friendsList = this.friendsList.filter(user => user._id !== data)
    })
  }

  ngOnDestroy(): void {
    this.socketService.offNhanSkThemBan();
    this.socketService.offNhanSkHuyKetBan();
    this.socketService.offNhanSkDongYKetBan();

    this.socketService.offNhanskHuyBanBe();
  }

  toggleModal() {
    this.showModal = !this.showModal;
  }
  toggleProfileModal() {
    this.showProfileModal = !this.showProfileModal;
  }

  onSelectTab(tab: number) {
    this.selectedTab = tab;
  }


  selectedFriend: User | undefined;;

  selectFriend(friend: any): void {
    this.selectedFriend = friend;
    console.log("🚀 ~ ContactsComponent ~ selectFriend ~ this.selectedFriend:", this.selectedFriend)
    if (this.selectedFriend) {
      this.toggleProfileModal(); // Show the modal
    }
  }
  /**---start----load thông tin khi vừa mở lên------------ */
  
  loadUser(): void {
    const userId = sessionStorage.getItem('userId');
    console.log("🚀 ~ ContactsComponent ~ loadUser ~ userId:", userId)
    if (userId) {
      this.userService.getUserById(userId).subscribe({
        next: (user) => {
          this.currentUser = user;
          this.friendRequests = this.currentUser.friendRequestsReceived;
          this.sentRequests = this.currentUser?.requestfriends;
          console.log("Current User:", this.currentUser);
        },
        error: (err) => console.error("Failed to load user:", err)
      });
    }
  }

  loadFriends(): void {
    console.log("🔄 Starting to load friends...");

    this.userService.getFriends().subscribe({
      next: (friends: User[]) => {
        console.log("📥 Friends loaded:", friends);
        this.friendsList = friends; // Store the list of friends directly
      },
      error: err => {
        console.error("❌ Failed to load friends:", err);
      }
    });
  }

  loadChatRooms(): void {
    this.chatRoomService.getChatRooms().subscribe({
      next: (rooms: ChatRoom[]) => {
        console.log("📥 rooms loaded:", rooms);
        this.groupsList = rooms;
      },
      error: err => {
        console.error("❌ Failed to load rooms:", err);
      }
    });
  }

    /**-------load thông tin khi vừa mở lên----end-------- */


    /**----------start--------------Xử lý thêm---------------------*/

  get filteredFriends(): User[] {
    return this.friendsList.filter(friend =>
      friend.name.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }
  get filteredGroups(): ChatRoom[] {
    return this.groupsList.filter(room =>
      room.chatRoomName?.toLowerCase().includes(this.searchTermGroup.toLowerCase())
    );
  }

  // Navigate directly to the chat room
  navigateToChatRoom(chatRoomId: string): void {
    console.log("Navigating to chat room with ID:", chatRoomId);
    this.router.navigate([`/chat-room/${chatRoomId}`]);
  }

   /**------------------------Xử lý thêm-----------end----------*/

  /**-----start-------Phần yêu cầu kết bạn -----------------*/

  async requestResponse(code: string, userId: string): Promise<void> {
    try {
      const response = await firstValueFrom(this.userService.requestResponse(code, userId));
      console.log('✅ Request accepted response:', response);
      if(code == '1'){
        this.userService.getUserById(userId).subscribe({
          next: async (res) =>{
            this.friendsList.push(res);
            this.friendRequests = this.friendRequests.filter(user => user._id !== userId);

            const thongTinUser = await firstValueFrom(this.userService.getUserById(this.idNguoiDungHienTai!));
            this.socketService.dongYKetBan(userId, thongTinUser);
            console.log('Đã gửi sk socket thêm bạn')

            //tạo phòng chat
            this.chatRoomService.createChatRoom({
              members: [this.idNguoiDungHienTai!, userId],
            }).subscribe({
              next: (room) => {
                console.log('Đã tạo phòng chat:', room);
                this.socketService.taoPhongChat(room._id, room); // Gửi sự kiện tạo phòng chat
                // console.log('chatRoom duoc gui qua soket',room)
                console.log('Đã gửi sk socket mời vào phòng chat');
              },
              error: (err) => {
                console.error('Lỗi tạo phòng chat ở contacts', err);
              }
            });
          },
          error: (err) => {
            console.error('Failed to load user:', err);
          }
        });
      }else{
        this.friendRequests = this.friendRequests.filter(user => user._id !== userId);
        this.socketService.tuChoiKetBan(userId);
      }
      
    } catch (err) {
      console.error("Request failed:", err);
      throw err;
    }
  }
  

   /**------------Phần yêu cầu kết bạn -----end------------*/

  /**-----start-------Phần xử lý trong bạn bè -----------------*/

  unFriend(friendId: string): void {
    this.userService.unFriendRequest(friendId).subscribe({
      next: (res: User) => {
        this.friendsList = this.friendsList.filter(friend => friend._id !== friendId);
        this.socketService.huyBanBe(friendId);
        console.log('Đã gửi sk socket hủy bạn')
      },
      error: (err) => {
        console.error("Failed to unfriend:", err);
      }
    });
  }

  huyYeuCauKetBan(userId: string) {
    this.userService.cancelRequestFriend(userId).subscribe({
      next: (res: any) => {
        this.user = res;
        this.socketService.huyKetBan(userId);
        alert("✅ Đã hủy yêu cầu kết bạn!");
        console.log("Cancel request sent to:", this.user);
      },
      error: (err) => {
        console.error('Lỗi khi hủy yêu cầu kết bạn:', err);
        alert("❌ Hủy yêu cầu kết bạn thất bại!");
      }
    });
  }
  /**------------------------Phần xử lý trong bạn bè----------end----------*/
  


  


}