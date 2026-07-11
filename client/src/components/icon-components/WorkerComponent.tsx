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

export const WorkerComponent = ({
    x,
    y,
    mirror,
    numerOfWorkers = 0,
    playerID,
    tutorAnchorId,
}: WorkerComponentProps) => {
    return (
        <div
            {...(tutorAnchorId ? { "data-tutor-id": tutorAnchorId } : {})}
            className={"absolute player-" + playerID + "-worker worker-container"}
            style={{ zIndex: 30 }} // agents always render above any board element
        >
            <div className="worker-container">
                {Array.from({length: numerOfWorkers}).map((_, index) => (
                    <div key={index} className="worker-image-container" style={{ left: index * 10, width: "60%", height: "60%" }}>
                        {/* objectFit keeps the sprite's original proportions inside the slot */}
                        <img
                            src={workerIconsByPlayerId[playerID]}
                            className="worker-outline"
                            style={{ width: "100%", height: "100%", objectFit: "contain" }}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};