export interface AvatarDef {
    id: string;
    name: string;
    price: number;
    asset: string;
    nameKey: string;
}

export const AVATAR_CATALOG: Record<string, AvatarDef> = {
    'avt-wolf': { id: 'avt-wolf', name: 'Loup Alpha', price: 25, asset: 'assets/profiles/wolf-modified.png', nameKey: 'Alpha-wolf' },
    'avt-kangaroo': {
        id: 'avt-kangaroo',
        name: 'Kangourou Agile',
        price: 250,
        asset: 'assets/profiles/kangaroo-modified.png',
        nameKey: 'Agile-Kangaroo',
    },
    'avt-eagle': { id: 'avt-eagle', name: 'Aigle Royal', price: 300, asset: 'assets/profiles/eagle-modified.png', nameKey: 'Royal-eagle' },
    'avt-lion': { id: 'avt-lion', name: 'Lion Majestueux', price: 300, asset: 'assets/profiles/lion-modified.png', nameKey: 'Majestic-lion' },
};

export const avatarList: AvatarDef[] = Object.values(AVATAR_CATALOG);
export const assetFromId = (id: string) => AVATAR_CATALOG[id]?.asset ?? null;
