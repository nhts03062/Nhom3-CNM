import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { User } from '../../models/user.model';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-sidebar',
  imports: [RouterModule, CommonModule],
  standalone: true,
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit, OnDestroy {
  router = inject(Router);
  activeIndex = 0;
  user?: User;
  userId: string = sessionStorage.getItem('userId')!;
  defaultAvatarUrl = 'https://i1.rgstatic.net/ii/profile.image/1039614412341248-1624874799001_Q512/Meryem-Laval.jpg';

  private routerEventsSub!: Subscription;

  constructor(private userService: UserService) {}

  ngOnInit() {
    this.setActiveIndex(this.router.url);

    this.routerEventsSub = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.setActiveIndex(event.urlAfterRedirects);
    });
     this.userService.getUserById(this.userId).subscribe({
      next: (res: User) => {
        this.user = res;
      },
      error: (err) => {
        console.error('Failed to load user:', err);
      }
    });

      this.userService.user$.subscribe(user => {
      this.user = user;
  });
  }

  ngOnDestroy() {
    if (this.routerEventsSub) {
      this.routerEventsSub.unsubscribe();
    }
  }

  onNavigate(index: number) {
    this.activeIndex = index;

    if (index === 0) {
      this.router.navigateByUrl('/profile');
    } else if (index === 1) {
      this.router.navigateByUrl('/chat');
    } else if (index === 2) {
      this.router.navigateByUrl('/contacts');
    } else if (index === 3) {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('userId');
      this.router.navigateByUrl('/auth', { replaceUrl: true });
    }
  }

  private setActiveIndex(url: string) {
    if (url.includes('/profile')) {
      this.activeIndex = 0;
    } else if (url.includes('/chat')) {
      this.activeIndex = 1;
    } else if (url.includes('/contacts')) {
      this.activeIndex = 2;
    } else if (url.includes('/auth')) {
      this.activeIndex = 3;
    }
  }
}
