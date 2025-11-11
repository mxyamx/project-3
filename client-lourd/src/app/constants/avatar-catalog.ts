export interface AvatarDef {
    id: string;
    name: string;
    price: number;
    asset: string;
}

export const AVATAR_CATALOG: Record<string, AvatarDef> = {
    'avt-wolf': { id: 'avt-wolf', name: 'Loup Alpha', price: 25, asset: 'assets/profiles/wolf-modified.png' },
    'avt-kangaroo': { id: 'avt-kangaroo', name: 'Kangourou Agile', price: 250, asset: 'assets/profiles/kangaroo-modified.png' },
    'avt-eagle': { id: 'avt-eagle', name: 'Aigle Royal', price: 300, asset: 'assets/profiles/eagle-modified.png' },
    'avt-lion': { id: 'avt-lion', name: 'Lion Majestueux', price: 300, asset: 'assets/profiles/lion-modified.png' },
};

export const avatarList: AvatarDef[] = Object.values(AVATAR_CATALOG);
export const assetFromId = (id: string) => AVATAR_CATALOG[id]?.asset ?? null;
