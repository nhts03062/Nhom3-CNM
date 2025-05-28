import { SearchService } from '../../services/searchService.service';
import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { UserService } from '../../services/user.service';
import { FormsModule } from '@angular/forms';
import { Userr } from '../../models/user.model';
import { ChatRoomService } from '../../services/chatRoom.service';
import { Router } from '@angular/router';
import { SocketService } from '../../socket.service';
import { UploadService } from '../../services/upload.service';
import { defaulGrouptAvatarUrl,defaultAvatarUrl } from '../../contants';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.css'],
})
export class ModalComponent implements OnInit {
  @Input() isOpen = false;
  @Input() title = '';
  @Input() userIdNguoiDungHienTai: string | null =
    sessionStorage.getItem('userId');
  @Output() closeModal = new EventEmitter<void>();
  @ViewChild('imageInput') imageInput!: ElementRef<HTMLInputElement>;
  // selectedEmail: string | null = null;
  showProfileModal: boolean = false;
  users!: Userr[];
  defaultAvatarUrl =defaultAvatarUrl;
  defaulGrouptAvatarUrl =defaulGrouptAvatarUrl;
  user: Userr | undefined;
  trangThaiKetBan: string | undefined;

  // tab của kết bạn
  searchError: string | null = null;
  danhSachNguoiDungSauKhiTimKiem: any[] = [];
  isSearching = false;
  userNguoiDungHienTai: Userr | null = null;

  activeTab: 'friend' | 'group' = 'friend';
  searchTerm: string = '';
  currentUserId = sessionStorage.getItem('userId');
  //tab group
  groupName = '';
  errorGroup = '';
  groupImg = '';

  constructor(
    private userService: UserService,
    private chatRoomService: ChatRoomService,
    private SearchService: SearchService,
    private router: Router,
    private socketService: SocketService,
    private uploadService: UploadService
  ) { }

