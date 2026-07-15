import { actionRegistry } from '@candyfight/shared/actions';
import { LocationActionsEnum, ResourceEnum } from '@candyfight/shared/enums';
import { CostAction, ResourceBag, RewardAction } from '@candyfight/shared/types';
import { ModLocation } from '@candyfight/shared/mods';
import { discardCost, trashCost } from '@candyfight/shared/services/actions/requirements';
import { resourceEmojiDict } from '../icon-components/constants';
import { useT } from '../../i18n/useT';
import { nb, BrutalButton, inputStyle } from '../ui/nb';

/**
 * Editable list of cost or reward entries for a location.
 * An entry is `type + amount`; types are built from game data (ResourceEnum +
 * the action registry), never hardcoded lists — a mod-driven editor.
 */

export type EffectEntry = { kind: 'resource' | 'action'; id: string; amount: number };

type EffectBag = ModLocation['cost'] | ModLocation['reward'];

/** Actions whose amount is meaningful (selection/draw count). */
const AMOUNT_ACTIONS = new Set<string>([
  LocationActionsEnum.DISCARD,
  LocationActionsEnum.TRASH,
  LocationActionsEnum.DRAW,
]);

const RESOURCE_EMOJI: Record<string, string> = {
  [ResourceEnum.Candy]: '🍬',
  [ResourceEnum.Loot]: '💰',
  ...resourceEmojiDict,
};

export const toEntries = (bag: EffectBag): EffectEntry[] => [
  ...(bag.resources ?? []).map((r): EffectEntry => ({ kind: 'resource', id: r.resourceId, amount: r.amount })),
  ...(bag.actions ?? []).map((a): EffectEntry => ({
    kind: 'action',
    id: a.actionId,
    amount: (a.params?.selectionNumber as number | undefined) ?? (a.params?.count as number | undefined) ?? 1,
  })),
];

const toResources = (entries: EffectEntry[]): ResourceBag[] =>
  entries
    .filter(e => e.kind === 'resource')
    .map(e => ({ resourceId: e.id as ResourceEnum, amount: e.amount }));

/** Cost actions go through the canonical builders (params + requirements). */
const toCostAction = (entry: EffectEntry): CostAction => {
  switch (entry.id) {
    case LocationActionsEnum.DISCARD: return discardCost(entry.amount);
    case LocationActionsEnum.TRASH: return trashCost(entry.amount);
    default:
      return {
        actionId: entry.id as LocationActionsEnum,
        name: actionRegistry.getDefinition(entry.id)?.displayName ?? entry.id,
        requirements: [],
      };
  }
};

const toRewardAction = (entry: EffectEntry): RewardAction => ({
  actionId: entry.id as LocationActionsEnum,
  name: actionRegistry.getDefinition(entry.id)?.displayName ?? entry.id,
  // selectionNumber drives both the tile's icon repetition and the handlers.
  ...(AMOUNT_ACTIONS.has(entry.id) ? { params: { selectionNumber: entry.amount } } : {}),
});

export function fromEntries(entries: EffectEntry[], isCost: true): ModLocation['cost'];
export function fromEntries(entries: EffectEntry[], isCost: false): ModLocation['reward'];
export function fromEntries(entries: EffectEntry[], isCost: boolean): EffectBag {
  const resources = toResources(entries);
  const actionEntries = entries.filter(e => e.kind === 'action');
  const actions = isCost ? actionEntries.map(toCostAction) : actionEntries.map(toRewardAction);
  return {
    ...(resources.length ? { resources } : {}),
    ...(actions.length ? { actions } : {}),
  };
}

type EntryOption = { kind: EffectEntry['kind']; id: string; label: string };

const resourceOptions = (): EntryOption[] =>
  Object.values(ResourceEnum).map(id => ({
    kind: 'resource',
    id,
    label: `${RESOURCE_EMOJI[id] ?? ''} ${id}`.trim(),
  }));

/** Cost actions: registry entries tagged 'cost' (today: discard, trash). */
const costActionOptions = (): EntryOption[] =>
  actionRegistry.getActionsByTag('cost')
    .filter(def => !def.tags?.includes('stub'))
    .map(def => ({ kind: 'action' as const, id: def.id, label: def.displayName }));

