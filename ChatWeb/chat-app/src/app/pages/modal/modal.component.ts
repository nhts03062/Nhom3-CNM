import {SearchService} from '../../services/serachService.service'
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { UserService } from '../../services/user.service';
import { FormsModule } from '@angular/forms';
import { forkJoin, map, Observable, filter } from 'rxjs';
import { ModalProfileComponent } from '../profile/modal-profile/modal-profile.component';
import { Userr } from '../../models/user.model';
import { ChatRoomService } from '../../services/chatRoom.service';
import { Router } from '@angular/router';
import { SocketService } from '../../socket.service';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule, /*ModalProfileComponent,*/FormsModule],
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.css']
})
export class ModalComponent implements OnInit {

  @Input() isOpen = false;
  @Input() title = '';
  @Input() userIdNguoiDungHienTai: string | null = sessionStorage.getItem('userId');
  @Output() closeModal = new EventEmitter<void>();
  // selectedEmail: string | null = null;
  showProfileModal: boolean = false;
  users!:Userr[];
  defaultAvatarUrl = 'https://i1.rgstatic.net/ii/profile.image/1039614412341248-1624874799001_Q512/Meryem-Laval.jpg';
  defaulGrouptAvatarUrl= 'https://static.vecteezy.com/system/resources/previews/026/019/617/original/group-profile-avatar-icon-default-social-media-forum-profile-photo-vector.jpg';
  user: Userr | undefined;

  // tab của kết bạn
  searchError: string | null = null;
  danhSachNguoiDungSauKhiTimKiem: any[] = [];
  isSearching = false;
  userNguoiDungHienTai: Userr | null = null;

  

  activeTab: 'friend' | 'group' = 'friend';
  searchTerm: string = '';
  currentUserId = sessionStorage.getItem('userId');
  groupName = '';

  constructor(private userService : UserService,
    private chatRoomService: ChatRoomService,
  private SearchService: SearchService,
    private router: Router,
  private socketService: SocketService){}

  ngOnInit(): void {

    this.loadFriends();

    const userId = sessionStorage.getItem('userId');
    if (userId) {
      // Đảm bảo người dùng tham gia phòng socket của họ sau khi refresh
      this.socketService.joinRoom(userId);
    }

    if(this.danhSachNguoiDungSauKhiTimKiem){
      //sk socket thêm bạn
      this.socketService.nhanskThemBan((data: any) =>{
        console.log('đã nhận sự kiện thêm bạn', data)
      this.danhSachNguoiDungSauKhiTimKiem = this.danhSachNguoiDungSauKhiTimKiem.map((user: any) =>{
        if(user._id.toString() === data._id.toString()){
          return{ 
            ...user,
            friendRequestsReceived: [...user.friendRequestsReceived, this.userIdNguoiDungHienTai]
          }
        }
        return user;
      })})
      //sk socket huy ket ban
      this.socketService.nhanskHuyKetBan((data:any) =>{
        console.log('Đã nhận sự kiện hủy kết bạn', data)
        this.danhSachNguoiDungSauKhiTimKiem = this.danhSachNguoiDungSauKhiTimKiem.map((user: any) =>{
          if(user._id.toString() === data.toString()){
            return{ 
              ...user,
              friendRequestsReceived: user.friendRequestsReceived.filter((friendId: string) => friendId !== this.userIdNguoiDungHienTai)
            }
          }
          return user;
        })})
          //sk socket dong y ket ban
    this.socketService.nhanskDongYKetBan((data:any) =>{
      console.log('Đã nhận sự kiện đồng ý kết bạn', data)
        this.danhSachNguoiDungSauKhiTimKiem = this.danhSachNguoiDungSauKhiTimKiem.map((user: any) =>{
          if(user._id.toString() === data._id.toString()){
            return{ 
              ...user,
              requestfriends: user.requestfriends.filter((friendId: string) => friendId !== this.userIdNguoiDungHienTai),
              friends: [...user.friends, this.userIdNguoiDungHienTai]
            }
          }
          return user;
        })})
        //sk tu choi ket ban
      this.socketService.nhanskTuChoiKetBan((data:any) =>{
        console.log('Đã nhận sự kiện từ chối kết bạn', data)
          this.danhSachNguoiDungSauKhiTimKiem = this.danhSachNguoiDungSauKhiTimKiem.map((user: any) =>{
            console.log('Danh sach truoc',user.requestfriends.length)
            if(user._id.toString() === data.toString()){
              return{ 
                ...user,
                requestfriends: user.requestfriends.filter((friendId: string) => friendId.toString() !== this.userIdNguoiDungHienTai?.toString())
              }
            }
            console.log('Danh sach sau',user.requestfriends.length)
            return user;
            
          })
        })
          //sự kiện hủy bạn bè
      this.socketService.nhanskHuyBanBe((data:any) =>{
        console.log('Đã nhận sự kiện hủy bạn bè', data)
          this.danhSachNguoiDungSauKhiTimKiem = this.danhSachNguoiDungSauKhiTimKiem.map((user: any) =>{
            if(user._id.toString() === data.toString()){
              return{ 
                ...user,
                friends: user.friends.filter((friendId: string) => friendId !== this.userIdNguoiDungHienTai)
              }
            }
            return user;
          })})
    }
  
  }

