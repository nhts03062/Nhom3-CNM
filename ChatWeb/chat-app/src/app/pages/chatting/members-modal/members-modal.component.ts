
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
  chatRooms: ChatRoom[] = [];
  user: Userr | undefined;
  userMap: { [id: string]: Userr } = {};
  currentUserId = sessionStorage.getItem('userId');
  foundUser: Userr | undefined;
  searchTermGroup: string = '';
  searchMember: string = '';

  // memberList: Userr[] = [];
  constructor(private userService: UserService,
    private chatRoomService: ChatRoomService,
    private socketService : SocketService,
  ) { }

  ngOnInit(): void {
    this.loadChatRooms();
    this.getFriends();
    this.chooseTitle();

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
  
  loadChatRooms(): void {
    this.chatRoomService.getChatRooms().subscribe({
      next: (rooms: ChatRoom[]) => {
        console.log("📥 rooms loaded:", rooms);
        this.chatRooms = rooms;
         

      },
      error: err => {
        console.error("❌ Failed to load rooms:", err);
      }
    });
  }
  


  get filteredUsers(): Userr[] {
    return this.usersList.filter(user =>
      user.name.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }
  get filteredChatRooms(): ChatRoom[] {
    return this.chatRooms.filter(room =>
      room.chatRoomName?.toLowerCase().includes(this.searchTermGroup.toLowerCase())
    );
  }
  get filteredMembers(): Userr[] {
    return this.users.filter(mem =>
      mem.name.toLowerCase().includes(this.searchMember.toLowerCase())
    );
  }


}

