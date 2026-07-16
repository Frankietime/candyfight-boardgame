import { useEffect, useState } from 'react';
import { getBaseMod, DeckSetDefinition, MOD_SCHEMA_VERSION } from '@candyfight/shared/mods';
import { useAppStore } from '../../store';
import { useT } from '../../i18n/useT';
import { Win95Window } from '../ui/Win95Window';
import { nb, BrutalButton } from '../ui/nb';
import {
  fetchDeckSet,
  DeckSetMetadata,
  useCreateDeckSet,
  useDeleteDeckSet,
  useDeckSetsList,
  useUpdateDeckSet,
} from '../../services/deckSetServices';
import { DeckSetEditor } from './DeckSetEditor';

/**
 * DECK LAB — landing view is the table of created Deck Sets (a deck set =
 * mazo base + tier 1/tier 2/… market decks) — edit / duplicate / delete plus
 * "+ NEW DECK SET"; opening one switches to the deck editor. These deck sets
 * are reusable content: any mod's Mod Lab MAZOS section can load one to
 * replace its own decks.
 */
export const DeckLabScreen = () => {
  const t = useT();
  const { setScreen, deckLabTargetId, setDeckLabTargetId } = useAppStore();
  const { deckSets, deckSetsUnavailable, isLoading } = useDeckSetsList();
  const createDeckSet = useCreateDeckSet();
  const updateDeckSet = useUpdateDeckSet();
  const deleteDeckSet = useDeleteDeckSet();

  const [editingDeckSet, setEditingDeckSet] = useState<DeckSetDefinition | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<unknown>) => {
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const withRowIdentity = (record: { id: string; name: string; description: string; payload: DeckSetDefinition }): DeckSetDefinition =>
    ({ ...record.payload, id: record.id, name: record.name, description: record.description });

  const onNewDeckSet = () => run(async () => {
    const template: DeckSetDefinition = {
      id: 'template',
      name: `New Deck Set ${deckSets.length + 1}`,
      description: '',
      schemaVersion: MOD_SCHEMA_VERSION,
      decks: getBaseMod().decks!,
    };
    const record = await createDeckSet.mutateAsync(template);
    setEditingDeckSet(withRowIdentity(record));
  });

  const onEdit = (deckSet: DeckSetMetadata) => run(async () => {
    const record = await fetchDeckSet(deckSet.id);
    setEditingDeckSet(withRowIdentity(record));
  });

  // Deep link from the Mod Lab's "✏️ Edit Deck Set" shortcut: open straight
  // into editing the requested deck set, then clear the target.
  useEffect(() => {
    if (!deckLabTargetId) return;
    const id = deckLabTargetId;
    setDeckLabTargetId(null);
    run(async () => {
      const record = await fetchDeckSet(id);
      setEditingDeckSet(withRowIdentity(record));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckLabTargetId]);

  const onDuplicate = (deckSet: DeckSetMetadata) => run(async () => {
    const record = await fetchDeckSet(deckSet.id);
    await createDeckSet.mutateAsync({ ...record.payload, name: `${record.name} (copy)` });
  });

  const onDelete = (deckSet: DeckSetMetadata) => {
    if (!window.confirm(t('modlab.confirmDelete'))) return;
    run(() => deleteDeckSet.mutateAsync(deckSet.id));
  };

  const onSave = (draft: DeckSetDefinition) => run(async () => {
    const record = await updateDeckSet.mutateAsync({ id: draft.id, payload: draft });
    setEditingDeckSet(withRowIdentity(record));
  });

  // Deck editor view
  if (editingDeckSet) {
    return (
      <div style={{ width: '100%' }}>
        {error && <ErrorBanner message={error} />}
        <DeckSetEditor
          key={editingDeckSet.id}
          deckSet={editingDeckSet}
          saving={updateDeckSet.isPending}
          onSave={onSave}
          onBack={() => {
            // Reached via the Mod Lab's "✏️ Editar Mazo" shortcut? Jump back
            // to that mod (MAZOS tab) instead of this screen's own table.
            const { deckLabReturnModId, setDeckLabReturnModId, setModLabTargetId, setModLabReturnView } = useAppStore.getState();
            if (deckLabReturnModId) {
              setDeckLabReturnModId(null);
              setModLabTargetId(deckLabReturnModId);
              setModLabReturnView('decks');
              setScreen('modLab');
              return;
            }
            setEditingDeckSet(null);
          }}
        />
      </div>
    );
  }

  // Landing view — deck sets table
  return (
    <div style={{ height: '100vh', width: '100%', overflow: 'auto', backgroundColor: nb.bg, padding: '40px 24px', fontFamily: nb.font, boxSizing: 'border-box' }}>
      <div style={{ maxWidth: '860px', margin: '0 auto' }}>
        <Win95Window
          title={`🎴 ${t('decklab.title')}`}
          titleBarRight={
            <BrutalButton onClick={() => setScreen('home')} style={{ backgroundColor: '#fff', padding: '4px 10px', fontSize: '11px' }}>
              ← {t('modlab.back')}
            </BrutalButton>
          }
        >
          {deckSetsUnavailable && (
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#92400e', backgroundColor: '#fef3c7', border: nb.border, padding: '10px' }}>
              {t('decklab.unavailable')}
            </div>
          )}
          {error && <ErrorBanner message={error} />}

          {/* Deck sets table */}
          <div style={{ border: nb.border }}>
            {/* Header row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.6fr 0.9fr auto', gap: '10px', padding: '10px 12px', backgroundColor: '#000', color: '#fff', fontSize: '10px', fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              <span>{t('modlab.name')}</span>
              <span>{t('modlab.description')}</span>
              <span>{t('modlab.updated')}</span>
              <span />
            </div>

            {deckSets.map(deckSet => (
              <div
                key={deckSet.id}
                style={{
                  display: 'grid', gridTemplateColumns: '1.2fr 1.6fr 0.9fr auto', gap: '10px',
                  padding: '12px', borderTop: nb.border, alignItems: 'center', backgroundColor: '#fff',
                }}
              >
                <span style={{ fontSize: '13px', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {deckSet.name}
                </span>
                <span style={{ fontSize: '12px', color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {deckSet.description || '—'}
                </span>
                <span style={{ fontSize: '11px', color: '#777' }}>
                  {new Date(deckSet.updated_at).toLocaleDateString()}
                </span>
                <span style={{ display: 'inline-flex', gap: '6px' }}>
                  <BrutalButton onClick={() => onEdit(deckSet)} style={{ backgroundColor: '#000', color: '#fff', padding: '5px 10px', fontSize: '11px' }} title={t('modlab.edit')}>
                    ✏️
                  </BrutalButton>
                  <BrutalButton onClick={() => onDuplicate(deckSet)} style={{ backgroundColor: '#fff', padding: '5px 10px', fontSize: '11px' }} title={t('modlab.duplicate')}>
                    ⧉
                  </BrutalButton>
                  <BrutalButton onClick={() => onDelete(deckSet)} style={{ backgroundColor: '#fecaca', padding: '5px 10px', fontSize: '11px' }} title={t('modlab.delete')}>
                    ✕
                  </BrutalButton>
                </span>
              </div>
            ))}

            {!isLoading && deckSets.length === 0 && (
              <div style={{ padding: '28px', borderTop: nb.border, textAlign: 'center', color: '#aaa', fontSize: '13px', fontWeight: 600 }}>
                {t('decklab.empty')}
              </div>
            )}
          </div>

          <BrutalButton
            onClick={onNewDeckSet}
            disabled={deckSetsUnavailable || createDeckSet.isPending}
            style={{ justifyContent: 'center', backgroundColor: nb.accent, boxShadow: nb.shadowMd, fontSize: '13px' }}
          >
            {createDeckSet.isPending ? '…' : t('decklab.newDeckSet')}
          </BrutalButton>
        </Win95Window>
      </div>
    </div>
  );
};

const ErrorBanner = ({ message }: { message: string }) => (
  <div style={{ fontSize: '12px', fontWeight: 600, color: '#991b1b', backgroundColor: '#fecaca', border: '2px solid #000', padding: '10px', margin: '8px 0' }}>
    {message}
  </div>
);
