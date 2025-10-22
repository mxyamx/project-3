import { FormControl } from '@angular/forms';
import { GameMode } from '@common/enums/game-mode';
import { GamePrivacy } from '@common/enums/game-visibility';

export interface OptionForm {
    gameMode: FormControl<GameMode | null>;
    boardSize: FormControl<string | null>;
    gamePrivacy: FormControl<GamePrivacy | null>;
}