  ngOnInit(): void {
    this.loadFriends();

    const userId = sessionStorage.getItem('userId');
    if (userId) {
      // Đảm bảo người dùng tham gia phòng socket của họ sau khi refresh
      this.socketService.joinRoom(userId);
    }

    if (this.danhSachNguoiDungSauKhiTimKiem) {
      //sk socket thêm bạn
      this.socketService.nhanskThemBan((data: any) => {
        console.log('đã nhận sự kiện thêm bạn', data);
        this.danhSachNguoiDungSauKhiTimKiem =
          this.danhSachNguoiDungSauKhiTimKiem.map((user: any) => {
            if (user._id.toString() === data._id.toString()) {
              return {
                ...user,
                requestfriends: [
                  ...user.requestfriends,
                  this.userIdNguoiDungHienTai,
                ],
              };
            }
            return user;
          });
      });
      //sk socket huy ket ban
      this.socketService.nhanskHuyKetBan((data: any) => {
        console.log('Đã nhận sự kiện hủy kết bạn', data);
        this.danhSachNguoiDungSauKhiTimKiem =
          this.danhSachNguoiDungSauKhiTimKiem.map((user: any) => {
            if (user._id.toString() === data.toString()) {
              return {
                ...user,
                requestfriends: user.requestfriends.filter(
                  (friendId: string) => friendId !== this.userIdNguoiDungHienTai
                ),
              };
            }
            return user;
          });
      });
      //sk socket dong y ket ban
      this.socketService.nhanskDongYKetBan((data: any) => {
        console.log('Đã nhận sự kiện đồng ý kết bạn', data);
        this.danhSachNguoiDungSauKhiTimKiem =
          this.danhSachNguoiDungSauKhiTimKiem.map((user: any) => {
            if (user._id.toString() === data._id.toString()) {
              return {
                ...user,
                requestfriends: user.requestfriends.filter(
                  (friendId: string) => friendId !== this.userIdNguoiDungHienTai
                ),
                friends: [...user.friends, this.userIdNguoiDungHienTai],
              };
            }
            return user;
          });
        this.friendsList.push(data);
      });
      //sk tu choi ket ban
      this.socketService.nhanskTuChoiKetBan((data: any) => {
        console.log('Đã nhận sự kiện từ chối kết bạn', data);
        this.danhSachNguoiDungSauKhiTimKiem =
          this.danhSachNguoiDungSauKhiTimKiem.map((user: any) => {
            console.log('Danh sach truoc', user.requestfriends.length);
            if (user._id.toString() === data.toString()) {
              return {
                ...user,
                friendRequestsReceived: user.friendRequestsReceived.filter(
                  (friendId: string) =>
                    friendId.toString() !==
                    this.userIdNguoiDungHienTai?.toString()
                ),
              };
            }
            console.log('Danh sach sau', user.requestfriends.length);
            return user;
          });
      });
      //sự kiện hủy bạn bè
      this.socketService.nhanskHuyBanBe((data: any) => {
        console.log('Đã nhận sự kiện hủy bạn bè', data);
        this.danhSachNguoiDungSauKhiTimKiem =
          this.danhSachNguoiDungSauKhiTimKiem.map((user: any) => {
            if (user._id.toString() === data.toString()) {
              return {
                ...user,
                friends: user.friends.filter(
                  (friendId: string) => friendId !== this.userIdNguoiDungHienTai
                ),
              };
            }
            return user;
          });
        this.friendsList = this.friendsList.filter(
          (friend: any) => friend._id.toString() !== data.toString()
        );
      });
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
    this.searchTerm = '';
    this.danhSachNguoiDungSauKhiTimKiem = [];
    this.searchError = '';
    this.errorGroup = '';
    this.selectedFriends = [];
    this.groupName = '';
    this.groupImg = '';
  }

  setTab(tab: 'friend' | 'group') {
    this.activeTab = tab;
    this.searchTerm = '';
  }
  toggleProfileModal() {
    this.showProfileModal = !this.showProfileModal;
  }

  selectedUser: Userr | undefined;

  selectUser(user: Userr): void {
    this.selectedUser = user;
    if (this.selectedUser) {
      this.trangThaiKetBan = this.kiemTraBanHayDaGuiYeuCauKetBan(
        this.selectedUser
      );
      this.toggleProfileModal(); // Show the modal
    }
  }

  onImageSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e: any) => {
        img.src = e.target.result;

        img.onload = () => {
          const size = 100; // desired size for avatar
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          canvas.width = size;
          canvas.height = size;

          // Draw circle mask
          ctx.beginPath();
          ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();

          // Draw the image centered
          const scale = Math.max(size / img.width, size / img.height);
          const x = (size - img.width * scale) / 2;
          const y = (size - img.height * scale) / 2;

          ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

          const base64Image = canvas.toDataURL('image/jpeg', 0.9);
          this.groupImg = base64Image;
          console.log("🚀 ~ ModalComponent ~ onImageSelected ~ this.groupImg:", this.groupImg)
          // Không gọi updateChatRoom() ngay lập tức - đợi người dùng nhấn lưu
        };
      };

