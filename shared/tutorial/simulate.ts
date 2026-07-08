/**
 * Reference "happy path" runner for a chapter — applies each step's scripted
 * setup (onEnter) and the expected player interaction through the TutorEngine.
 *
 * Used by the chapter scenario tests (and handy for headless verification): it
 * mirrors what the client's TutorController does when the player follows the
 * highlighted instructions exactly.
 */
import { TutorEngine } from "./tutorEngine";
import { TutorChapter } from "./types";
import { createParams } from "../actions/action-params";

const HUMAN = "0";
const TRASH_COUNT = 2;

export const simulateChapter = (chapter: TutorChapter): TutorEngine => {
    const engine = new TutorEngine(chapter.initialState());

    for (const step of chapter.steps) {
        step.onEnter?.(engine);

        const interaction = step.interaction ?? { kind: "none" };
        switch (interaction.kind) {
            case "selectCard":
                engine.selectCard(HUMAN, interaction.cardId);
                break;
            case "placeWorker":
                engine.selectCard(HUMAN, interaction.cardId);
                engine.placeWorker(HUMAN, interaction.districtIndex, interaction.locationIndex, interaction.cardId);
                break;
            case "buyCard": {
                engine.selectCard(HUMAN, interaction.cardId);
                const player = engine.getPlayer(HUMAN);
                const cardIds = player.hand
                    .filter(c => c.id !== interaction.cardId)
                    .slice(0, TRASH_COUNT)
                    .map(c => c.id);
                const targetCardId = engine.state.cardMarket[interaction.marketIndex]?.id ?? "";
                engine.placeWorker(HUMAN, interaction.districtIndex, interaction.locationIndex, interaction.cardId, {
                    costParams: createParams.trash(cardIds),
                    rewardParams: createParams.buyCard(targetCardId),
                });
                break;
            }
            case "reveal":
                engine.reveal(HUMAN);
                break;
            default:
                break;
        }
    }

    return engine;
};
