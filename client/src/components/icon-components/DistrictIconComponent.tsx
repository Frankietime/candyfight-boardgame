import { districtIconsDict } from "./constants";

export type DistrictIconComponentProps = {
    districtId: string;
    /** px number or CSS length; em lets the icon scale with the card font */
    size?: number | string;
}

export const DistrictIconComponent = ({ districtId, size = 25 }: DistrictIconComponentProps) => {
    return (
        <img
            style={{height: size, width: size, display: "inline", }}
            src={districtIconsDict[districtId]}
        />
    )
}