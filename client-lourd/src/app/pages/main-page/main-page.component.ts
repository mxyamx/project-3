import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ChatComponent } from '@app/components/chat/chat.component';

@Component({
    selector: 'app-main-page',
    templateUrl: './main-page.component.html',
    styleUrls: ['./main-page.component.scss'],
    imports: [RouterLink, ChatComponent],
})
export class MainPageComponent {
    readonly title: string = 'Méchante Patte';
}
