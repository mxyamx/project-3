import { Component, Input } from '@angular/core';
import { FROM_ITEM_TO_IMAGE_ON_BOARD, getTorchImageOnBoard } from '@app/constants/objects-constants';
import { ItemName } from '@common/enums/item-name';
import { TileType } from '@common/enums/tile-type';
import { Item } from '@common/item';

@Component({
    selector: 'app-playing-item',
    imports: [],
    templateUrl: './playing-item.component.html',
    styleUrl: './playing-item.component.scss',
})
export class PlayingItemComponent {
    @Input() item: Item;
    @Input() tileType?: TileType; // ADD THIS

    private itemImageCorrespondance: { [key: string]: string } = FROM_ITEM_TO_IMAGE_ON_BOARD;

    get imageCorrespondance(): { [key: string]: string } {
        return this.itemImageCorrespondance;
    }

    // ADD THIS GETTER
    get itemImage(): string {
        if (this.item.name === ItemName.Torch) {
            return getTorchImageOnBoard(this.item.name, this.tileType);
        }
        return this.itemImageCorrespondance[this.item.name];
    }
}