      reader.readAsDataURL(file);
    }
  }
  chonHinhAnhGroup(): void {
    this.imageInput.nativeElement.click();
  }
  /**--------------Xử lý kêt bạn------------------*/
  searchFriend() {
    if (!this.searchTerm) {
      this.searchError = 'Chưa nhập từ khóa tìm kiếm';
      return;
    }

    this.isSearching = true;
    this.searchError = null;
    this.danhSachNguoiDungSauKhiTimKiem = [];
    if (this.userIdNguoiDungHienTai) {
      //Tìm kiếm thông tin ngườ dùng hiện tại
      this.userService.getUserById(this.userIdNguoiDungHienTai).subscribe({
        next: (res: any) => {
          this.userNguoiDungHienTai = res;
        },
      });
      //Xử lý tìm kiếm thông tin khi bấm tìm trên html
      this.SearchService.searchUsers(this.searchTerm).subscribe({
        next: (res: any) => {
          this.danhSachNguoiDungSauKhiTimKiem = res.filter(
            (user: any) => user._id !== this.userIdNguoiDungHienTai
          );
          this.danhSachNguoiDungSauKhiTimKiem =
            this.danhSachNguoiDungSauKhiTimKiem.map((user: Userr) => ({
              ...user,
              trangThaiKetBan: this.kiemTraBanHayDaGuiYeuCauKetBan(user),
            }));
          this.searchError =
            res.length === 0 ? 'Không tìm thấy người dùng' : null;
          this.isSearching = false;
        },
        error: () => {
          this.searchError = 'Lỗi khi tìm kiếm người dùng';
          this.isSearching = false;
        },
      });
    }
  }

  kiemTraBanHayDaGuiYeuCauKetBan(user: any): string {
    const ban = user?.friends?.includes(this.userIdNguoiDungHienTai);
    const daGuiYeuCau = user?.friendRequestsReceived?.includes(
      this.userIdNguoiDungHienTai
    );
    const daNhanYeuCau = user?.requestfriends?.includes(
      this.userIdNguoiDungHienTai
    );

    const status = ban
      ? 'ban'
      : daNhanYeuCau
        ? 'daNhanYeuCau'
        : daGuiYeuCau
          ? 'daGuiYeuCau'
          : 'chuaKetBan';
    return status;
  }

  //Gửi yêu cầu kết bạn
  guiYeuCauKetBan(userId: string) {
    this.userService.addFriend(userId).subscribe({
      next: (res: any) => {
        console.log(res);
        this.danhSachNguoiDungSauKhiTimKiem =
          this.danhSachNguoiDungSauKhiTimKiem.map((user: any) => {
            if (user._id.toString() === userId.toString()) {
              return {
                ...user,
                friendRequestsReceived: [
                  ...user.friendRequestsReceived,
                  this.userIdNguoiDungHienTai,
                ],
              };
            }
            return user;
          });

        if (this.userIdNguoiDungHienTai) {
          //Tìm kiếm thông tin ngườ dùng hiện tại
          this.userService.getUserById(this.userIdNguoiDungHienTai).subscribe({
            next: (res: any) => {
              this.userNguoiDungHienTai = res;
              //socket
              this.socketService.themBan(userId, this.userNguoiDungHienTai);
            },
          });
        }
      },
      error: (err) => {
        console.error('Failed to send friend request:', err);
        this.searchError = 'Lỗi khi gửi yêu cầu kết bạn';
      },
    });
  }

  //Xủ lý hủy kết bạn
  huyYeuCauKetBan(userId: string) {
    this.userService.cancelRequestFriend(userId).subscribe({
      next: (res: any) => {
        console.log(res);
        this.danhSachNguoiDungSauKhiTimKiem =
          this.danhSachNguoiDungSauKhiTimKiem.map((user: any) => {
            if (user._id.toString() === userId.toString()) {
              return {
                ...user,
                friendRequestsReceived: user.friendRequestsReceived.filter(
                  (friendId: string) => friendId !== this.userIdNguoiDungHienTai
                ),
              };
            }
            return user;
          });
        this.socketService.huyKetBan(userId);
        console.log('Đã gửi sk hủy yêu cầu kết bạn', userId);
      },
      error: (err) => {
        console.error('Failed to cancel friend request:', err);
        this.searchError = 'Lỗi khi hủy yêu cầu kết bạn';
      },
    });
  }
  /**-------end-------Xử lý kêt bạn------------------*/

  /**--------------Xử lý sự kiện tạo nhóm------------------*/
  // Tải danh sách bạn bè
  friendsList: Userr[] = [];
  loadFriends(): void {
    this.userService.getFriends().subscribe({
      next: (friends: Userr[]) => {
        this.friendsList = friends;
      },
      error: (err) => {
        console.error('❌ Failed to load friends:', err);
      },
    });
  }

  //Lọc danh sách bạn bè được chọn trên htmlhtml
  get filteredFriends(): Userr[] {
    return this.friendsList.filter((friend) =>
      friend.name.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  // Xử lý sự kiện khi người dùng chọn bạn bè
  selectedFriends: string[] = [];
  toggleFriendSelection(friendId: string): void {
    if (this.selectedFriends.includes(friendId)) {
      this.selectedFriends = this.selectedFriends.filter(
        (id) => id !== friendId
      );
    } else {
      this.selectedFriends.push(friendId);
    }
  }

  //tạo nhóm
  // createGroup(friendIds: string[]): void {
  //   this.errorGroup = '';

  //   if (friendIds.length < 2) {
  //     this.errorGroup = 'Cân ít nhất 2 thành viên để tạo nhóm';
  //     return;
  //   }

  //   if (!this.currentUserId) {
  //     console.error('⚠️ Cannot start chat: user._id is undefined');
  //     return;
  //   }

  //   console.log('📦 Creating room with:', {
  //     currentUserId: this.currentUserId,
  //     friendIds: friendIds,
  //   });

  //   if (!this.groupName) {
  //     this.errorGroup = 'Tên nhóm không được để trống';
  //     return;
  //   }

  //   const roomData = {
  //     members: [...friendIds],
  //     chatRoomName: this.groupName,
  //     image: this.groupImg || this.defaulGrouptAvatarUrl
  //   };

  //   console.log('🚀 ~ ModalComponent ~ createGroup ~ roomData:', roomData);

  //   this.chatRoomService.createChatRoom(roomData).subscribe({
  //     next: (newRoom) => {
  //       console.log('Chat Room Created:', newRoom);
  //       this.close();
  //       this.navigateToChatRoom(newRoom._id);
  //       this.socketService.joinRoom(newRoom._id);
  //       // Navigate to the new chat room or handle it accordingly
  //       this.socketService.taoPhongChat(newRoom._id, newRoom);

  //       this.selectedFriends = [];
  //       this.groupName = '';
  //     },
  //     error: (err) => console.error('Failed to create chat room:', err), // Handle errors here
  //   });
  // }
  createGroup(friendIds: string[]): void {
    this.errorGroup = '';

    if (friendIds.length < 2) {
      this.errorGroup = 'Cần ít nhất 2 thành viên để tạo nhóm';
      return;
    }

    if (!this.currentUserId) {
      console.error('⚠️ Cannot start chat: user._id is undefined');
      return;
    }

    if (!this.groupName) {
      this.errorGroup = 'Tên nhóm không được để trống';
      return;
    }

    const proceedToCreate = (imageUrl: string) => {
      console.log("🚀 ~ ModalComponent ~ proceedToCreate ~ imageUrl:", imageUrl)
      const roomData = {
        members: [...friendIds],
        chatRoomName: this.groupName,
        image: imageUrl || this.defaulGrouptAvatarUrl
      };

      console.log('🚀 ~ ModalComponent ~ createGroup ~ roomData:', roomData);

      this.chatRoomService.createChatRoom(roomData).subscribe({
        next: (newRoom) => {
          console.log('Chat Room Created:', newRoom);
          this.close();
          this.navigateToChatRoom(newRoom._id);
          this.socketService.joinRoom(newRoom._id);
          this.socketService.taoPhongChat(newRoom._id, newRoom);

          this.selectedFriends = [];
          this.groupName = '';
          this.groupImg = '';
        },
        error: (err) => console.error('❌ Failed to create chat room:', err),
      });
    };

    // Nếu có ảnh tùy chỉnh, upload trước
    if (this.groupImg && this.groupImg !== this.defaulGrouptAvatarUrl) {
      this.uploadService.uploadBase64Image(this.groupImg).subscribe({
        next: (res) => {
          console.log('📤 Full upload response:', JSON.stringify(res));

          // Giải pháp fallback cho mọi kiểu phản hồi thường gặp
          const uploadedUrl = typeof res === 'string'
      ? res
      : res?.url || res?.data?.url || res?.fileUrl;
          if (uploadedUrl) {
            proceedToCreate(uploadedUrl);
          } else {
            console.error('❌ Không tìm thấy URL ảnh trong phản hồi:', res);
            this.errorGroup = 'Không thể lấy URL ảnh từ phản hồi máy chủ';
          }
        },
        error: (err) => {
          console.error('❌ Failed to upload image:', err);
          this.errorGroup = 'Tải ảnh lên thất bại. Vui lòng thử lại.';
        }
      });
    } else {
      proceedToCreate(this.defaulGrouptAvatarUrl);
    }
  }

  /**---------end-----Xử lý sự kiện tạo nhóm------------------*/

  navigateToChatRoom(chatRoomId: string): void {
    console.log('Navigating to chat room with ID:', chatRoomId);
    this.chatRoomService.setRoomId(chatRoomId);
    // Navigate to chat page
    this.router.navigate([`/chat`]);
  }
}
