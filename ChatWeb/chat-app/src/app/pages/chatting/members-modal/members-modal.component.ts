
import { Component, EventEmitter, Input, OnInit, Output, TrackByFunction } from '@angular/core';
;
import { firstValueFrom, Observable } from 'rxjs';
import { Router } from '@angular/router';
import { Userr } from '../../../models/user.model';
import { defaulGrouptAvatarUrl, defaultAvatarUrl } from '../../../contants';
import { ChatRoom } from '../../../models/chatRoom.model';
import { ChatRoomService } from '../../../services/chatRoom.service';
import { SearchService } from '../../../services/serachService.service';
import { UserService } from '../../../services/user.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SocketService } from '../../../socket.service';
@Component({
  selector: 'app-members-modal',
  imports: [CommonModule,FormsModule],
  templateUrl: './members-modal.component.html',
  styleUrl: './members-modal.component.css'
})
export class MembersModalComponent implements OnInit {
  @Input() isOpen = false;
  @Input() modalView: number = 0;
  @Input() users: Userr[] = []; 
  @Input() chatRooms: ChatRoom[] = [];
  @Input() addedMembers:string[] = [];
  @Output() newAdminSelected = new EventEmitter<string>();
  @Input() memberListFromChatRoom:Userr[] = [];
  @Output() closeModal = new EventEmitter<void>();
  @Output() changedMembers = new EventEmitter<string[]>();
  @Input() updateChatRoom: (() => void) | undefined;
  @Input() selectedRoom: ChatRoom | undefined;
  @Output() confirmUpdate = new EventEmitter<void>();

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
  roomInviteTo: ChatRoom[]=[];

  // memberList: Userr[] = [];
  constructor(private userService: UserService,
    private chatRoomService: ChatRoomService,
    private socketService : SocketService,
  ) { }

  ngOnInit(): void {
    // this.loadChatRooms();
    this.getFriends();
    this.chooseTitle();
    this.filteredChatRoomsToInvite();

    //đồng ý kết bạn
    this.socketService.nhanskDongYKetBan((data:any) =>{
      console.log('Đã nhận sự kiện đồng ý kết bạn', data)
      this.usersList.push(data)
    })
    //hủy kết bạn
       this.socketService.nhanskHuyBanBe((data:any) =>{
        console.log('Đã nhận sự kiện hủy kết bạn', data)
        this.usersList = this.usersList.filter((user:any) => user._id.toString() !== data.toString())
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

  onConfirm(): void {
    this.confirmUpdate.emit();
  }

  selecteds: string[] = [];

  toggleSelection(data: string): void {
    if (this.selecteds.includes(data)) {
      this.selecteds = this.selecteds.filter(id => id !== data);
    } else {
      this.selecteds.push(data);
    }
  }
  toggleSelectionMembers(userId:string): void {
    const index = this.addedMembers.indexOf(userId);
    if (index > -1) {
      this.addedMembers.splice(index, 1);
    } else {
      
      this.addedMembers = [...this.memberListFromChatRoom.map(user => user._id),
        ...(this.currentUserId ? [this.currentUserId] : []),userId];
      console.log("🚀 ~ MembersModalComponent ~ toggleSelectionMembers ~ this.addedMembers:", this.addedMembers)
      
    }
    this.changedMembers.emit(this.addedMembers);
  }


  titleHeader: string = '';

  chooseTitle(): void {
    if (this.modalView === 0) {
      this.titleHeader = 'Groups';
    } else if (this.modalView === 1) {
      this.titleHeader = 'Add members';
    } else if (this.modalView === 2) {
      this.titleHeader = 'Change admin';
    }
  }

  selectedNewAdmin:string = ''
  toggleSelectionAdmin(userId: string): void {
    if (this.selectedNewAdmin[0] === userId) {
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
    const exists = this.selectedGroup.find(r => r._id === room._id);
    if (exists) {
      this.selectedGroup = this.selectedGroup.filter(r => r._id !== room._id);
    } else {
      this.selectedGroup.push(room);
    }
  }

  filteredRooms: ChatRoom[] = [];
    //Check xem người dùng có tồn tại trong chat group muốn mời không
  filteredChatRoomsToInvite() {
    const rooms = this.chatRooms
    .filter((room: ChatRoom) =>
      room.isGroupChat ===true &&
      !room.members.some((member: Userr) => member._id === this.selectedRoom?.members[0]._id)
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
    const userId = this.selectedRoom?.otherMembers?.[0]?._id;
      if (!userId) {
        alert("Không thể xác định người dùng cần mời.");
        return;
      }
    this.selectedGroup.forEach((room: ChatRoom) => {
      const data = {
        userId,
        chatRoomId: room._id
      }
      this.chatRoomService.inviteToChatRoom(data).subscribe({
      next: () => {
        console.log("🚀 ~ MembersModalComponent ~ this.selectedGroup.forEach ~ this.selectedGroup:", this.selectedGroup)
        this.socketService.moiVaoPhongChat(room._id,this.selectedRoom?.members[0]);
        console.log("📤 Gửi lời mời vào room:", room._id, "với user:", this.selectedRoom?.members[0]);

      },
      error: (err) => {
        console.error('Lỗi khi gửi lời mời vào room:', err);
        alert("❌ Gửi lời mời vào room thất bại!");
      }})
    });
   
    this.close();
  }

  
  getFriends(){
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

  isInChatRoom(userId: string): boolean{
    return this.memberListFromChatRoom.some(mem => mem._id! === userId)
  }
  getUsersToAddChat() : Userr[]{
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

