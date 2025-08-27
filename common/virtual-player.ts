import { VirtualPlayerProfile } from "./enums/virtual-player-profile";
import { Player } from "./player";

export interface VirtualPlayer extends Player {
    virtualPlayer : true;
    organizer: false;
    profile: VirtualPlayerProfile;
}