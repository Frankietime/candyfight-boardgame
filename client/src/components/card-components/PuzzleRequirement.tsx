import { DistrictIconsEnum } from "@candyfight/shared/enums";
import { districtIcons } from "../ui/GameIcon";

/**
 * The Puzzle challenge requirement, as printed on the card:
 * one card per district symbol + two "? ?" wildcards (any symbol cards).
 */
export const PuzzleRequirement = ({ iconSize = 14 }: { iconSize?: number }) => (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, flexWrap: "wrap" }}>
        {Object.values(DistrictIconsEnum).map(id => (
            <img key={id} src={districtIcons[id]} style={{ width: iconSize, height: iconSize }} />
        ))}
        <span style={{ fontWeight: 900, letterSpacing: "0.1em", fontSize: Math.round(iconSize * 0.85) }}>
            ? ?
        </span>
    </span>
);
