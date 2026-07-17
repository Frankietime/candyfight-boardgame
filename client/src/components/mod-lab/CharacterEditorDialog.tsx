import { useState } from 'react';
import { ModCharacter } from '@candyfight/shared/mods';
import { useT } from '../../i18n/useT';
import { nb, BrutalButton, inputStyle, sectionTitle, fieldLabel, ModalOverlay } from '../ui/nb';
import { EffectEntry, EffectListEditor, fromEntries, toEntries } from './EffectListEditor';

const NAME_MAX_LENGTH = 40;

/**
 * Character editor: name, description, emoji + color (portrait stand-in —
 * no custom art yet), and the Signet ability — same input-free effect list
 * as a card's Play effects (reuses the 'cardPlay' EffectListEditor variant).
 */
export const CharacterEditorDialog = ({
  character,
  onApply,
  onCancel,
}: {
  character: ModCharacter;
  onApply: (edited: ModCharacter) => void;
  onCancel: () => void;
}) => {
  const t = useT();
  const [name, setName] = useState(character.name);
  const [description, setDescription] = useState(character.description);
  const [emoji, setEmoji] = useState(character.emoji);
  const [color, setColor] = useState(character.color);
  const [signetEntries, setSignetEntries] = useState<EffectEntry[]>(() =>
    toEntries({ resources: character.signet.resources, actions: character.signet.actions })
  );

  const edited = (): ModCharacter => {
    const signet = fromEntries(signetEntries, false);
    return {
      id: character.id,
      name: name.trim() || character.name,
      description: description.trim(),
      emoji: emoji.trim() || character.emoji,
      color,
      signet,
    };
  };

  return (
    <ModalOverlay onCancel={onCancel} zIndex={1100} maxWidth="min(640px, 94vw)">
      <h2 style={{ ...sectionTitle, fontSize: '13px', margin: 0 }}>{emoji || '🎭'} {name || character.name}</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', gap: '14px' }}>
          <div style={{ flex: 1 }}>
            <div style={fieldLabel}>{t('modlab.characterName')}</div>
            <input value={name} maxLength={NAME_MAX_LENGTH} onChange={(e) => setName(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <div style={fieldLabel}>{t('modlab.characterEmoji')}</div>
            <input
              value={emoji}
              maxLength={4}
              onChange={(e) => setEmoji(e.target.value)}
              style={{ ...inputStyle, width: '64px', textAlign: 'center', fontSize: '18px' }}
            />
          </div>
          <div>
            <div style={fieldLabel}>{t('modlab.characterColor')}</div>
            <input
              type="color"
              value={/^#[0-9a-fA-F]{6}$/.test(color) ? color : '#93c5fd'}
              onChange={(e) => setColor(e.target.value)}
              style={{ width: '64px', height: '38px', border: nb.border, cursor: 'pointer', padding: 0 }}
            />
          </div>
        </div>

        <div>
          <div style={fieldLabel}>{t('modlab.characterDescription')}</div>
          <input value={description} maxLength={120} onChange={(e) => setDescription(e.target.value)} style={inputStyle} />
        </div>

        <EffectListEditor
          title={`💍 ${t('modlab.signet')}`}
          isCost={false}
          variant="cardPlay"
          entries={signetEntries}
          onChange={setSignetEntries}
        />
      </div>

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        <BrutalButton onClick={onCancel} style={{ backgroundColor: '#fff' }}>
          {t('modlab.cancel')}
        </BrutalButton>
        <BrutalButton onClick={() => onApply(edited())} style={{ backgroundColor: '#000', color: '#fff', boxShadow: nb.shadowMd }}>
          ✔ {t('modlab.apply')}
        </BrutalButton>
      </div>
    </ModalOverlay>
  );
};
