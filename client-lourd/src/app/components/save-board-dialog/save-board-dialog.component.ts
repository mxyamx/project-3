import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

@Component({
    selector: 'app-save-board-dialog',
    standalone: true,
    imports: [MatDialogModule, MatButtonModule],
    templateUrl: './save-board-dialog.component.html',
    styleUrl: './save-board-dialog.component.scss',
})
export class SaveBoardDialogComponent {
    errorMessages: string[];

    constructor(
        public dialogRef: MatDialogRef<SaveBoardDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { message: string; success: boolean },
    ) {
        this.errorMessages = data.message.split('.').filter((error) => error.trim() !== '');
    }

    close(): void {
        this.dialogRef.close();
    }
}
