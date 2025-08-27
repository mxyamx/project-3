import { Component, Input } from '@angular/core';
import { FROM_ITEM_NAME_TO_DESCRIPTION, FROM_ITEM_TO_IMAGE_ON_BOARD } from '@app/constants/objects-constants';
import { Item } from '@common/item';

@Component({
    selector: 'app-item-element',
    imports: [],
    templateUrl: './item-element.component.html',
    styleUrl: './item-element.component.scss',
})
export class ItemElementComponent {
    @Input() item: Item;

    itemImageCorrespondance: { [key: string]: string } = FROM_ITEM_TO_IMAGE_ON_BOARD;
    itemDescriptionCorrespondance: { [key: string]: string } = FROM_ITEM_NAME_TO_DESCRIPTION;
}
