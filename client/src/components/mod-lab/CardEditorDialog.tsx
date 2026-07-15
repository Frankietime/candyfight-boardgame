import { useState } from 'react';
import { DistrictIconsEnum } from '@candyfight/shared/enums';
import {
  buildRevealSecondary,
  ModCard,
  REVEAL_EFFECT_IDS,
  revealEffectOf,
  RevealEffectId,
} from '@candyfight/shared/mods';
import { CardMini } from '../card-components/CardMini';
import { districtIcons } from '../ui/GameIcon';
import { useT } from '../../i18n/useT';
import { nb, BrutalButton, inputStyle, sectionTitle } from '../ui/nb';
import { EffectEntry, EffectListEditor, fromEntries, toEntries } from './EffectListEditor';

const NAME_MAX_LENGTH = 40;
const COPIES_MAX = 10;

/**
 * Card editor: name, district symbols, Play effects (input-free registry
 * actions + resources) and — for base-deck cards only — the curated Reveal
 * picker (+1 Fight / +1 Candy / Puzzle). Live CardMini preview.
 */
export const CardEditorDialog = ({
  card,
  allowReveal,
  onApply,
  onCancel,
}: {
  card: ModCard;
  /** Base-deck cards may carry a reveal; market-tier cards may not. */
  allowReveal: boolean;
  onApply: (edited: ModCard) => void;
  onCancel: () => void;
}) => {
  const t = useT();
  const [name, setName] = useState(card.name);
  const [districtIds, setDistrictIds] = useState<DistrictIconsEnum[]>(
    [...(card.districtIds ?? [])] as DistrictIconsEnum[]
  );
  const [playEntries, setPlayEntries] = useState<EffectEntry[]>(() =>
    toEntries({ resources: card.primaryResources, actions: card.primaryEffects })
  );
  const initialReveal = revealEffectOf(card);
  const [reveal, setReveal] = useState<RevealEffectId | 'none'>(
    initialReveal === 'invalid' ? 'none' : initialReveal
  );
  const [copies, setCopies] = useState(card.copies ?? 1);

  const toggleDistrict = (id: DistrictIconsEnum) =>
    setDistrictIds(current =>
      current.includes(id) ? current.filter(d => d !== id) : [...current, id]
    );

  const effectiveCopies = reveal !== 'none' ? 1 : copies;

  const edited = (): ModCard => {
    const play = fromEntries(playEntries, false);
    return {
      id: card.id,
      name: name.trim() || card.name,
      districtIds: [...districtIds],
      ...(play.resources?.length ? { primaryResources: play.resources } : {}),
      ...(play.actions?.length ? { primaryEffects: play.actions } : {}),
      ...buildRevealSecondary(allowReveal ? reveal : 'none'),
      ...(effectiveCopies > 1 ? { copies: effectiveCopies } : {}),
    };
  };

  const preview = edited();

  const revealLabel: Record<RevealEffectId | 'none', string> = {
    none: t('modlab.revealNone'),
    fight: t('modlab.revealFight'),
    candy: t('modlab.revealCandy'),
    puzzle: t('modlab.revealPuzzle'),
  };

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1100, fontFamily: nb.font,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#fff', border: nb.border, boxShadow: nb.shadowMd,
          padding: '24px', width: 'min(720px, 94vw)', maxHeight: '90vh', overflowY: 'auto',
          display: 'flex', flexDirection: 'column', gap: '16px',
        }}
      >
        <h2 style={{ ...sectionTitle, fontSize: '13px', margin: 0 }}>🃏 {name || card.name}</h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '24px', alignItems: 'start' }}>
          {/* Live preview at 1.6x */}
          <div style={{ transform: 'scale(1.6)', transformOrigin: 'top left', width: 105 * 1.6, height: 157 * 1.6 }}>
            <CardMini card={{ ...preview, id: 'preview' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: 0 }}>
            {/* Name */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
                {t('modlab.cardName')}
              </div>
              <input value={name} maxLength={NAME_MAX_LENGTH} onChange={(e) => setName(e.target.value)} style={inputStyle} />
            </div>

            {/* District symbols */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
                {t('modlab.symbols')}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {Object.values(DistrictIconsEnum).map(id => {
                  const active = districtIds.includes(id);
                  return (
                    <button
                      key={id}
                      title={id}
                      onClick={() => toggleDistrict(id)}
                      style={{
                        border: nb.border,
                        boxShadow: active ? 'none' : nb.shadowSm,
                        transform: active ? 'translate(2px, 2px)' : undefined,
                        backgroundColor: active ? nb.accent : '#fff',
                        padding: '6px',
                        cursor: 'pointer',
                        opacity: active ? 1 : 0.55,
                      }}
                    >
                      <img src={districtIcons[id]} style={{ width: 22, height: 22, display: 'block' }} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Copies */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
                {t('modlab.copies')}
              </div>
              <input
                type="number" min={1} max={COPIES_MAX}
                value={effectiveCopies}
                disabled={reveal !== 'none'}
                title={reveal !== 'none' ? t('modlab.revealSingleCopy') : undefined}
                onChange={(e) => setCopies(Math.min(COPIES_MAX, Math.max(1, parseInt(e.target.value) || 1)))}
                style={{ ...inputStyle, width: '72px', textAlign: 'center' }}
              />
            </div>

            {/* Play effects */}
            <EffectListEditor
              title={`▶ ${t('modlab.play')}`}
              isCost={false}
              variant="cardPlay"
              entries={playEntries}
              onChange={setPlayEntries}
            />

            {/* Curated Reveal picker (base deck only) */}
            {allowReveal && (
              <div style={{ border: nb.border, padding: '12px', backgroundColor: '#fafafa' }}>
                <div style={{ fontSize: '11px', fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>
                  👁 {t('modlab.reveal')}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {(['none', ...REVEAL_EFFECT_IDS] as (RevealEffectId | 'none')[]).map(id => (
                    <label key={id} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                      <input type="radio" name="reveal" checked={reveal === id} onChange={() => setReveal(id)} />
                      {revealLabel[id]}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <BrutalButton onClick={onCancel} style={{ backgroundColor: '#fff' }}>
            {t('modlab.cancel')}
          </BrutalButton>
          <BrutalButton onClick={() => onApply(edited())} style={{ backgroundColor: '#000', color: '#fff', boxShadow: nb.shadowMd }}>
            ✔ {t('modlab.apply')}
          </BrutalButton>
        </div>
      </div>
    </div>
  );
};
