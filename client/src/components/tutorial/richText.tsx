/**
 * Minimal inline-bold renderer for tutorial narration.
 *
 * Message strings mark keywords (phases, cards, locations, resources, …) with
 * `**double asterisks**`; this splits on those and wraps them in <strong>, so
 * emphasis lives in the (translatable) message text rather than in markup.
 */
import { Fragment, ReactNode } from "react";

const BOLD = /\*\*([^*]+)\*\*/g;

export const renderBold = (text: string): ReactNode => {
    const nodes: ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let key = 0;

    BOLD.lastIndex = 0;
    while ((match = BOLD.exec(text)) !== null) {
        if (match.index > lastIndex) {
            nodes.push(<Fragment key={key++}>{text.slice(lastIndex, match.index)}</Fragment>);
        }
        nodes.push(<strong key={key++}>{match[1]}</strong>);
        lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
        nodes.push(<Fragment key={key++}>{text.slice(lastIndex)}</Fragment>);
    }
    return nodes;
};
