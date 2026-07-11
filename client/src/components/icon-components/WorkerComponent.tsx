import { workerIconsByPlayerId } from "./constants";

export interface WorkerComponentProps {
    mirror: number,
    x: number,
    y: number,
    numerOfWorkers: number;
    playerID: number;
    /** Tutorial signal anchor id, set on the root so the overlay can target it. */
    tutorAnchorId?: string;
}

/**
 * The current player's worker pool. The root box hugs the sprites tightly:
 * it is the tutorial glow anchor (a loose box reads as highlighting nothing)
 * and it must never block clicks on the hand cards below it.
 */
export const WorkerComponent = ({
    numerOfWorkers = 0,
    playerID,
    tutorAnchorId,
}: WorkerComponentProps) => {
    return (
        <div
            {...(tutorAnchorId ? { "data-tutor-id": tutorAnchorId } : {})}
            className={"absolute player-" + playerID + "-worker worker-container"}
            style={{ zIndex: 30, pointerEvents: "none" }}
        >
            {Array.from({ length: numerOfWorkers }).map((_, index) => (
                <img
                    key={index}
                    src={workerIconsByPlayerId[playerID]}
                    className="worker-outline"
                    style={{ height: 40, width: "auto" }}
                />
            ))}
        </div>
    );
};
