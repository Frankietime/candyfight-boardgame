import { useCallback, useRef, useState } from "react";

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
  /** Callback ref to attach to the outer container element */
  outerRef: (el: HTMLDivElement | null) => void;
  /** Board base width */
  baseWidth: number;
  /** Board base height */
  baseHeight: number;
}

/**
 * Custom hook for responsive board scaling.
 * Scales the board to fit the available viewport (both up and down).
 *
 * A callback ref (not a plain useRef + one-shot useLayoutEffect): callers
 * that conditionally render the container (e.g. the Mod Lab's TABLERO/MAZOS
 * tabs) unmount and remount the DOM node on every tab switch. A one-shot
 * effect would only ever observe the FIRST node — once that node detaches,
 * its clientWidth/clientHeight collapse to 0, freezing `scale` at MIN_SCALE
 * forever. The callback ref re-runs setup on every attach, so a fresh node
 * always gets a fresh measurement + ResizeObserver.
 */
export function useBoardScale(): UseBoardScaleResult {
  const [scale, setScale] = useState(1);
  const cleanupRef = useRef<(() => void) | null>(null);

  const outerRef = useCallback((el: HTMLDivElement | null) => {
    cleanupRef.current?.();
    cleanupRef.current = null;
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

    cleanupRef.current = () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  return {
    scale,
    outerRef,
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
