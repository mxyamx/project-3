import { provideHttpClient } from '@angular/common/http';
import { enableProdMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { Routes, provideRouter, withHashLocation } from '@angular/router';
import { AdminPageComponent } from '@app/pages/admin-page/admin-page.component';
import { AppComponent } from '@app/pages/app/app.component';
import { AvatarPageComponent } from '@app/pages/avatar-page/avatar-page.component';
import { BoardEditionPageComponent } from '@app/pages/board-edition-page/board-edition-page.component';
import { ChatPageComponent } from '@app/pages/chat-page/chat-page/chat-page.component';
import { CreationPageComponent } from '@app/pages/creation-page/creation-page.component';
import { EnteringCurrentGamePageComponent } from '@app/pages/entering-current-game-page/entering-current-game-page';
import { ErrorPageComponent } from '@app/pages/error-page/error-page.component';
import { GameOptionComponent } from '@app/pages/game-option/game-option.component';
import { GameComponent } from '@app/pages/game/game.component';
import { LoginPageComponent } from '@app/pages/login-page/login-page.component';
import { MainPageComponent } from '@app/pages/main-page/main-page.component';
import { StatisticsPageComponent } from '@app/pages/statistics-page/statistics-page.component';
import { WaitingPageComponent } from '@app/pages/waiting-page/waiting-page.component';
import { environment } from './environments/environment';
import { ProfilePageComponent } from '@app/pages/profile-page/profile-page.component';

if (environment.production) {
    enableProdMode();
}

const routes: Routes = [
    { path: '', redirectTo: '/login', pathMatch: 'full' },
    { path: 'login', component: LoginPageComponent },
    { path: 'profile', component: ProfilePageComponent },
    { path: 'home', component: MainPageComponent },
    { path: 'admin-page', component: AdminPageComponent },
    { path: 'admin', component: AdminPageComponent },
    { path: 'creation', component: CreationPageComponent },
    { path: 'avatar', component: AvatarPageComponent },
    { path: 'waiting', component: WaitingPageComponent },
    { path: 'option', component: GameOptionComponent },
    { path: 'editor', component: BoardEditionPageComponent },
    { path: 'editor/:id', component: BoardEditionPageComponent },
    { path: 'game', component: GameComponent },
    { path: 'chat', component: ChatPageComponent },
    { path: 'game-code', component: EnteringCurrentGamePageComponent },
    { path: 'statistics', component: StatisticsPageComponent },
    { path: 'error-page', component: ErrorPageComponent },
    { path: '**', redirectTo: '/home' },
];

bootstrapApplication(AppComponent, {
    providers: [provideHttpClient(), provideRouter(routes, withHashLocation()), provideAnimations()],
});