  ngOnDestroy(): void {
    this.socketService.offNhanSkThemBan();
    this.socketService.offNhanSkHuyKetBan();
    this.socketService.offNhanSkDongYKetBan();
    this.socketService.offNhanSkTuChoiKetBan();
    this.socketService.offNhanskHuyBanBe();
  }

  close() {
    this.closeModal.emit();
    this.searchTerm='';
    this.danhSachNguoiDungSauKhiTimKiem = [];
    this.searchError= ''; 
  }

  setTab(tab: 'friend' | 'group') {
    this.activeTab = tab;
  }
  toggleProfileModal() {
    this.showProfileModal = !this.showProfileModal;
  }
  

//Xử lý kêt bạn
searchFriend() {
  if (!this.searchTerm) {
    this.searchError = 'Chưa nhập từ khóa tìm kiếm';
    return;
  }

  this.isSearching = true;
  this.searchError = null;
  this.danhSachNguoiDungSauKhiTimKiem = [];
  if(this.userIdNguoiDungHienTai){
    //Tìm kiếm thông tin ngườ dùng hiện tại
    this.userService.getUserById(this.userIdNguoiDungHienTai).subscribe({
      next: (res : any) => {
        this.userNguoiDungHienTai = res;
      }
    });
    //Xử lý tìm kiếm thông tin khi bấm tìm trên html
    this.SearchService.searchUsers(this.searchTerm)
    .subscribe({
      next: (res: any) => {
        this.danhSachNguoiDungSauKhiTimKiem = res.filter((user : any) => user._id !== this.userIdNguoiDungHienTai)
        this.searchError = res.length === 0 ? 'Không tìm thấy người dùng' : null;
        this.isSearching = false;
      },
      error: () => {
        this.searchError = 'Lỗi khi tìm kiếm người dùng';
        this.isSearching = false;
      }
    });
  }
}

// Kiểm tra đã là bạn hay chưa hay đã gửi yêu cầu kết bạn hay chưa hay đã nhận yêu cầu kết bạn hay chưa
kiemTraBanHayDaGuiYeuCauKetBan(user: any): string{
  const ban = user.friends.includes(this.userIdNguoiDungHienTai); //Đã là bạn bè
  const daNhanYeuCau = user.friendRequestsReceived.includes(this.userIdNguoiDungHienTai); //Mình đã gửi yêu cầu kết bạn cho user đó
  const daGuiYeuCau = user.requestfriends.includes(this.userIdNguoiDungHienTai); //User đó đã gửi yêu cầu kết bạn cho mình
  return ban ? 'ban' : daGuiYeuCau ? 'daGuiYeuCau' : daNhanYeuCau ? 'daNhanYeuCau' : 'chuaKetBan';
}

//Gửi yêu cầu kết bạn
guiYeuCauKetBan(userId :string){
  this.userService.addFriend(userId).subscribe({
    next: (res: any) =>{
      console.log(res);
      this.danhSachNguoiDungSauKhiTimKiem = this.danhSachNguoiDungSauKhiTimKiem.map((user: any) =>{
        if(user._id.toString() === userId.toString()){
          return{ 
            ...user,
            requestfriends: [...user.requestfriends, this.userIdNguoiDungHienTai]
          }
        }
        return user;
      });

      if(this.userIdNguoiDungHienTai){
        //Tìm kiếm thông tin ngườ dùng hiện tại
        this.userService.getUserById(this.userIdNguoiDungHienTai).subscribe({
          next: (res : any) => {
            this.userNguoiDungHienTai = res;
            //socket
            this.socketService.themBan(userId, this.userNguoiDungHienTai);
          }
        });
      }
    },
    error: (err) => {
      console.error( 'Failed to send friend request:', err);
      this.searchError = 'Lỗi khi gửi yêu cầu kết bạn';
    }
  })
}

//Xủ lý hủy kết bạn
huyYeuCauKetBan(userId: string){
  this.userService.cancelRequestFriend(userId).subscribe({
    next: (res: any) => {
      console.log(res);
      this.danhSachNguoiDungSauKhiTimKiem = this.danhSachNguoiDungSauKhiTimKiem.map((user: any) =>{
        if(user._id.toString() === userId.toString()){
          return{ 
            ...user,
            requestfriends: user.requestfriends.filter((friendId: string) => friendId !== this.userIdNguoiDungHienTai)
          }
        }
        return user;
      });
      this.socketService.huyKetBan(userId);
      console.log('Đã gửi sk hủy yêu cầu kết bạn',userId);
    },
    error: (err) => {
      console.error('Failed to cancel friend request:', err);
      this.searchError = 'Lỗi khi hủy yêu cầu kết bạn';
    }
  })
}


