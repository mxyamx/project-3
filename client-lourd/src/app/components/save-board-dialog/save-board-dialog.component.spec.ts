import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SaveBoardDialogComponent } from './save-board-dialog.component';

describe('SaveBoardDialogComponent', () => {
    let component: SaveBoardDialogComponent;
    let fixture: ComponentFixture<SaveBoardDialogComponent>;

    const mockDialogRef = {
        close: jasmine.createSpy('close'),
    };

    const mockDialogData = {
        message: 'Error 1.Error 2.',
        success: false,
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [SaveBoardDialogComponent],
            providers: [
                {
                    provide: MatDialogRef,
                    useValue: mockDialogRef,
                },
                { provide: MAT_DIALOG_DATA, useValue: mockDialogData },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(SaveBoardDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should trim the messages', () => {
        expect(component.errorMessages).toEqual(['Error 1', 'Error 2']);
    });

    it('should close the modal properly', () => {
        component.close();
        expect(mockDialogRef.close).toHaveBeenCalled();
    });
});
