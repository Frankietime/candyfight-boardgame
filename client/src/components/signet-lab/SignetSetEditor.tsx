import { useEffect, useMemo, useState } from 'react';
import _ from 'lodash';
import { SignetSetDefinition } from '@candyfight/shared/mods';
import { useT } from '../../i18n/useT';
import { nb, BrutalButton, inputStyle } from '../ui/nb';
import { CharacterEditor } from '../mod-lab/CharacterEditor';

/**
 * Header + dirty-tracking wrapper around the SAME CharacterEditor used inside
 * the Mod Lab — mirrors DeckSetEditor.tsx exactly.
 */
export const SignetSetEditor = ({
  signetSet,
  saving,
  onSave,
  onBack,
}: {
  signetSet: SignetSetDefinition;
  saving: boolean;
  onSave: (draft: SignetSetDefinition) => void;
  onBack: () => void;
}) => {
  const t = useT();
  const [draft, setDraft] = useState<SignetSetDefinition>(() => _.cloneDeep(signetSet));

  // After a successful save the parent hands back the persisted signet set —
  // resync the draft so the dirty flag clears.
  useEffect(() => {
    setDraft(_.cloneDeep(signetSet));
  }, [signetSet]);

  const isDirty = useMemo(() => !_.isEqual(draft, signetSet), [draft, signetSet]);

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
        <CharacterEditor
          characters={draft.characters}
          onChange={(characters) => setDraft(current => ({ ...current, characters }))}
        />
      </div>
    </div>
  );
};
