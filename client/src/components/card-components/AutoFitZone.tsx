import { ReactNode, useLayoutEffect, useRef, useState } from "react";

const MIN_SCALE = 0.5;
const STEP = 0.05;

/**
 * An overprint zone that shrinks its font until the content fits its fixed
 * box (the effect boxes printed on the card canvas asset). Everything inside
 * is sized in em — PuzzleRequirement icons included — so it all scales down
 * together instead of overflowing or pushing icons out of the box.
 *
 * The shrink loop runs in useLayoutEffect, so it settles before paint.
 */
export const AutoFitZone = ({ className, children }: { className?: string; children: ReactNode }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);

    // Content changed → re-measure from full size
    useLayoutEffect(() => { setScale(1); }, [children]);

    // Shrink until it fits; each setScale re-renders and re-runs this
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el || scale <= MIN_SCALE) return;
        if (el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth) {
            setScale(s => Math.max(MIN_SCALE, +(s - STEP).toFixed(2)));
        }
    });

    return (
        <div ref={ref} className={className} style={{ fontSize: `${scale}em` }}>
            {children}
        </div>
    );
};
