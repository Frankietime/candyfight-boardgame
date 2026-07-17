import { useEffect, useState } from 'react';
import { getBaseMod, ModDefinition } from '@candyfight/shared/mods';
import { useAppStore } from '../../store';
import { useT } from '../../i18n/useT';
import { Win95Window } from '../ui/Win95Window';
import { nb, BrutalButton } from '../ui/nb';
import {
  fetchMod,
  ModMetadata,
  useCreateMod,
  useDeleteMod,
  useModsList,
  useUpdateMod,
} from '../../services/modServices';
import { ModBoardEditor } from './ModBoardEditor';

/**
 * MOD LAB — landing view is the table of created mods (edit / duplicate /
 * delete) plus "+ NEW MOD"; opening a mod switches to the board editor.
 */
export const ModLabScreen = () => {
  const t = useT();
  const { setScreen, activeMod, setActiveMod, modLabTargetId, setModLabTargetId } = useAppStore();
  const { mods, modsUnavailable, isLoading } = useModsList();
  const createMod = useCreateMod();
  const updateMod = useUpdateMod();
  const deleteMod = useDeleteMod();

  const [editingMod, setEditingMod] = useState<ModDefinition | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<unknown>) => {
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  // Legacy (phase-1/2) mods have no decks/characters — attach the base
  // cartridge's BEFORE the editor sees the mod, so the dirty flag starts clean.
  const withRowIdentity = (record: { id: string; name: string; description: string; payload: ModDefinition }): ModDefinition =>
    ({
      ...record.payload,
      id: record.id,
      name: record.name,
      description: record.description,
      decks: record.payload.decks ?? getBaseMod().decks,
      characters: record.payload.characters ?? getBaseMod().characters,
    });

  const onNewMod = () => run(async () => {
    const template = getBaseMod();
    template.name = `New Mod ${mods.length + 1}`;
    template.description = '';
    const record = await createMod.mutateAsync(template);
    setEditingMod(withRowIdentity(record));
  });

  const onEdit = (mod: ModMetadata) => run(async () => {
    const record = await fetchMod(mod.id);
    setEditingMod(withRowIdentity(record));
  });

  // Deep link back from the Deck Lab's "← Volver" (when it was reached via
  // this mod's MAZOS section): open straight into editing this mod again.
  useEffect(() => {
    if (!modLabTargetId) return;
    const id = modLabTargetId;
    setModLabTargetId(null);
    run(async () => {
      const record = await fetchMod(id);
      setEditingMod(withRowIdentity(record));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modLabTargetId]);

  const onDuplicate = (mod: ModMetadata) => run(async () => {
    const record = await fetchMod(mod.id);
    await createMod.mutateAsync({ ...record.payload, name: `${record.name} (copy)` });
  });

  const onDelete = (mod: ModMetadata) => {
    if (!window.confirm(t('modlab.confirmDelete'))) return;
    run(async () => {
      await deleteMod.mutateAsync(mod.id);
      // A deleted cartridge can't stay loaded.
      if (useAppStore.getState().activeMod?.id === mod.id) setActiveMod(null);
    });
  };

  const onSave = (draft: ModDefinition) => run(async () => {
    const record = await updateMod.mutateAsync({ id: draft.id, payload: draft });
    const saved = withRowIdentity(record);
    setEditingMod(saved);
    // Keep the loaded cartridge in sync when it's the one being edited.
    if (useAppStore.getState().activeMod?.id === saved.id) setActiveMod(saved);
  });

  // Board editor view
  if (editingMod) {
    return (
      <div style={{ width: '100%' }}>
        {error && <ErrorBanner message={error} />}
        <ModBoardEditor
          key={editingMod.id}
          mod={editingMod}
          saving={updateMod.isPending}
          onSave={onSave}
          onBack={() => setEditingMod(null)}
        />
      </div>
    );
  }

  // Landing view — mods table
  return (
    <div style={{ height: '100vh', width: '100%', overflow: 'auto', backgroundColor: nb.bg, padding: '40px 24px', fontFamily: nb.font, boxSizing: 'border-box' }}>
      <div style={{ maxWidth: '860px', margin: '0 auto' }}>
        <Win95Window
          title={`🧪 ${t('modlab.title')}`}
          titleBarRight={
            <BrutalButton onClick={() => setScreen('home')} style={{ backgroundColor: '#fff', padding: '4px 10px', fontSize: '11px' }}>
              ← {t('modlab.back')}
            </BrutalButton>
          }
        >
          {modsUnavailable && (
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#92400e', backgroundColor: '#fef3c7', border: nb.border, padding: '10px' }}>
              {t('modlab.unavailable')}
            </div>
          )}
          {error && <ErrorBanner message={error} />}

          {/* Mods table */}
          <div style={{ border: nb.border }}>
            {/* Header row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.6fr 0.9fr auto', gap: '10px', padding: '10px 12px', backgroundColor: '#000', color: '#fff', fontSize: '10px', fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              <span>{t('modlab.name')}</span>
              <span>{t('modlab.description')}</span>
              <span>{t('modlab.updated')}</span>
              <span />
            </div>

            {mods.map(mod => (
              <div
                key={mod.id}
                style={{
                  display: 'grid', gridTemplateColumns: '1.2fr 1.6fr 0.9fr auto', gap: '10px',
                  padding: '12px', borderTop: nb.border, alignItems: 'center',
                  backgroundColor: activeMod?.id === mod.id ? nb.accent : '#fff',
                }}
              >
                <span style={{ fontSize: '13px', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {activeMod?.id === mod.id && '🕹️ '}{mod.name}
                </span>
                <span style={{ fontSize: '12px', color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {mod.description || '—'}
                </span>
                <span style={{ fontSize: '11px', color: '#777' }}>
                  {new Date(mod.updated_at).toLocaleDateString()}
                </span>
                <span style={{ display: 'inline-flex', gap: '6px' }}>
                  <BrutalButton onClick={() => onEdit(mod)} style={{ backgroundColor: '#000', color: '#fff', padding: '5px 10px', fontSize: '11px' }} title={t('modlab.edit')}>
                    ✏️
                  </BrutalButton>
                  <BrutalButton onClick={() => onDuplicate(mod)} style={{ backgroundColor: '#fff', padding: '5px 10px', fontSize: '11px' }} title={t('modlab.duplicate')}>
                    ⧉
                  </BrutalButton>
                  <BrutalButton onClick={() => onDelete(mod)} style={{ backgroundColor: '#fecaca', padding: '5px 10px', fontSize: '11px' }} title={t('modlab.delete')}>
                    ✕
                  </BrutalButton>
                </span>
              </div>
            ))}

            {!isLoading && mods.length === 0 && (
              <div style={{ padding: '28px', borderTop: nb.border, textAlign: 'center', color: '#aaa', fontSize: '13px', fontWeight: 600 }}>
                {t('modlab.empty')}
              </div>
            )}
          </div>

          <BrutalButton
            onClick={onNewMod}
            disabled={modsUnavailable || createMod.isPending}
            style={{ justifyContent: 'center', backgroundColor: nb.accent, boxShadow: nb.shadowMd, fontSize: '13px' }}
          >
            {createMod.isPending ? '…' : t('modlab.newMod')}
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
