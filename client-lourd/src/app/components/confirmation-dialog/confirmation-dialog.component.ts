import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogActions, MatDialogClose, MatDialogContent, MatDialogRef, MatDialogTitle } from '@angular/material/dialog';
import { ConfirmationDialogData } from '@app/interfaces/confirmation-dialog-date';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'app-confirmation-dialog.component',
    templateUrl: 'confirmation-dialog.component.html',
    styleUrl: 'confirmation-dialog.component.scss',
    imports: [MatButtonModule, MatDialogActions, MatDialogClose, MatDialogTitle, MatDialogContent, TranslatePipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmationDialogComponent {
    readonly dialogRef = inject(MatDialogRef<ConfirmationDialogComponent>);
    data = inject<ConfirmationDialogData>(MAT_DIALOG_DATA);
}
