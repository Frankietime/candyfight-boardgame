/**
 * Anchor plumbing for the tutorial signal overlay.
 *
 * Components opt in by spreading {@link tutorAnchorProps} onto a DOM element; the
 * overlay then locates that element via its `data-tutor-id` attribute and reads its
 * screen rect (`getBoundingClientRect`) to draw glows/arrows. Screen coordinates are
 * used throughout, so the board's CSS scale transform is handled for free.
 */
import type { TutorAnchorId } from "@candyfight/shared/tutorial/types";

export const TUTOR_ANCHOR_ATTR = "data-tutor-id";

/** Spread onto a JSX element to make it targetable by tutorial signals. */
export const tutorAnchorProps = (id: TutorAnchorId | undefined) =>
    id ? { [TUTOR_ANCHOR_ATTR]: id } : {};

/** Resolves an anchor id to its current screen rect, or null if not mounted. */
export const resolveAnchorRect = (id: TutorAnchorId): DOMRect | null => {
    const el = document.querySelector<HTMLElement>(`[${TUTOR_ANCHOR_ATTR}="${id}"]`);
    return el ? el.getBoundingClientRect() : null;
};
