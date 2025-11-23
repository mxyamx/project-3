import { Component, Input } from '@angular/core';
import { FROM_ITEM_NAME_TO_DESCRIPTION, FROM_ITEM_TO_IMAGE_ON_BOARD } from '@app/constants/objects-constants';
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

    itemImageCorrespondance: { [key: string]: string } = FROM_ITEM_TO_IMAGE_ON_BOARD;
    itemDescriptionCorrespondance: { [key: string]: string } = FROM_ITEM_NAME_TO_DESCRIPTION;
}
