import { SearchService } from './../../services/search.service';
import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { SocketService } from '../../socket.service';
import { ChatRoomService } from '../../services/chatRoom.service';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.css']
})
export class ModalComponent implements OnInit {
  @Input() isOpen = false;
  @Input() title = '';
  @Input() userId: string | null = sessionStorage.getItem('userId');
  @Output() closeModal = new EventEmitter<void>();

  activeTab: 'friend' | 'group' = 'friend';

  idNguoiDungHienTai: string | null  = sessionStorage.getItem('userId')

  // Friend tab
  searchTerm = '';
  searchResults: any[] = [];
  searchError: string | null = null;
  friendRequests: any[] = [];
  isSearching = false;

  // Group tab
  groupName = '';
  groupSearchTerm = '';
  groupSearchResults: any[] = [];
  groupSearchError: string | null = null;
  isGroupSearching = false;
  groupMembers: any[] = [];

  constructor(private http: HttpClient, private socketService: SocketService,
    private chatRoomService: ChatRoomService, private searchService: SearchService, private userService: UserService) {}

  ngOnInit(): void {
    if (this.userId) this.socketService.joinRoom(this.userId);

    this.socketService.onFriendRequested((data: any) => {
      this.friendRequests.push(data.user);
      console.log('Yêu cầu kết bạn từ:', data.user);
    });

    this.socketService.onFriendRequestCanceled((data: any) => {
      this.friendRequests = this.friendRequests.filter(req => req._id !== data.user._id);
      console.log('Yêu cầu kết bạn bị hủy:', data.user);
    });

    this.socketService.onAgreeFriend((friend: any) => {
      console.log('Đã trở thành bạn bè với:', friend);
    });
  }

  isFriend(friends: string[]): boolean {
    return friends.includes(this.idNguoiDungHienTai || '');
  }

  close() {
    this.closeModal.emit();
    this.resetForm();
  }

  setTab(tab: 'friend' | 'group') {
    this.activeTab = tab;
    this.resetForm();
  }

  private getHeaders(): HttpHeaders {
    const token = sessionStorage.getItem('token');
    return new HttpHeaders({ 'Authorization': `${token}` });
  }

  // --- FRIEND ---
  searchFriend() {
    if (!this.searchTerm) {
      this.searchError = 'Vui lòng nhập email để tìm kiếm';
      return;
    }

    this.isSearching = true;
    this.searchService.search( this.searchTerm)
      .subscribe({
        next: (res: any) => {
          res.filter
          this.searchResults = res
          .filter((u: any) => u._id !== this.idNguoiDungHienTai) // loại bỏ chính mình
          .slice(0, 5); // chỉ lấy 5 người đầu tiên
          this.searchError = res.length === 0 ? 'Không tìm thấy người dùng' : null;
          this.isSearching = false;
        },
        error: () => {
          this.searchError = 'Lỗi khi tìm kiếm người dùng';
          this.isSearching = false;
        }
      });
  }

  sendFriendRequest(friendId: string) {
    if (!this.userId) {
      this.searchError = 'Người dùng chưa đăng nhập';
      return;
    }

    this.userService.addFriend(friendId)
      .subscribe({
        next: () => {
          this.searchError = null;
          this.searchResults = [];
          this.searchTerm = '';
        },
        error: (err) => {
          this.searchError = err.error.msg || 'Lỗi khi gửi yêu cầu kết bạn';
        }
      });

    this.socketService.getSocket().emit('request-friend', { userId: friendId, text: '' }, (res: any) => {
      if (res.code !== 1) {
        this.searchError = 'Lỗi khi gửi yêu cầu kết bạn qua Socket.IO';
      }
    });
  }

  // --- GROUP ---
  searchGroupMember() {
    if (!this.groupSearchTerm) {
      this.groupSearchError = 'Vui lòng nhập email';
      return;
    }
    // { searchTerm: this.groupSearchTerm }

    this.isGroupSearching = true;
    
      this.searchService.search( this.groupSearchTerm).subscribe({
        next: (res: any) => {
          this.groupSearchResults = res.filter((u: any) => !this.groupMembers.find(m => m._id === u._id));
          this.groupSearchError = res.length === 0 ? 'Không tìm thấy người dùng' : null;
          this.isGroupSearching = false;
        },
        error: () => {
          this.groupSearchError = 'Lỗi tìm kiếm người dùng';
          this.isGroupSearching = false;
        }
      });
  }

  addGroupMember(user: any) {
    if (!this.groupMembers.find(m => m._id === user._id)) {
      this.groupMembers.push(user);
    }
    this.groupSearchResults = [];
    this.groupSearchTerm = '';
  }

  removeGroupMember(userId: string) {
    this.groupMembers = this.groupMembers.filter(m => m._id !== userId);
  }

  createGroup() {
    if (!this.groupName || this.groupName.trim().length === 0) {
      this.groupSearchError = 'Vui lòng nhập tên nhóm';
      return;
    }

    if (this.groupMembers.length < 2) {
      this.groupSearchError = 'Cần ít nhất 2 thành viên (không bao gồm bạn)';
      return;
    }

    const memberIds = this.groupMembers.map(m => m._id);
    const body = {
      name: this.groupName.trim(),
      members: memberIds
    };

    this.chatRoomService.createChatRoom(body.members, body.name) 
      .subscribe({
        next: (res) => {
          console.log('Tạo nhóm thành công:', res);
          this.close(); // đóng modal
        },
        error: (err) => {
          this.groupSearchError = err.error.msg || 'Lỗi khi tạo nhóm';
        }
      });

    // Gửi qua socket để realtime nếu cần
    this.socketService.getSocket().emit('create-chatRoom', body, (res: any) => {
      console.log('Socket phản hồi tạo nhóm:', res);
    });
  }

  private resetForm() {
    this.searchTerm = '';
    this.searchResults = [];
    this.searchError = null;
    this.isSearching = false;

    this.groupName = '';
    this.groupSearchTerm = '';
    this.groupSearchResults = [];
    this.groupSearchError = null;
    this.isGroupSearching = false;
    this.groupMembers = [];
  }
}