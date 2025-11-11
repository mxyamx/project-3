export interface SfxDef {
    id: string;
    name: string;
    price: number;
    asset: string; // URL to the audio file
}

export const sfxList: SfxDef[] = [
    { id: 'armor-sword-impact', name: 'Épée ranchante', price: 10, asset: 'assets/sfx/armor-sword-impact.mp3' },
    { id: 'big-punch', name: 'Coup de la mort', price: 200, asset: 'assets/sfx/big-punch.mp3' },
];
