import { useEffect, useState } from 'react';
import { getBaseMod, SignetSetDefinition, MOD_SCHEMA_VERSION } from '@candyfight/shared/mods';
import { useAppStore } from '../../store';
import { useT } from '../../i18n/useT';
import { Win95Window } from '../ui/Win95Window';
import { nb, BrutalButton } from '../ui/nb';
import {
  fetchSignetSet,
  SignetSetMetadata,
  useCreateSignetSet,
  useDeleteSignetSet,
  useSignetSetsList,
  useUpdateSignetSet,
} from '../../services/signetSetServices';
import { SignetSetEditor } from './SignetSetEditor';

/**
 * SIGNET LAB — landing view is the table of created Signet Sets (a signet set
 * = a character roster) — edit / duplicate / delete plus "+ NEW SIGNET SET";
 * opening one switches to the character editor. These signet sets are
 * reusable content: any mod's Mod Lab PERSONAJES section can load one to
 * replace its own roster. Mirrors DeckLabScreen.tsx exactly.
 */
export const SignetLabScreen = () => {
  const t = useT();
  const { setScreen, signetLabTargetId, setSignetLabTargetId } = useAppStore();
  const { signetSets, signetSetsUnavailable, isLoading } = useSignetSetsList();
  const createSignetSet = useCreateSignetSet();
  const updateSignetSet = useUpdateSignetSet();
  const deleteSignetSet = useDeleteSignetSet();

  const [editingSignetSet, setEditingSignetSet] = useState<SignetSetDefinition | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<unknown>) => {
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const withRowIdentity = (record: { id: string; name: string; description: string; payload: SignetSetDefinition }): SignetSetDefinition =>
    ({ ...record.payload, id: record.id, name: record.name, description: record.description });

  const onNewSignetSet = () => run(async () => {
    const template: SignetSetDefinition = {
      id: 'template',
      name: `New Signet Set ${signetSets.length + 1}`,
      description: '',
      schemaVersion: MOD_SCHEMA_VERSION,
      characters: getBaseMod().characters!,
    };
    const record = await createSignetSet.mutateAsync(template);
    setEditingSignetSet(withRowIdentity(record));
  });

  const onEdit = (signetSet: SignetSetMetadata) => run(async () => {
    const record = await fetchSignetSet(signetSet.id);
    setEditingSignetSet(withRowIdentity(record));
  });

  // Deep link from the Mod Lab's "✏️ Edit Signet Set" shortcut: open straight
  // into editing the requested signet set, then clear the target.
  useEffect(() => {
    if (!signetLabTargetId) return;
    const id = signetLabTargetId;
    setSignetLabTargetId(null);
    run(async () => {
      const record = await fetchSignetSet(id);
      setEditingSignetSet(withRowIdentity(record));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signetLabTargetId]);

  const onDuplicate = (signetSet: SignetSetMetadata) => run(async () => {
    const record = await fetchSignetSet(signetSet.id);
    await createSignetSet.mutateAsync({ ...record.payload, name: `${record.name} (copy)` });
  });

  const onDelete = (signetSet: SignetSetMetadata) => {
    if (!window.confirm(t('modlab.confirmDelete'))) return;
    run(() => deleteSignetSet.mutateAsync(signetSet.id));
  };

  const onSave = (draft: SignetSetDefinition) => run(async () => {
    const record = await updateSignetSet.mutateAsync({ id: draft.id, payload: draft });
    setEditingSignetSet(withRowIdentity(record));
  });

  // Character editor view
  if (editingSignetSet) {
    return (
      <div style={{ width: '100%' }}>
        {error && <ErrorBanner message={error} />}
        <SignetSetEditor
          key={editingSignetSet.id}
          signetSet={editingSignetSet}
          saving={updateSignetSet.isPending}
          onSave={onSave}
          onBack={() => {
            // Reached via the Mod Lab's "✏️ Editar Personajes" shortcut? Jump
            // back to that mod (PERSONAJES tab) instead of this screen's own table.
            const { signetLabReturnModId, setSignetLabReturnModId, setModLabTargetId, setModLabReturnView } = useAppStore.getState();
            if (signetLabReturnModId) {
              setSignetLabReturnModId(null);
              setModLabTargetId(signetLabReturnModId);
              setModLabReturnView('characters');
              setScreen('modLab');
              return;
            }
            setEditingSignetSet(null);
          }}
        />
      </div>
    );
  }

  // Landing view — signet sets table
  return (
    <div style={{ height: '100vh', width: '100%', overflow: 'auto', backgroundColor: nb.bg, padding: '40px 24px', fontFamily: nb.font, boxSizing: 'border-box' }}>
      <div style={{ maxWidth: '860px', margin: '0 auto' }}>
        <Win95Window
          title={`🎭 ${t('signetlab.title')}`}
          titleBarRight={
            <BrutalButton onClick={() => setScreen('home')} style={{ backgroundColor: '#fff', padding: '4px 10px', fontSize: '11px' }}>
              ← {t('modlab.back')}
            </BrutalButton>
          }
        >
          {signetSetsUnavailable && (
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#92400e', backgroundColor: '#fef3c7', border: nb.border, padding: '10px' }}>
              {t('signetlab.unavailable')}
            </div>
          )}
          {error && <ErrorBanner message={error} />}

          {/* Signet sets table */}
          <div style={{ border: nb.border }}>
            {/* Header row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.6fr 0.9fr auto', gap: '10px', padding: '10px 12px', backgroundColor: '#000', color: '#fff', fontSize: '10px', fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              <span>{t('modlab.name')}</span>
              <span>{t('modlab.description')}</span>
              <span>{t('modlab.updated')}</span>
              <span />
            </div>

            {signetSets.map(signetSet => (
              <div
                key={signetSet.id}
                style={{
                  display: 'grid', gridTemplateColumns: '1.2fr 1.6fr 0.9fr auto', gap: '10px',
                  padding: '12px', borderTop: nb.border, alignItems: 'center', backgroundColor: '#fff',
                }}
              >
                <span style={{ fontSize: '13px', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {signetSet.name}
                </span>
                <span style={{ fontSize: '12px', color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {signetSet.description || '—'}
                </span>
                <span style={{ fontSize: '11px', color: '#777' }}>
                  {new Date(signetSet.updated_at).toLocaleDateString()}
                </span>
                <span style={{ display: 'inline-flex', gap: '6px' }}>
                  <BrutalButton onClick={() => onEdit(signetSet)} style={{ backgroundColor: '#000', color: '#fff', padding: '5px 10px', fontSize: '11px' }} title={t('modlab.edit')}>
                    ✏️
                  </BrutalButton>
                  <BrutalButton onClick={() => onDuplicate(signetSet)} style={{ backgroundColor: '#fff', padding: '5px 10px', fontSize: '11px' }} title={t('modlab.duplicate')}>
                    ⧉
                  </BrutalButton>
                  <BrutalButton onClick={() => onDelete(signetSet)} style={{ backgroundColor: '#fecaca', padding: '5px 10px', fontSize: '11px' }} title={t('modlab.delete')}>
                    ✕
                  </BrutalButton>
                </span>
              </div>
            ))}

            {!isLoading && signetSets.length === 0 && (
              <div style={{ padding: '28px', borderTop: nb.border, textAlign: 'center', color: '#aaa', fontSize: '13px', fontWeight: 600 }}>
                {t('signetlab.empty')}
              </div>
            )}
          </div>

          <BrutalButton
            onClick={onNewSignetSet}
            disabled={signetSetsUnavailable || createSignetSet.isPending}
            style={{ justifyContent: 'center', backgroundColor: nb.accent, boxShadow: nb.shadowMd, fontSize: '13px' }}
          >
            {createSignetSet.isPending ? '…' : t('signetlab.newSignetSet')}
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
