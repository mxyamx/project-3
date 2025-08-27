import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormControl, FormGroup } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AvatarImgComponent } from './avatar-img.component';

describe('AvatarImgComponent', () => {
    let component: AvatarImgComponent;
    let fixture: ComponentFixture<AvatarImgComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [AvatarImgComponent, RouterLink],
        }).compileComponents();

        fixture = TestBed.createComponent(AvatarImgComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize with default values', () => {
        expect(component.selectedImage).toBeNull();
        expect(component.images.length).toBeGreaterThan(0);
        expect(component.selectedAvatars.size).toBe(0);
    });

    it('should emit selected image on button click', () => {
        const image = 'assets/avatars/bear.png';
        spyOn(component.imageSelected, 'emit');

        component.onImageButtonClick(image);

        expect(component.selectedImage).toBe(image);
        expect(component.imageSelected.emit).toHaveBeenCalledWith(image);
    });

    it('should emit null when deselecting an image', () => {
        const image = 'assets/avatars/bear.png';
        component.selectedImage = image;
        spyOn(component.imageSelected, 'emit');

        component.onImageButtonClick(image);

        expect(component.selectedImage).toBeNull();
        expect(component.imageSelected.emit).toHaveBeenCalledWith(null);
    });

    it('should not emit if image is disabled', () => {
        const image = 'assets/avatars/bear.png';
        component.selectedAvatars = new Set([image]);
        spyOn(component.imageSelected, 'emit');

        component.onImageButtonClick(image);

        expect(component.imageSelected.emit).not.toHaveBeenCalled();
    });

    it('should return true if image is disabled', () => {
        const image = 'assets/avatars/bear.png';
        component.selectedAvatars = new Set([image]);

        const result = component.isDisabled(image);

        expect(result).toBeTrue();
    });

    it('should return false if image is not disabled', () => {
        const image = 'assets/avatars/bear.png';
        component.selectedAvatars = new Set();

        const result = component.isDisabled(image);

        expect(result).toBeFalse();
    });

    it('should return false if image is selected', () => {
        const image = 'assets/avatars/bear.png';
        component.selectedAvatars = new Set([image]);
        component.selectedImage = image;

        const result = component.isDisabled(image);

        expect(result).toBeFalse();
    });

    it('should handle form group input', () => {
        const formGroup = new FormGroup({
            avatar: new FormControl(null),
        });
        component.formGroup = formGroup;

        expect(component.formGroup).toBe(formGroup);
    });
});