/** Reward actions: every implemented registry action that isn't a cost. */
const rewardActionOptions = (): EntryOption[] =>
  actionRegistry.getAllActionIds()
    .map(id => actionRegistry.getDefinition(id)!)
    .filter(def => !def.tags?.includes('stub') && !def.tags?.includes('cost'))
    .map(def => ({ kind: 'action' as const, id: def.id, label: def.displayName }));

/**
 * Card "Play" effects: input-free only — playCard executes them blindly, so
 * an input-requiring action (buy/discard/trash) would silently no-op.
 */
const cardPlayActionOptions = (): EntryOption[] =>
  actionRegistry.getAllActionIds()
    .map(id => actionRegistry.getDefinition(id)!)
    .filter(def =>
      !def.tags?.includes('stub') &&
      !def.tags?.includes('cost') &&
      !def.tags?.includes('character') &&
      !actionRegistry.requiresInput(def.id))
    .map(def => ({ kind: 'action' as const, id: def.id, label: def.displayName }));

export type EffectListVariant = 'cost' | 'reward' | 'cardPlay';

export const entryOptions = (variant: EffectListVariant): EntryOption[] => [
  ...resourceOptions(),
  ...(variant === 'cost' ? costActionOptions()
    : variant === 'cardPlay' ? cardPlayActionOptions()
    : rewardActionOptions()),
];

const optionKey = (kind: string, id: string) => `${kind}:${id}`;

export const EffectListEditor = ({
  title,
  isCost,
  variant,
  entries,
  onChange,
}: {
  title: string;
  isCost: boolean;
  /** Defaults to cost/reward based on isCost; 'cardPlay' = input-free only. */
  variant?: EffectListVariant;
  entries: EffectEntry[];
  onChange: (entries: EffectEntry[]) => void;
}) => {
  const t = useT();
  const options = entryOptions(variant ?? (isCost ? 'cost' : 'reward'));

  const updateEntry = (index: number, patch: Partial<EffectEntry>) =>
    onChange(entries.map((e, i) => (i === index ? { ...e, ...patch } : e)));

  const removeEntry = (index: number) => onChange(entries.filter((_, i) => i !== index));

  const addEntry = () => {
    const first = options[0];
    onChange([...entries, { kind: first.kind, id: first.id, amount: 1 }]);
  };

  return (
    <div style={{ border: nb.border, padding: '12px', backgroundColor: '#fafafa' }}>
      <div style={{ fontSize: '11px', fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>
        {title}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {entries.map((entry, index) => {
          const showAmount = entry.kind === 'resource' || AMOUNT_ACTIONS.has(entry.id);
          return (
            <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select
                value={optionKey(entry.kind, entry.id)}
                onChange={(e) => {
                  const selected = options.find(o => optionKey(o.kind, o.id) === e.target.value);
                  if (selected) updateEntry(index, { kind: selected.kind, id: selected.id });
                }}
                style={{ ...inputStyle, flex: 1, padding: '6px 8px', fontSize: '12px' }}
              >
                {options.map(o => (
                  <option key={optionKey(o.kind, o.id)} value={optionKey(o.kind, o.id)}>
                    {o.label}
                  </option>
                ))}
              </select>
              {showAmount ? (
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={entry.amount}
                  onChange={(e) => updateEntry(index, { amount: Math.max(1, parseInt(e.target.value) || 1) })}
                  style={{ ...inputStyle, width: '64px', padding: '6px 8px', fontSize: '12px', textAlign: 'center' }}
                />
              ) : (
                <span style={{ width: '64px' }} />
              )}
              <BrutalButton onClick={() => removeEntry(index)} style={{ backgroundColor: '#fecaca', padding: '6px 10px' }}>
                ✕
              </BrutalButton>
            </div>
          );
        })}

        <BrutalButton onClick={addEntry} style={{ backgroundColor: nb.accent, justifyContent: 'center' }}>
          {t('modlab.addEntry')}
        </BrutalButton>
      </div>
    </div>
  );
};