  //Không biết đây của phần xử lý nào ???

  friendsList: Userr[] = [];

  loadFriends(): void {
    this.userService.getFriends().subscribe({
      next: (friends: Userr[]) => {
        this.friendsList = friends;
      },
      error: (err) => {
        console.error('❌ Failed to load friends:', err);
      }
    });
  }
  
  
  get filteredFriends(): Userr[] {
    return this.friendsList.filter(friend =>
      friend.name.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }


  // Xử lý sự kiện tạo nhóm 

  selectedFriends: string[] = [];

  toggleFriendSelection(friendId: string): void {
    if (this.selectedFriends.includes(friendId)) {
      this.selectedFriends = this.selectedFriends.filter(id => id !== friendId);
    } else {
      this.selectedFriends.push(friendId);
    }
  }

  createGroup(friendIds: string[]): void {
    if (friendIds.length < 2) {
      alert("Please select at least 2 friends");
      return;
    }
  
    if (!this.currentUserId) {
      console.error("⚠️ Cannot start chat: user._id is undefined");
      return;
    }
  
    console.log("📦 Creating room with:", {
      currentUserId: this.currentUserId,
      friendIds: friendIds
    });
  
    const roomData = {
      members: [...friendIds],
      chatRoomName: this.groupName ?? '', // Use nullish coalescing to provide an empty string as default
      image: this.defaulGrouptAvatarUrl
    };
  
    console.log("🚀 ~ ModalComponent ~ createGroup ~ roomData:", roomData);
  
    this.chatRoomService.createChatRoom(roomData).subscribe({
      next: (newRoom) => {
        console.log('Chat Room Created:', newRoom);
        this.close();
        this.navigateToChatRoom(newRoom._id);
        this.socketService.joinRoom(newRoom._id);
        // Navigate to the new chat room or handle it accordingly
      },
      error: (err) => console.error('Failed to create chat room:', err)  // Handle errors here
    });
  }
  
  navigateToChatRoom(chatRoomId: string): void {
    console.log("Navigating to chat room with ID:", chatRoomId);
    // Navigate to chat page
    this.router.navigate([`/chat`], { queryParams: { roomId: chatRoomId } });
  }
}  

