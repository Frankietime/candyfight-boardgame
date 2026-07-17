import { useState } from 'react';
import _ from 'lodash';
import { ModCharacter } from '@candyfight/shared/mods';
import { fetchSignetSet, useSignetSetsList } from '../../services/signetSetServices';
import { useT } from '../../i18n/useT';
import { nb, inputStyle, BrutalButton } from '../ui/nb';

/**
 * A dropdown, shown atop the Mod Lab's PERSONAJES view, that loads a saved
 * Signet Set (a character roster) into the mod currently being edited —
 * replacing its characters wholesale. Mirrors DeckSetLoader.tsx exactly.
 */
export const SignetSetLoader = ({
  currentCharacters,
  lastSavedCharacters,
  onLoad,
  onEditSignetSet,
}: {
  currentCharacters: ModCharacter[];
  lastSavedCharacters: ModCharacter[] | undefined;
  onLoad: (characters: ModCharacter[]) => void;
  onEditSignetSet: (id: string) => void;
}) => {
  const t = useT();
  const { signetSets, signetSetsUnavailable } = useSignetSetsList();
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const charactersDirty = !_.isEqual(currentCharacters, lastSavedCharacters);

  const onSelect = async (id: string) => {
    setSelected(id);
    if (!id) return;
    if (charactersDirty && !window.confirm(t('modlab.signetSetLoadConfirm'))) {
      setSelected('');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const record = await fetchSignetSet(id);
      onLoad(record.payload.characters);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  if (signetSetsUnavailable) return null; // no storage → nothing to load from

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: '16px 16px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: nb.border, backgroundColor: '#fff', padding: '10px 12px', boxShadow: nb.shadowSm }}>
        <span style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
          📥 {t('modlab.loadSignetSet')}
        </span>
        <select
          value={selected}
          onChange={(e) => onSelect(e.target.value)}
          disabled={loading || signetSets.length === 0}
          style={{ ...inputStyle, maxWidth: 280, cursor: 'pointer' }}
        >
          <option value="">
            {signetSets.length === 0 ? t('signetlab.empty') : t('modlab.loadSignetSetPlaceholder')}
          </option>
          {signetSets.map(ss => (
            <option key={ss.id} value={ss.id}>{ss.name}</option>
          ))}
        </select>
        {selected && !loading && (
          <BrutalButton
            onClick={() => onEditSignetSet(selected)}
            style={{ backgroundColor: '#000', color: '#fff', padding: '6px 12px', fontSize: '11px', whiteSpace: 'nowrap' }}
          >
            ✏️ {t('modlab.editSignetSet')}
          </BrutalButton>
        )}
        {loading && <span style={{ fontSize: 11, color: '#777' }}>…</span>}
        {error && <span style={{ fontSize: 11, fontWeight: 700, color: '#991b1b' }}>{error}</span>}
      </div>
    </div>
  );
};
