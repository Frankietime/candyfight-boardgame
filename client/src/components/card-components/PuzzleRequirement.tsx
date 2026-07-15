import { DistrictIconsEnum } from "@candyfight/shared/enums";
import { districtIcons } from "../ui/GameIcon";

/**
 * The Puzzle challenge requirement, as printed on the card:
 * one card per district symbol + two "? ?" wildcards (any symbol cards).
 * Sized in em by default so it scales with the card's font (hand card vs
 * centered preview) instead of overflowing the canvas effect box.
 */
export const PuzzleRequirement = ({ iconSize = "1.4em" }: { iconSize?: number | string }) => (
    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.2em", flexWrap: "wrap" }}>
        {Object.values(DistrictIconsEnum).map(id => (
            <img key={id} src={districtIcons[id]} style={{ width: iconSize, height: iconSize }} />
        ))}
        <span style={{ fontWeight: 900, letterSpacing: "0.1em", fontSize: "0.9em" }}>
            ? ?
        </span>
    </span>
);
