import { useLayoutEffect, useRef, useState } from "react";

/** Base dimensions for the game board */
export const BOARD_DIMENSIONS = {
  WIDTH: 1280,
  HEIGHT: 720,
} as const;

/** Minimum scale to prevent illegible UI on very small viewports */
const MIN_SCALE = 0.5;

export interface UseBoardScaleResult {
  /** Current scale factor */
  scale: number;
  /** Ref to attach to the outer container element */
  outerRef: React.RefObject<HTMLDivElement>;
  /** Board base width */
  baseWidth: number;
  /** Board base height */
  baseHeight: number;
}

/**
 * Custom hook for responsive board scaling.
 * Scales the board to fit the available viewport (both up and down).
 */
export function useBoardScale(): UseBoardScaleResult {
  const outerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = outerRef.current;
    if (!el) return;

    const update = () => {
      const availW = el.clientWidth;
      const availH = el.clientHeight;
      const s = Math.max(MIN_SCALE, Math.min(availW / BOARD_DIMENSIONS.WIDTH, availH / BOARD_DIMENSIONS.HEIGHT));
      setScale(s);
    };

    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  return {
    scale,
    outerRef: outerRef as React.RefObject<HTMLDivElement>,
    baseWidth: BOARD_DIMENSIONS.WIDTH,
    baseHeight: BOARD_DIMENSIONS.HEIGHT,
  };
}

/**
 * Utility to generate CSS custom property style object for scale
 */
export function getScaleStyle(scale: number): React.CSSProperties {
  return {
    "--scale": scale,
  } as React.CSSProperties;
}

/**
 * Utility to generate board container styles (transform handled by CSS class via --scale variable)
 */
// Board backdrop under the (transparent-margin) board art: turquoise core
// fading out to a dark gray at the edges.
const BOARD_EDGE_GRAY = "#4a4a4a";
const BOARD_BACKDROP_GRADIENT =
  `radial-gradient(ellipse at center, #40e0d0 0%, #58a9a1 40%, ${BOARD_EDGE_GRAY} 78%)`;

export function getBoardContainerStyle(
  backgroundImage?: string
): React.CSSProperties {
  return {
    width: BOARD_DIMENSIONS.WIDTH,
    height: BOARD_DIMENSIONS.HEIGHT,
    backgroundColor: BOARD_EDGE_GRAY,
    // First layer paints on top: the board art sits over the gradient.
    backgroundImage: backgroundImage
      ? `url(${backgroundImage}), ${BOARD_BACKDROP_GRADIENT}`
      : BOARD_BACKDROP_GRADIENT,
    backgroundSize: "100% 100%, 100% 100%",
    imageRendering: "crisp-edges",
  } as React.CSSProperties;
}
