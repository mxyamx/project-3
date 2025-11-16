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
    'avt-warthog': { id: 'avt-warthog', name: 'Sanglier à 3 cornes', price: 75, asset: 'assets/profiles/warthog-modified.png', nameKey: 'warthog' },
    'avt-eagle': { id: 'avt-eagle', name: 'Aigle Royal', price: 300, asset: 'assets/profiles/eagle-modified.png', nameKey: 'Royal-eagle' },
    'avt-lion': { id: 'avt-lion', name: 'Lion Majestueux', price: 300, asset: 'assets/profiles/lion-modified.png', nameKey: 'Majestic-lion' },
    'avt-polar-bear': {
        id: 'avt-polar-bear',
        name: 'Ours Polaire Majestueux',
        price: 10,
        asset: 'assets/profiles/polar-bear-modified.png',
        nameKey: 'Polar-bear',
    },
    'avt-hippo': { id: 'avt-hippo', name: 'Hippopotame Doux', price: 150, asset: 'assets/profiles/hippo-modified.png', nameKey: 'Sweet-hippo' },
    'avt-black-panther': {
        id: 'avt-black-panther',
        name: 'Panthère Noire',
        price: 100,
        asset: 'assets/profiles/black-panther-modified.png',
        nameKey: 'Black-panther',
    },
    'avt-horse': { id: 'avt-horse', name: 'Cheval Fier', price: 5, asset: 'assets/profiles/horse-modified.png', nameKey: 'Proud-horse' },
    'avt-crocodile': {
        id: 'avt-crocodile',
        name: 'Crocodile Rusé',
        price: 50,
        asset: 'assets/profiles/crocodile-modified.png',
        nameKey: 'Cunning-crocodile',
    },
    'avt-tiger': { id: 'avt-tiger', name: 'Tigre Féroce', price: 5, asset: 'assets/profiles/tiger-modified.png', nameKey: 'Fierce-tiger' },
    'avt-giraffe': {
        id: 'avt-giraffe',
        name: 'Girafe Élégante',
        price: 200,
        asset: 'assets/profiles/giraffe-modified.png',
        nameKey: 'Elegant-giraffe',
    },
    'avt-penguin': {
        id: 'avt-penguin',
        name: 'Pingouin Puissant',
        price: 300,
        asset: 'assets/profiles/penguin-modified.png',
        nameKey: 'Powerful-penguin',
    },
    'avt-panda': {
        id: 'avt-panda',
        name: 'Panda Câlineux',
        price: 50,
        asset: 'assets/profiles/panda-modified.png',
        nameKey: 'panda-cuddly',
    },
};

export const avatarList: AvatarDef[] = Object.values(AVATAR_CATALOG);
export const assetFromId = (id: string) => AVATAR_CATALOG[id]?.asset ?? null;
