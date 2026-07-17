import { useState } from 'react';
import { ModCharacter } from '@candyfight/shared/mods';
import { useT } from '../../i18n/useT';
import { nb, BrutalButton, sectionTitle } from '../ui/nb';
import { CharacterEditorDialog } from './CharacterEditorDialog';

/**
 * PERSONAJES view: the character roster as a card grid — same edit/add/remove
 * pattern as DeckEditor's card sections, just without tiers (a roster is one
 * flat list). Used both inside the Mod Lab (ModBoardEditor) and standalone
 * (SignetSetEditor, via the same component — no duplication).
 */

let _newCharacterSeq = 0;
const newCharacter = (): ModCharacter => ({
  id: `character-${Date.now().toString(36)}-${++_newCharacterSeq}`,
  name: 'New Character',
  description: '',
  emoji: '🎭',
  color: '#e5e7eb',
  signet: {},
});

const describeSignet = (character: ModCharacter): string => {
  const parts = [
    ...(character.signet.resources ?? []).map(r => `+${r.amount} ${r.resourceId}`),
    ...(character.signet.actions ?? []).map(a => a.name),
  ];
  return parts.join(', ');
};

export const CharacterEditor = ({
  characters,
  onChange,
}: {
  characters: ModCharacter[];
  onChange: (characters: ModCharacter[]) => void;
}) => {
  const t = useT();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const addCharacter = () => onChange([...characters, newCharacter()]);
  const removeCharacter = (index: number) => onChange(characters.filter((_, i) => i !== index));
  const applyCharacter = (index: number, edited: ModCharacter) =>
    onChange(characters.map((c, i) => (i === index ? edited : c)));

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: '20px 16px' }}>
      <div style={{ backgroundColor: '#fff', border: nb.border, boxShadow: nb.shadowMd, padding: '16px' }}>
        <h3 style={{ ...sectionTitle, margin: '0 0 12px' }}>🎭 {t('modlab.characters')}</h3>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          {characters.map((character, index) => (
            <div
              key={character.id}
              onClick={() => setEditingIndex(index)}
              style={{ border: nb.border, padding: '10px', backgroundColor: '#fafafa', width: 170, cursor: 'pointer' }}
            >
              <div
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 56, height: 56, margin: '0 auto 8px', fontSize: '28px',
                  backgroundColor: character.color || '#e5e7eb', border: nb.border, borderRadius: '50%',
                }}
              >
                {character.emoji || '🎭'}
              </div>
              <div style={{ fontSize: '12px', fontWeight: 800, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {character.name}
              </div>
              <div style={{ fontSize: '10px', color: '#666', textAlign: 'center', minHeight: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {describeSignet(character) || '—'}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }} onClick={(e) => e.stopPropagation()}>
                <BrutalButton
                  onClick={() => removeCharacter(index)}
                  disabled={characters.length <= 1}
                  style={{ backgroundColor: '#fecaca', padding: '3px 9px', fontSize: '11px' }}
                >
                  ✕
                </BrutalButton>
              </div>
            </div>
          ))}

          <button
            onClick={addCharacter}
            style={{
              width: 170, minHeight: 150, border: '2px dashed #aaa', backgroundColor: 'transparent',
              color: '#888', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: nb.font,
            }}
          >
            {t('modlab.addCharacter')}
          </button>
        </div>
      </div>

      {editingIndex !== null && (
        <CharacterEditorDialog
          key={characters[editingIndex].id}
          character={characters[editingIndex]}
          onApply={(edited) => { applyCharacter(editingIndex, edited); setEditingIndex(null); }}
          onCancel={() => setEditingIndex(null)}
        />
      )}
    </div>
  );
};
