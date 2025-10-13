import { Component, Input } from '@angular/core';
import { Item } from '@common/item';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'app-item-description',
    standalone: true,
    imports: [TranslatePipe],
    templateUrl: './item-description.component.html',
    styleUrl: './item-description.component.scss',
})
export class ItemDescriptionComponent {
    @Input() item: Item;
}
