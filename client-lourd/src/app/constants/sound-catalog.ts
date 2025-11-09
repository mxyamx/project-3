export interface SfxDef {
    id: string;
    name: string;
    price: number;
    asset: string; // URL to the audio file
}

export const sfxList: SfxDef[] = [
    { id: 'armor-sword-impact', name: 'Tranchant 8-bit', price: 10, asset: 'assets/sfx/armor-sword-impact.mp3' },
    { id: 'big-punch', name: 'Éclair rétro', price: 200, asset: 'assets/sfx/big-punch.mp3' },
];
