import { Component, Input } from '@angular/core';
import { Player } from '@common/player';

@Component({
    selector: 'app-player-element',
    imports: [],
    templateUrl: './player-element.component.html',
    styleUrl: './player-element.component.scss',
})
export class PlayerElementComponent {
    @Input() player: Player;
}
