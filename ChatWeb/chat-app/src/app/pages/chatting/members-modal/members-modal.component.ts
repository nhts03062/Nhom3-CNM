
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, TrackByFunction } from '@angular/core';
;
import { Userr} from '../../../models/user.model';
import { defaulGrouptAvatarUrl, defaultAvatarUrl } from '../../../contants';
import { ChatRoom } from '../../../models/chatRoom.model';
import { ChatRoomService } from '../../../services/chatRoom.service';
import { SearchService } from '../../../services/searchService.service';
import { UserService } from '../../../services/user.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SocketService } from '../../../socket.service';
@Component({
  selector: 'app-members-modal',
  imports: [CommonModule, FormsModule],
  templateUrl: './members-modal.component.html',
  styleUrl: './members-modal.component.css'
})
export class MembersModalComponent implements OnInit {
  @Input() isOpen = false;
  @Input() modalView: number = 0;
  @Input() users: Userr[] = [];
  @Input() chatRooms: ChatRoom[] = [];
  @Input() addedMembers: string[] = [];
  @Output() newAdminSelected = new EventEmitter<string>();
  @Input() memberListFromChatRoom: Userr[] = [];
  @Input() UserListToFW: Userr[] = [];
  @Output() closeModal = new EventEmitter<void>();
  @Output() changedMembers = new EventEmitter<string[]>();
  @Input() selectedRoom: ChatRoom | undefined;
  @Input() bindingFunction: (() => void) | undefined;
  @Output() confirmUpdate = new EventEmitter<string[]>(); // Truyền danh sách userId
  @Output() selectedUsersChange = new EventEmitter<string[]>();


  showModal = false;
  showProfileModal = false;
  defaultAvatarUrl = defaultAvatarUrl;
  defaulGrouptAvatarUrl = defaulGrouptAvatarUrl;
  searchTerm: string = '';
  usersList: Userr[] = [];
  user: Userr | undefined;
  userMap: { [id: string]: Userr } = {};
  currentUserId = sessionStorage.getItem('userId');
  foundUser: Userr | undefined;
  searchTermGroup: string = '';
  searchMember: string = '';
  searchUserToFW: string = '';
  roomInviteTo: ChatRoom[] = [];
  activeTab: 'friend' | 'group' = 'friend';

  // memberList: User[] = [];
  constructor(private userService: UserService,
    private chatRoomService: ChatRoomService,
    private socketService: SocketService,
  ) { }


  ngOnInit(): void {
    // this.loadChatRooms();
    this.getFriends();
    this.chooseTitle();
    this.filteredChatRoomsToInvite();

    //đồng ý kết bạn
    this.socketService.nhanskDongYKetBan((data: any) => {
      console.log('Đã nhận sự kiện đồng ý kết bạn', data)
      this.usersList.push(data)
    })
    //hủy kết bạn
    this.socketService.nhanskHuyBanBe((data: any) => {
      console.log('Đã nhận sự kiện hủy kết bạn', data)
      this.usersList = this.usersList.filter((user: any) => user._id.toString() !== data.toString())
    })

  }


  ngOnDestroy(): void {
    this.socketService.offNhanSkDongYKetBan();
    this.socketService.offNhanSkHuyKetBan();
  }

  toggleModal() {
    this.showModal = !this.showModal;
  }
  toggleProfileModal() {
    this.showProfileModal = !this.showProfileModal;
  }
  close() {
    this.closeModal.emit();
    this.searchTerm = '';
  }
  setTab(tab: 'friend' | 'group') {
    this.activeTab = tab;
  }

  onConfirm(): void {
    this.confirmUpdate.emit(this.seletedMemsId);
  }

  selecteds: string[] = [];

  toggleSelection(data: string): void {
    if (this.selecteds.includes(data)) {
      this.selecteds = this.selecteds.filter(id => id !== data);
    } else {
      this.selecteds.push(data);
    }
  }


  seletedMemsId: string[] = [];
  toggleSelectionMembers(userId: string): void {
    const index = this.addedMembers.indexOf(userId);
    if (index > -1) {
      this.addedMembers.splice(index, 1);
    } else {

      this.addedMembers = [...this.memberListFromChatRoom.map(user => user._id),
      ...(this.currentUserId ? [this.currentUserId] : []), userId];
      this.seletedMemsId = [...this.addedMembers];
    }
    this.changedMembers.emit(this.addedMembers);
  }


  // Dành cho forward tin nhắn
  seletedUsersToFW: string[] = [];
  searchGroupToFW: string[] = [];
  searchTermGroupFW: string = '';
  toggleSelectionUsersFW(userId: string): void {
    const index = this.seletedUsersToFW.indexOf(userId);
    if (index > -1) {
      this.seletedUsersToFW.splice(index, 1);
    } else {
      this.seletedUsersToFW.push(userId);
    }

    // Emit danh sách mới
    this.selectedUsersChange.emit(this.seletedUsersToFW);
  }
  toggleSelectionGroupsFW(groupId: string): void {
    const index = this.searchGroupToFW.indexOf(groupId);
    if (index > -1) {
      this.searchGroupToFW.splice(index, 1);
    } else {
      this.searchGroupToFW.push(groupId);
    }

    // Emit danh sách mới
    this.selectedUsersChange.emit(this.searchGroupToFW);
  }
  get filteredUsersFW(): Userr[] {
    const userMap: { [key: string]: Userr } = {};

    this.chatRooms.forEach(room => {
      room.members.forEach((member: Userr) => {
        const memberId = member._id.toString();
        const currentId = this.currentUserId?.toString();
        if (memberId !== currentId) {
          userMap[memberId] = member;
        }
      });
    });

    return Object.values(userMap).filter(user =>
      user.name.toLowerCase().includes(this.searchUserToFW.trim().toLowerCase() || '')
    );
  }

