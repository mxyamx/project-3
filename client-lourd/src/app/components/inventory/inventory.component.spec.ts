import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FROM_ITEM_TO_IMAGE_ON_BOARD } from '@app/constants/objects-constants';
import { InventoryComponent } from './inventory.component';

describe('InventoryComponent', () => {
    let component: InventoryComponent;
    let fixture: ComponentFixture<InventoryComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [InventoryComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(InventoryComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
    it('should return the correct item-to-image mapping', () => {
        const result = component.getItemImageCorrespondance();
        expect(result).toBe(FROM_ITEM_TO_IMAGE_ON_BOARD);
    });
});
