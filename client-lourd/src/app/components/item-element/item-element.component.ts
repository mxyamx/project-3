import { Component, Input } from '@angular/core';
import { FROM_ITEM_NAME_TO_DESCRIPTION, FROM_ITEM_TO_IMAGE_ON_BOARD, getTorchImageOnBoard } from '@app/constants/objects-constants';
import { ItemName } from '@common/enums/item-name';
import { TileType } from '@common/enums/tile-type';
import { Item } from '@common/item';
import { TranslatePipe } from '@ngx-translate/core';
import { ItemDescriptionComponent } from '../item-description/item-description.component';

@Component({
    selector: 'app-item-element',
    imports: [TranslatePipe, ItemDescriptionComponent],
    templateUrl: './item-element.component.html',
    styleUrl: './item-element.component.scss',
})
export class ItemElementComponent {
    @Input() item: Item;
    @Input() tileType?: TileType; // ADD THIS

    itemImageCorrespondance: { [key: string]: string } = FROM_ITEM_TO_IMAGE_ON_BOARD;
    itemDescriptionCorrespondance: { [key: string]: string } = FROM_ITEM_NAME_TO_DESCRIPTION;

    // ADD THIS
    get itemImage(): string {
        if (this.item.name === ItemName.Torch && this.tileType) {
            return getTorchImageOnBoard(this.item.name, this.tileType);
        }
        return this.itemImageCorrespondance[this.item.name];
    }
}
