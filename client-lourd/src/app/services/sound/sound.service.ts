// sfx.service.ts
import { Injectable } from '@angular/core';
import { sfxList } from '@app/constants/sound-catalog';

@Injectable({ providedIn: 'root' })
export class SfxService {
    playById(sfxId: string): void {
        const sfx = sfxList.find((s) => s.id === sfxId);
        if (!sfx) {
            console.warn(`SFX not found for id: ${sfxId}`);
            return;
        }

        const audio = new Audio(sfx.asset);
        audio.volume = 0.8;
        audio.play().catch((err) => console.warn('Failed to play sfx:', err));
    }
}
