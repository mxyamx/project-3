import { FormControl } from '@angular/forms';
import { GameMode } from '@common/enums/game-mode';

export interface OptionForm {
    gameMode: FormControl<GameMode | null>;
    boardSize: FormControl<string | null>;
}
