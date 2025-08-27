export enum ValidationErrors {
    AbsentName = 'Le jeu doit avoir un nom.',
    AbsentDescription = 'Le jeu doit avoir une description.',
    ExistingName = 'Il existe déjà un jeu avec le même nom: utilisez un nom différent.',
    InvalidTerrainTiles = 'Plus de 50% de la surface totale de la zone de jeu doit être occupée par des tuiles de terrain.',
    InaccessibleTiles = 'Tuile de terrain ne pas doit être inaccessible à cause d’un agencement de murs.',
    IncorrectlyPlacedDoor = 'Chaque tuile de porte doit se trouver entre deux tuiles de mur sur un même axe' +
        ' et ne peut pas être placée sur les bords de la zone de jeu.',
    MissingEntryPoints = 'Tous les points de départ doivent été placés.',
    MissingFlag = 'Le drapeau doit être placé.',
}
