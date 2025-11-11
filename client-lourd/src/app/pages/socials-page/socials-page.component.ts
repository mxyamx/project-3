import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FriendsService } from '@app/services/http-manager/http-friends.service';
import { User } from '@common/user';

@Component({
    selector: 'app-socials-page',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './socials-page.component.html',
    styleUrls: ['./socials-page.component.scss'],
})
export class SocialsPageComponent implements OnInit {
    friends: User[] = [];
    blockedUsers: User[] = [];
    error = '';

    constructor(private friendsService: FriendsService) {}

    ngOnInit(): void {
        this.loadFriends();
        this.loadBlockedUsers();
    }

    loadFriends(): void {
        this.friendsService.getFriendsList().subscribe({
            next: (data: User[]) => (this.friends = data),
            error: (err: { message: string }) => (this.error = err.message),
        });
    }

    loadBlockedUsers(): void {
        // Replace with backend call when implemented
        this.blockedUsers = [];
    }

    removeFriend(friendId: string): void {
        this.friendsService.removeFriend(friendId).subscribe({
            next: () => this.loadFriends(),
            error: (err: { message: string }) => (this.error = err.message),
        });
    }

    blockUser(userId: string): void {
        // Replace with backend call when implemented
        const user = this.friends.find((f) => f.id === userId);
        if (user) {
            this.blockedUsers.push(user);
            this.friends = this.friends.filter((f) => f.id !== userId);
        }
    }

    unblockUser(userId: string): void {
        // Replace with backend call when implemented
        this.blockedUsers = this.blockedUsers.filter((u) => u.id !== userId);
    }
}
