import { useState } from 'react';
import _ from 'lodash';
import { ModDecks } from '@candyfight/shared/mods';
import { fetchDeckSet, useDeckSetsList } from '../../services/deckSetServices';
import { useT } from '../../i18n/useT';
import { nb, inputStyle, BrutalButton } from '../ui/nb';

/**
 * A dropdown, shown atop the Mod Lab's MAZOS view, that loads a saved Deck
 * Set (mazo base + tiers) into the mod currently being edited — replacing
 * its decks wholesale. If the deck section has unsaved changes, confirms
 * before discarding them. Once a deck set is selected, an "Edit Deck Set"
 * shortcut appears to jump straight to editing that resource in the Deck Lab.
 */
export const DeckSetLoader = ({
  currentDecks,
  lastSavedDecks,
  onLoad,
  onEditDeckSet,
}: {
  currentDecks: ModDecks;
  lastSavedDecks: ModDecks | undefined;
  onLoad: (decks: ModDecks) => void;
  onEditDeckSet: (id: string) => void;
}) => {
  const t = useT();
  const { deckSets, deckSetsUnavailable } = useDeckSetsList();
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const decksDirty = !_.isEqual(currentDecks, lastSavedDecks);

  const onSelect = async (id: string) => {
    setSelected(id);
    if (!id) return;
    if (decksDirty && !window.confirm(t('modlab.deckSetLoadConfirm'))) {
      setSelected('');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const record = await fetchDeckSet(id);
      onLoad(record.payload.decks);
      // Keep `selected` pointing at the loaded deck set (don't reset it) so
      // the "Edit Deck Set" shortcut stays available for it.
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  if (deckSetsUnavailable) return null; // no storage → nothing to load from

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: '16px 16px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: nb.border, backgroundColor: '#fff', padding: '10px 12px', boxShadow: nb.shadowSm }}>
        <span style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
          📥 {t('modlab.loadDeckSet')}
        </span>
        <select
          value={selected}
          onChange={(e) => onSelect(e.target.value)}
          disabled={loading || deckSets.length === 0}
          style={{ ...inputStyle, maxWidth: 280, cursor: 'pointer' }}
        >
          <option value="">
            {deckSets.length === 0 ? t('decklab.empty') : t('modlab.loadDeckSetPlaceholder')}
          </option>
          {deckSets.map(ds => (
            <option key={ds.id} value={ds.id}>{ds.name}</option>
          ))}
        </select>
        {selected && !loading && (
          <BrutalButton
            onClick={() => onEditDeckSet(selected)}
            style={{ backgroundColor: '#000', color: '#fff', padding: '6px 12px', fontSize: '11px', whiteSpace: 'nowrap' }}
          >
            ✏️ {t('modlab.editDeckSet')}
          </BrutalButton>
        )}
        {loading && <span style={{ fontSize: 11, color: '#777' }}>…</span>}
        {error && <span style={{ fontSize: 11, fontWeight: 700, color: '#991b1b' }}>{error}</span>}
      </div>
    </div>
  );
};
