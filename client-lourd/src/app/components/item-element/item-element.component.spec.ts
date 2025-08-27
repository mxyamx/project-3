import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FROM_ITEM_NAME_TO_DESCRIPTION, ITEM_NAMES } from '@app/constants/objects-constants';
import { ItemType } from '@common/enums/item-type';
import { ItemElementComponent } from './item-element.component';

describe('ItemElementComponent', () => {
    let component: ItemElementComponent;
    let fixture: ComponentFixture<ItemElementComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ItemElementComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(ItemElementComponent);
        component = fixture.componentInstance;
        component.item = {
            type: ItemType.AttributeEditor,
            name: ITEM_NAMES.attributeEditor2,
            description: FROM_ITEM_NAME_TO_DESCRIPTION[ITEM_NAMES.attributeEditor2],
        };

        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