  get filteredGroupChatsToFW(): ChatRoom[] {
    const term = this.searchTermGroupFW.trim().toLowerCase();

    return this.chatRooms.filter(room =>
      room.isGroupChat &&
      (room.chatRoomName?.toLowerCase().includes(term) || false)
    );
  }




  titleHeader: string = '';

  chooseTitle(): void {
    if (this.modalView === 0) {
      this.titleHeader = 'Nhóm';
    } else if (this.modalView === 1) {
      this.titleHeader = 'Thêm thành viên';
    } else if (this.modalView === 2) {
      this.titleHeader = 'Thay đổi admin';
    } else if (this.modalView === 3) {
      this.titleHeader = 'Chuyển tiếp tin nhắn';
    }
  }

  selectedNewAdmin: string = ''
  toggleSelectionAdmin(userId: string): void {
    if (this.selectedNewAdmin === userId) {
      // Deselect if already selected
      this.selectedNewAdmin = '';
      this.newAdminSelected.emit(''); // Emit empty if deselecting the admin
    } else {
      // Only allow one selection at a time
      this.selectedNewAdmin = userId;
      this.newAdminSelected.emit(this.selectedNewAdmin);
    }
  }

  //Mời 1 người vào nhóm khi đang ở chat 1v1
  selectedGroup: ChatRoom[] = [];

  groupSelection(room: ChatRoom): void {
    if (this.isSelected(room)) {
      this.selectedGroup = this.selectedGroup.filter(r => r._id !== room._id);
      console.log("After removal, selectedGroup:", this.selectedGroup);
    } else {
      this.selectedGroup.push(room);
      console.log("After addition, selectedGroup:", this.selectedGroup);
    }
  }

  isSelected(room: ChatRoom): boolean {
    return this.selectedGroup.some(r => r._id === room._id);
  }

  filteredRooms: ChatRoom[] = [];
  otherUserId: string = '';
  //Check xem người dùng có tồn tại trong chat group muốn mời không
  filteredChatRoomsToInvite() {
    // Lấy user còn lại trong phòng hiện tại (ngoại trừ currentUser)
    const otherUser = this.selectedRoom?.members.find(
      (member: Userr) => member._id.toString() !== this.currentUserId?.toString()
    );

    // otherUser là object User, lấy id thành chuỗi
    this.otherUserId = otherUser?._id.toString() || '';

    // Lọc các phòng nhóm mà không chứa otherUserId
    const rooms = this.chatRooms.filter(room =>
      room.isGroupChat === true &&
      !room.members.some((member: Userr) =>
        member._id.toString() === this.otherUserId
      )
    );

    console.log("🔍 Các group chat chưa có thành viên này (rooms):", rooms);

    this.filteredRooms = rooms.filter(room => {
      console.log("🚀 ~ room.chatRoomName:", room.chatRoomName);
      return (room.chatRoomName || '').toLowerCase().includes(this.searchTermGroup?.trim().toLowerCase() || '');
    });
    console.log("🔎 Kết quả sau khi lọc theo searchTerm:", this.filteredRooms);
  }

  inviteToGroup(): void {
    if (!this.selectedGroup || this.selectedGroup.length === 0) {
      alert('Vui lòng chọn ít nhất một phòng chat.');
      return;
    }
    const userId = this.otherUserId;
    if (!userId) {
      alert("Không thể xác định người dùng cần mời.");
      return;
    }

    this.selectedGroup.forEach((room: ChatRoom) => {
      const data = {
        userId,
        chatRoomId: room._id
      };
      this.chatRoomService.inviteToChatRoom(data).subscribe({
        next: () => {

          this.socketService.moiVaoPhongChat(room._id, userId);
          this.filteredChatRoomsToInvite()
        },
        error: (err) => {
          console.error('Lỗi khi gửi lời mời vào room:', err);
          alert("❌ Gửi lời mời vào room thất bại!");
        }
      });
    });

    this.selectedGroup = [];  // **Reset danh sách đã chọn**
    this.close();
  }

  getFriends() {
    this.userService.getFriends().subscribe({
      next: (res: Userr[]) => {
        this.usersList = res;
        console.log('User data loaded:', this.usersList);
      },
      error: (err) => {
        console.error('Failed to load user:', err);
      }
    });
  }

  isInChatRoom(userId: string): boolean {
    return this.memberListFromChatRoom.some(mem => mem._id! === userId)
  }
  getUsersToAddChat(): Userr[] {
    return this.usersList.filter(user => !this.isInChatRoom(user._id));
  }


  get filteredUsers(): Userr[] {
    return this.usersList.filter(user =>
      user.name.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  get filteredMembers(): Userr[] {
    return this.users.filter(mem =>
      mem.name.toLowerCase().includes(this.searchMember.toLowerCase())
    );
  }




}

