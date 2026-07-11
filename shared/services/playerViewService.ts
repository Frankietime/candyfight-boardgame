import { GameState, PlayerGameState, PlayerViewModel, PlayerPublicOrPrivate, Dictionary } from "../types";

/**
 * Transforms a player's private state to public view.
 * Only exposes information that should be visible to other players.
 */
export const toPublicPlayer = (player: PlayerGameState): PlayerViewModel => ({
    id: player.id,
    characterId: player.characterId,
    hasRevealed: player.hasRevealed,
    currentNumberOfWorkers: player.currentNumberOfWorkers,
    victoryPoints: player.victoryPoints,
    deckLength: player.deck.length,
    discardPile: player.discardPile,
    trashPile: player.trashPile,
    cardsInPlay: player.cardsInPlay ?? [],
    handLength: player.hand.length,
    candy: player.candy,
    loot: player.loot,
});

/**
 * Filters game state for a specific player.
 *
 * - Current player sees their full private state in `players[playerID]`
 * - All other players are transformed to public view (PlayerViewModel)
 * - Spectators (playerID === null) see only public views
 *
 * NOTE: Returns GameState for boardgame.io compatibility, but the actual runtime
 * type is ClientGameState (mixed player types, public ranking). Client code should:
 * 1. Use isFullPlayerState() type guard when accessing current player's private data
 * 2. Use playersViewModel for displaying all players' public info
 */
export const playerView = ({ G, playerID }: { G: GameState; playerID: string | null }): GameState => {
    const filteredPlayers: Dictionary<PlayerPublicOrPrivate> = {};

    for (const [id, player] of Object.entries(G.players)) {
        if (id === playerID) {
            // Current player sees their full state
            filteredPlayers[id] = player;
        } else {
            // Other players only see public info
            filteredPlayers[id] = toPublicPlayer(player);
        }
    }

    // Create playersViewModel for UI display (all players as public view)
    const playersViewModel: PlayerViewModel[] = Object.values(G.players).map(toPublicPlayer);

    // Type assertion required for boardgame.io compatibility.
    // Runtime type is actually ClientGameState - use isFullPlayerState() guard for safety.
    return {
        ...G,
        players: filteredPlayers as Dictionary<PlayerGameState>,
        ranking: G.ranking.map(toPublicPlayer) as unknown as PlayerGameState[],
        playersViewModel,
    };
};
