import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Avatar } from '@common/enums/avatar';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'app-avatar-img',
    standalone: true,
    imports: [CommonModule, TranslatePipe],
    templateUrl: './avatar-img.component.html',
    styleUrls: ['./avatar-img.component.scss'],
})
export class AvatarImgComponent {
    @Input() formGroup!: FormGroup;
    @Input() selectedAvatars: Set<string> = new Set();
    @Output() imageSelected = new EventEmitter<string | null>();
    selectedImage: string | null = null;

    images = [
        Avatar.Avatar1,
        Avatar.Avatar2,
        Avatar.Avatar3,
        Avatar.Avatar4,
        Avatar.Avatar5,
        Avatar.Avatar6,
        Avatar.Avatar7,
        Avatar.Avatar8,
        Avatar.Avatar9,
        Avatar.Avatar10,
        Avatar.Avatar11,
        Avatar.Avatar12,
    ];

    onImageButtonClick(image: string) {
        if (this.isDisabled(image)) {
            return;
        }

        if (this.selectedImage === image) {
            this.selectedImage = null;
            this.imageSelected.emit(null);
        } else {
            this.selectedImage = image;
            this.imageSelected.emit(image);
        }
    }

    isDisabled(image: string): boolean {
        return this.selectedAvatars.has(image) && image !== this.selectedImage;
    }
}
