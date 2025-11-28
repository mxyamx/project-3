import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root',
})
export class AvatarUploadService {
    /**
     * Converts a File to a base64 data URL for storage in MongoDB
     * @param file The image file to convert
     * @returns Promise resolving to the base64 data URL
     */
    async fileToDataUrl(file: File): Promise<string> {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            throw new Error('File must be an image');
        }

        // Validate file size (max 2MB for database storage)
        const MAX_SIZE = 2 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
            throw new Error('File size must be less than 2MB');
        }

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /**
     * Checks if a URL is a custom uploaded avatar (base64 data URL)
     */
    isCustomAvatar(url: string): boolean {
        return url.startsWith('data:image/');
    }

    /**
     * Checks if a URL is a preset avatar
     */
    isPresetAvatar(url: string): boolean {
        return url.startsWith('assets/');
    }
}
