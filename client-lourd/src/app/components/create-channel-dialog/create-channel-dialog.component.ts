import { ChangeDetectionStrategy, Component, inject, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogActions, MatDialogClose, MatDialogContent, MatDialogRef, MatDialogTitle } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export interface CreateChannelData {
    title?: string;
}

@Component({
    selector: 'app-create-channel-dialog',
    standalone: true,
    templateUrl: './create-channel-dialog.component.html',
    styleUrls: ['./create-channel-dialog.component.scss'],
    imports: [FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateChannelDialogComponent {
    readonly dialogRef = inject(MatDialogRef<CreateChannelDialogComponent>);
    readonly channelName = model('');

    onNoClick(): void {
        this.dialogRef.close();
    }
}
