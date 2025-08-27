import { TestBed } from '@angular/core/testing';
import { GameSessionManagerService } from '@app/services/game-session-manager/game-session-manager.service';
import { Player } from '@common/player';
import { OpponentService } from './opponent.service';

describe('OpponentService', () => {
    let service: OpponentService;
    let gameSessionManagerServiceSpy: jasmine.SpyObj<GameSessionManagerService>;

    // Création de quelques joueurs de test
    const player1: Player = { name: 'Player 1' } as Player;
    const player2: Player = { name: 'Player 2' } as Player;
    const player3: Player = { name: 'Player 3' } as Player;

    beforeEach(() => {
        gameSessionManagerServiceSpy = jasmine.createSpyObj('GameSessionManagerService', ['listOfPlayers', 'chosenPlayer']);
        TestBed.configureTestingModule({
            providers: [OpponentService, { provide: GameSessionManagerService, useValue: gameSessionManagerServiceSpy }],
        });
        service = TestBed.inject(OpponentService);
    });

    it('devrait retourner le Player 2 quand le joueur courant est le Player 1 dans un jeu à deux joueurs', () => {
        gameSessionManagerServiceSpy.listOfPlayers.and.returnValue([player1, player2]);
        gameSessionManagerServiceSpy.chosenPlayer.and.returnValue(player1);

        const opponent = service.getOpponent();
        expect(opponent).toEqual(player2);
    });

    it('devrait retourner le joueur opposé quand le joueur courant est le Player 2 dans un jeu à deux joueurs', () => {
        gameSessionManagerServiceSpy.listOfPlayers.and.returnValue([player1, player2]);
        gameSessionManagerServiceSpy.chosenPlayer.and.returnValue(player2);

        const opponent = service.getOpponent();
        expect(opponent).toEqual(player1);
    });

    it('devrait toujours retourner le (le Player 2) dans un jeu à plusieurs joueurs lorsque le joueur courant est le Player 1', () => {
        gameSessionManagerServiceSpy.listOfPlayers.and.returnValue([player1, player2, player3]);
        gameSessionManagerServiceSpy.chosenPlayer.and.returnValue(player1);

        const opponent = service.getOpponent();
        expect(opponent).toEqual(player2);
    });

    it('devrait lever une erreur lorsque aucun adversaire n’est disponible', () => {
        gameSessionManagerServiceSpy.listOfPlayers.and.returnValue([player1]);
        gameSessionManagerServiceSpy.chosenPlayer.and.returnValue(player1);

        expect(() => service.getOpponent()).toThrowError('aucun adversaire trouve');
    });

    it('devrait lever une erreur quand listOfPlayers est indéfini', () => {
        gameSessionManagerServiceSpy.listOfPlayers.and.returnValue([] as Player[]);
        gameSessionManagerServiceSpy.chosenPlayer.and.returnValue(player1);

        expect(() => service.getOpponent()).toThrowError('aucun adversaire trouve');
    });

    it('devrait lever une erreur quand chosenPlayer est nul', () => {
        gameSessionManagerServiceSpy.listOfPlayers.and.returnValue([player1, player2]);
        gameSessionManagerServiceSpy.chosenPlayer.and.returnValue(null as unknown as Player);

        expect(() => service.getOpponent()).toThrowError('aucun adversaire trouve');
    });
});
