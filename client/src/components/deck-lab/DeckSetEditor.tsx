import { useEffect, useMemo, useState } from 'react';
import _ from 'lodash';
import { DeckSetDefinition } from '@candyfight/shared/mods';
import { useT } from '../../i18n/useT';
import { nb, BrutalButton, inputStyle } from '../ui/nb';
import { DeckEditor } from '../mod-lab/DeckEditor';

/**
 * Header + dirty-tracking wrapper around the SAME DeckEditor used inside the
 * Mod Lab — a Deck Set has no board/locations, so nothing references its
 * tiers: they're always freely addable/deletable (usedTierIds stays empty).
 */
export const DeckSetEditor = ({
  deckSet,
  saving,
  onSave,
  onBack,
}: {
  deckSet: DeckSetDefinition;
  saving: boolean;
  onSave: (draft: DeckSetDefinition) => void;
  onBack: () => void;
}) => {
  const t = useT();
  const [draft, setDraft] = useState<DeckSetDefinition>(() => _.cloneDeep(deckSet));

  // After a successful save the parent hands back the persisted deck set —
  // resync the draft so the dirty flag clears.
  useEffect(() => {
    setDraft(_.cloneDeep(deckSet));
  }, [deckSet]);

  const isDirty = useMemo(() => !_.isEqual(draft, deckSet), [draft, deckSet]);

  const onBackGuarded = () => {
    if (isDirty && !window.confirm(t('modlab.discardUnsaved'))) return;
    onBack();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: nb.bg, fontFamily: nb.font }}>
      {/* Header bar */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
          padding: '12px 16px', backgroundColor: '#fff', borderBottom: nb.border,
        }}
      >
        <BrutalButton onClick={onBackGuarded} style={{ backgroundColor: '#fff' }}>
          ← {t('modlab.back')}
        </BrutalButton>

        <input
          value={draft.name}
          maxLength={40}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          style={{ ...inputStyle, width: '220px', fontWeight: 800 }}
          placeholder={t('modlab.name')}
        />
        <input
          value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          style={{ ...inputStyle, flex: 1, minWidth: '160px' }}
          placeholder={t('modlab.description')}
        />

        <span
          style={{
            fontSize: '10px', fontWeight: 900, letterSpacing: '0.08em',
            padding: '4px 8px', border: nb.border,
            backgroundColor: isDirty ? '#fecaca' : '#dcfce7',
            whiteSpace: 'nowrap',
          }}
        >
          {isDirty ? `● ${t('modlab.unsaved')}` : `✓ ${t('modlab.saved')}`}
        </span>

        <BrutalButton
          onClick={() => onSave(draft)}
          disabled={!isDirty || saving}
          style={{ backgroundColor: '#000', color: '#fff' }}
        >
          {saving ? '…' : `💾 ${t('modlab.save')}`}
        </BrutalButton>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <DeckEditor
          decks={draft.decks}
          usedTierIds={EMPTY_TIER_SET}
          onChange={(decks) => setDraft(current => ({ ..._.cloneDeep(current), decks }))}
        />
      </div>
    </div>
  );
};

// Stable empty-set reference (a fresh Set() per render would be harmless but
// unnecessary — DeckEditor only reads it).
const EMPTY_TIER_SET = new Set<string>();
