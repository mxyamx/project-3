import { Component, Input } from '@angular/core';
import { FROM_ITEM_TO_IMAGE_ON_BOARD } from '@app/constants/objects-constants';
import { Item } from '@common/item';

@Component({
    selector: 'app-playing-item',
    imports: [],
    templateUrl: './playing-item.component.html',
    styleUrl: './playing-item.component.scss',
})
export class PlayingItemComponent {
    @Input() item: Item;

    private itemImageCorrespondance: { [key: string]: string } = FROM_ITEM_TO_IMAGE_ON_BOARD;

    get imageCorrespondance(): { [key: string]: string } {
        return this.itemImageCorrespondance;
    }
}
