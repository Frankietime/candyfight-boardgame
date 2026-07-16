import { DistrictIconsEnum } from "@candyfight/shared/enums";
import { DEFAULT_PUZZLE_REQUIREMENT, PuzzleProgress, PuzzleRequirementSpec } from "@candyfight/shared/services/puzzleService";
import { districtIcons } from "../ui/GameIcon";

/** Small diagonal strike over a fulfilled requirement slot. */
const Strike = () => (
    <svg
        width="100%"
        height="100%"
        preserveAspectRatio="none"
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
        <line x1="10%" y1="90%" x2="90%" y2="10%" stroke="#40e0d0" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
);

/**
 * The Puzzle challenge requirement: a mod-author-configurable combination of
 * district-symbol icons plus "?" wildcards (any symbol, from any card).
 * Printed plainly on the card face (no `progress`); in the reveal-resolution
 * modal, `progress` (from getPuzzleProgress) crosses out each slot live as
 * the player selects cards.
 */
export const PuzzleRequirement = ({
    iconSize = "1.4em",
    requirement = DEFAULT_PUZZLE_REQUIREMENT,
    progress,
}: {
    iconSize?: number | string;
    requirement?: PuzzleRequirementSpec;
    progress?: PuzzleProgress;
}) => {
    const symbolEntries = (Object.entries(requirement.symbolCounts) as [DistrictIconsEnum, number][])
        .filter(([, count]) => (count ?? 0) > 0);

    return (
        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.2em", flexWrap: "wrap" }}>
            {symbolEntries.flatMap(([symbol, count]) => {
                const have = progress?.symbolProgress.find(p => p.symbol === symbol)?.have ?? 0;
                return Array.from({ length: count }).map((_, i) => {
                    const fulfilled = i < have;
                    return (
                        <span key={`${symbol}-${i}`} style={{ position: "relative", display: "inline-block", width: iconSize, height: iconSize }}>
                            <img src={districtIcons[symbol]} style={{ width: iconSize, height: iconSize, opacity: fulfilled ? 0.4 : 1 }} />
                            {fulfilled && <Strike />}
                        </span>
                    );
                });
            })}
            {Array.from({ length: requirement.wildcards }).map((_, i) => {
                const fulfilled = i < (progress?.wildcardsHave ?? 0);
                return (
                    <span
                        key={`wc-${i}`}
                        style={{
                            position: "relative", display: "inline-block",
                            fontWeight: 900, letterSpacing: "0.1em", fontSize: "0.9em",
                            opacity: fulfilled ? 0.4 : 1,
                            textDecoration: fulfilled ? "line-through" : undefined,
                            textDecorationColor: "#40e0d0",
                            textDecorationThickness: "2px",
                        }}
                    >
                        ?
                    </span>
                );
            })}
        </span>
    );
};
