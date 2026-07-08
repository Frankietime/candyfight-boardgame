/**
 * TutorOverlay — full-viewport focus layer drawn above the board.
 *
 * For the active step's {@link TutorSignal}s it renders:
 *  - **glow rings** around target anchors (reusing the game's `--color-glow` language), and
 *  - **from→to arrows** (animated SVG) between two anchors.
 *
 * Anchor rects are re-read every animation frame so the overlay tracks board scaling,
 * scrolling and layout shifts. The layer is `pointer-events: none` except for an
 * optional dimming scrim that blocks clicks outside the focused targets.
 */
import { useEffect, useRef, useState } from "react";
import type { TutorSignal } from "@candyfight/shared/tutorial/types";
import { resolveAnchorRect } from "./anchors";
import { useT } from "../../i18n/useT";

type ResolvedGlow = { id: string; rect: DOMRect };
type ResolvedArrow = { id: string; from: DOMRect; to: DOMRect; label?: string };

type Resolved = { glows: ResolvedGlow[]; arrows: ResolvedArrow[] };

const PAD = 10; // glow ring padding around the target (room for the thick golden border)

/** Zero-size rect at a point (used as a synthetic arrow source). */
const pointRect = (x: number, y: number): DOMRect =>
    ({ left: x, top: y, right: x, bottom: y, width: 0, height: 0, x, y, toJSON: () => "" } as DOMRect);

/**
 * Source point for a "pointer" arrow (no explicit `from`): the top-center of the
 * narration dialog, so the arrow visibly travels from the step to the target. If
 * the dialog isn't mounted, fall back to a point just up-and-left of the target.
 */
const pointerFromRect = (to: DOMRect): DOMRect => {
    const dialog = resolveAnchorRect("tutor-dialog");
    if (dialog) return pointRect(dialog.left + dialog.width / 2, dialog.top);
    const gap = Math.max(70, to.height + 30);
    return pointRect(to.left - gap * 0.7, to.top - gap);
};

const resolveSignals = (signals: TutorSignal[]): Resolved => {
    const glows: ResolvedGlow[] = [];
    const arrows: ResolvedArrow[] = [];
    signals.forEach((s, i) => {
        if (s.kind === "glow") {
            const rect = resolveAnchorRect(s.anchor);
            if (rect) glows.push({ id: `${s.anchor}-${i}`, rect });
        } else {
            const to = resolveAnchorRect(s.to);
            if (!to) return;
            // Pointer arrow (no `from`): draw an arrow from the dialog into the target.
            const from = s.from ? resolveAnchorRect(s.from) : pointerFromRect(to);
            if (from) arrows.push({ id: `${s.from ?? "ptr"}->${s.to}-${i}`, from, to, label: s.label });
        }
    });
    return { glows, arrows };
};

const center = (r: DOMRect) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });

export interface TutorOverlayProps {
    signals: TutorSignal[];
    /** When true, dims the screen and blocks clicks outside glow targets. */
    dim?: boolean;
    /** Raise above selection modals so glows on modal cards are visible. */
    elevated?: boolean;
}

export const TutorOverlay = ({ signals, dim = false, elevated = false }: TutorOverlayProps) => {
    const t = useT();
    const [resolved, setResolved] = useState<Resolved>({ glows: [], arrows: [] });
    const frame = useRef<number>();

    useEffect(() => {
        const tick = () => {
            setResolved(resolveSignals(signals));
            frame.current = requestAnimationFrame(tick);
        };
        frame.current = requestAnimationFrame(tick);
        return () => {
            if (frame.current) cancelAnimationFrame(frame.current);
        };
    }, [signals]);

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                zIndex: elevated ? 2147483645 : 1000,
                pointerEvents: "none",
            }}
            aria-hidden
        >
            {/* Dimming scrim with holes punched over the glow targets */}
            {dim && (
                <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
                    <defs>
                        <mask id="tutor-scrim-mask">
                            <rect width="100%" height="100%" fill="white" />
                            {resolved.glows.map(g => (
                                <rect
                                    key={`hole-${g.id}`}
                                    x={g.rect.left - PAD}
                                    y={g.rect.top - PAD}
                                    width={g.rect.width + PAD * 2}
                                    height={g.rect.height + PAD * 2}
                                    rx={8}
                                    fill="black"
                                />
                            ))}
                        </mask>
                    </defs>
                    <rect
                        width="100%"
                        height="100%"
                        fill="rgba(0,0,0,0.55)"
                        mask="url(#tutor-scrim-mask)"
                        style={{ pointerEvents: "auto" }}
                    />
                </svg>
            )}

            {/* Glow rings */}
            {resolved.glows.map(g => (
                <div
                    key={`glow-${g.id}`}
                    className="tutor-glow-ring"
                    style={{
                        position: "fixed",
                        left: g.rect.left - PAD,
                        top: g.rect.top - PAD,
                        width: g.rect.width + PAD * 2,
                        height: g.rect.height + PAD * 2,
                    }}
                />
            ))}

            {/* Arrows */}
            <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
                <defs>
                    <marker
                        id="tutor-arrowhead"
                        markerWidth="10"
                        markerHeight="10"
                        refX="7"
                        refY="3"
                        orient="auto"
                    >
                        <path d="M0,0 L7,3 L0,6 Z" fill="var(--tutor-red, #ff2733)" />
                    </marker>
                </defs>
                {resolved.arrows.map(a => {
                    const from = center(a.from);
                    const to = center(a.to);
                    const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
                    return (
                        <g key={`arrow-${a.id}`}>
                            <line
                                x1={from.x}
                                y1={from.y}
                                x2={to.x}
                                y2={to.y}
                                stroke="var(--tutor-red, #ff2733)"
                                strokeWidth={6}
                                strokeLinecap="round"
                                strokeDasharray="10 8"
                                markerEnd="url(#tutor-arrowhead)"
                                className="tutor-arrow-line"
                            />
                            {a.label && (
                                <text
                                    x={mid.x}
                                    y={mid.y - 8}
                                    textAnchor="middle"
                                    fill="#111"
                                    stroke="#fff"
                                    strokeWidth={4}
                                    paintOrder="stroke"
                                    style={{ fontWeight: 900, fontSize: 13 }}
                                >
                                    {t(a.label)}
                                </text>
                            )}
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};
