import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ProfileAvatar } from '@common/enums/avatar';

@Component({
  selector: 'app-profile-avatar-img',
  imports: [CommonModule],
  templateUrl: './profile-avatar-img.component.html',
  styleUrl: './profile-avatar-img.component.scss'
})
export class ProfileAvatarImgComponent {
  @Input() formGroup!: FormGroup;
      @Input() selectedAvatars: Set<string> = new Set();
      @Output() imageSelected = new EventEmitter<string | null>();
      selectedImage: string | null = null;
  
      images = [
          ProfileAvatar.Avatar1,
          ProfileAvatar.Avatar2,
          ProfileAvatar.Avatar3,
          ProfileAvatar.Avatar4,
          ProfileAvatar.Avatar5,
          ProfileAvatar.Avatar6,
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
