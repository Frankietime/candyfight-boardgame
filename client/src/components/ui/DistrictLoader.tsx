import { useEffect, useState } from "react";
import D1 from "../../assets/board/district-1-icon.png";
import D2 from "../../assets/board/district-2-icon.png";
import D3 from "../../assets/board/district-3-icon.png";
import D4 from "../../assets/board/district-4-icon.png";

const ICONS = [D1, D2, D3, D4];
const INTERVAL_MS = 420;

interface DistrictLoaderProps {
    label?: string;
}

export const DistrictLoader = ({ label = "Loading…" }: DistrictLoaderProps) => {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const id = setInterval(() => setIndex(i => (i + 1) % ICONS.length), INTERVAL_MS);
        return () => clearInterval(id);
    }, []);

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 16,
                height: "100%",
                width: "100%",
                fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
            }}
        >
            <div
                style={{
                    border: "3px solid #000",
                    boxShadow: "6px 6px 0 #000",
                    backgroundColor: "#e0d4fc",
                    padding: 20,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <img
                    src={ICONS[index]}
                    alt="Loading"
                    style={{ width: 56, height: 56, display: "block" }}
                />
            </div>
            <span
                style={{
                    fontSize: 13,
                    fontWeight: 900,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "#333",
                }}
            >
                {label}
            </span>
        </div>
    );
};
