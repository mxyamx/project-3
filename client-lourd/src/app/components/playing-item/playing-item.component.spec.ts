import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FROM_ITEM_NAME_TO_DESCRIPTION, FROM_ITEM_TO_IMAGE_ON_BOARD, ITEM_NAMES } from '@app/constants/objects-constants';
import { ItemType } from '@common/enums/item-type';
import { PlayingItemComponent } from './playing-item.component';

describe('PlayingItemComponent', () => {
    let component: PlayingItemComponent;
    let fixture: ComponentFixture<PlayingItemComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [PlayingItemComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(PlayingItemComponent);
        component = fixture.componentInstance;
        component.item = {
            type: ItemType.AttributeEditor,
            name: ITEM_NAMES.attributeEditor1,
            description: FROM_ITEM_NAME_TO_DESCRIPTION[ITEM_NAMES.attributeEditor1],
        };
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should return the correct item image list', () => {
        const result = component.imageCorrespondance;
        expect(result).toEqual(FROM_ITEM_TO_IMAGE_ON_BOARD);
    });
});
