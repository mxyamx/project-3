export interface SfxDef {
    id: string;
    name: string;
    price: number;
    asset: string;
    nameKey?: string;
}

export const sfxList: SfxDef[] = [
    { id: 'armor-sword-impact', name: 'Épée ranchante', price: 10, asset: 'assets/sfx/armor-sword-impact.mp3', nameKey: 'Sword-Clash' },
    { id: 'big-punch', name: 'Coup de la mort', price: 200, asset: 'assets/sfx/big-punch.mp3', nameKey: 'Punch-of-death' },
    { id: 'quick-swing-sound', name: 'Attaque éclair', price: 15, asset: 'assets/sfx/quick-swing-sound.mp3', nameKey: 'Swift-attack' },
    { id: 'monster-attack', name: 'Attaque monstrueuse', price: 50, asset: 'assets/sfx/monster-attack.mp3', nameKey: 'Monster-attack' },
    { id: 'explosion', name: 'Explosion', price: 75, asset: 'assets/sfx/explosion.mp3', nameKey: 'Explosion' },
    { id: 'evil-laugh', name: 'Rire maléfique', price: 30, asset: 'assets/sfx/evil-laugh.mp3', nameKey: 'Evil-laugh' },
    { id: 'quick-knife-cutting', name: 'Coup de couteau', price: 20, asset: 'assets/sfx/quick-knife-slice-cutting.mp3', nameKey: 'knife-cutting' },
];
