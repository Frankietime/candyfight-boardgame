import { GameState, LogEntry, ResourceBag } from '../types';
import { resourceLabel } from './resourceServices';

const MAX_LOG_ENTRIES = 150;

export const appendLog = (G: GameState, entry: Omit<LogEntry, 'id'>): void => {
    G.log.push({ ...entry, id: String(G.log.length) });
    if (G.log.length > MAX_LOG_ENTRIES) G.log = G.log.slice(-MAX_LOG_ENTRIES);
};

/**
 * Formats a list of resource bags into a readable string.
 * Pass negate=true for costs (amounts are stored positive but represent deductions).
 */
export const formatResources = (resources: ResourceBag[], negate = false): string =>
    resources
        .filter(r => r.amount !== 0)
        .map(r => {
            const delta = negate ? -r.amount : r.amount;
            return `${delta > 0 ? '+' : ''}${delta} ${resourceLabel(r.resourceId)}`;
        })
        .join(', ');
