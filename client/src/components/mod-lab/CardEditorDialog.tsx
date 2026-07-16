import { useState } from 'react';
import { DistrictIconsEnum, LocationActionsEnum } from '@candyfight/shared/enums';
import {
  getPuzzleRequirement,
  hasAnyReveal,
  hasPuzzleReveal,
  ModCard,
} from '@candyfight/shared/mods';
import { DEFAULT_PUZZLE_REQUIREMENT } from '@candyfight/shared/services/puzzleService';
import { CardMini } from '../card-components/CardMini';
import { PuzzleRequirement } from '../card-components/PuzzleRequirement';
import { districtIcons } from '../ui/GameIcon';
import { useT } from '../../i18n/useT';
import { nb, BrutalButton, inputStyle, sectionTitle, fieldLabel, ModalOverlay } from '../ui/nb';
import { EffectEntry, EffectListEditor, fromEntries, toEntries } from './EffectListEditor';

const NAME_MAX_LENGTH = 40;
const COPIES_MAX = 10;
const PUZZLE_COUNT_MAX = 9;

type RevealMode = 'none' | 'resources' | 'puzzle';

/**
 * Card editor: name, district symbols, Play effects (input-free registry
 * actions + resources) and — for base-deck cards only — Reveal, structured
 * identically to Play (Ninguno / Resources / Puzzle). Live CardMini preview.
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

  const [revealMode, setRevealMode] = useState<RevealMode>(() =>
    hasPuzzleReveal(card) ? 'puzzle' : hasAnyReveal(card) ? 'resources' : 'none'
  );
  const [revealEntries, setRevealEntries] = useState<EffectEntry[]>(() =>
    toEntries({
      resources: card.secondaryResources,
      actions: card.secondaryEffects?.filter(e => e.actionId !== LocationActionsEnum.STRANGE_CANDY_PUZZLE),
    })
  );
  const initialPuzzleRequirement = getPuzzleRequirement(card) ?? DEFAULT_PUZZLE_REQUIREMENT;
  const [puzzleSymbolCounts, setPuzzleSymbolCounts] = useState<Partial<Record<DistrictIconsEnum, number>>>(
    initialPuzzleRequirement.symbolCounts
  );
  const [puzzleWildcards, setPuzzleWildcards] = useState(initialPuzzleRequirement.wildcards);

  const [copies, setCopies] = useState(card.copies ?? 1);

  const toggleDistrict = (id: DistrictIconsEnum) =>
    setDistrictIds(current =>
      current.includes(id) ? current.filter(d => d !== id) : [...current, id]
    );

  const revealSecondary = (): Pick<ModCard, 'secondaryResources' | 'secondaryEffects'> => {
    if (revealMode === 'resources') {
      const bag = fromEntries(revealEntries, false);
      return {
        ...(bag.resources?.length ? { secondaryResources: bag.resources } : {}),
        ...(bag.actions?.length ? { secondaryEffects: bag.actions } : {}),
      };
    }
    if (revealMode === 'puzzle') {
      return {
        secondaryEffects: [{
          actionId: LocationActionsEnum.STRANGE_CANDY_PUZZLE,
          name: 'Puzzle',
          params: { symbolCounts: puzzleSymbolCounts, wildcards: puzzleWildcards },
        }],
      };
    }
    return {};
  };

  const edited = (): ModCard => {
    const play = fromEntries(playEntries, false);
    return {
      id: card.id,
      name: name.trim() || card.name,
      districtIds: [...districtIds],
      ...(play.resources?.length ? { primaryResources: play.resources } : {}),
      ...(play.actions?.length ? { primaryEffects: play.actions } : {}),
      ...(allowReveal ? revealSecondary() : {}),
      ...(copies > 1 ? { copies } : {}),
    };
  };

  const preview = edited();

  return (
    <ModalOverlay onCancel={onCancel} zIndex={1100} maxWidth="min(720px, 94vw)">
        <h2 style={{ ...sectionTitle, fontSize: '13px', margin: 0 }}>🃏 {name || card.name}</h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '24px', alignItems: 'start' }}>
          {/* Live preview at 1.6x */}
          <div style={{ transform: 'scale(1.6)', transformOrigin: 'top left', width: 105 * 1.6, height: 157 * 1.6 }}>
            <CardMini card={{ ...preview, id: 'preview' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: 0 }}>
            {/* Name */}
            <div>
              <div style={fieldLabel}>
                {t('modlab.cardName')}
              </div>
              <input value={name} maxLength={NAME_MAX_LENGTH} onChange={(e) => setName(e.target.value)} style={inputStyle} />
            </div>

            {/* District symbols */}
            <div>
              <div style={fieldLabel}>
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
              <div style={fieldLabel}>
                {t('modlab.copies')}
              </div>
              <input
                type="number" min={1} max={COPIES_MAX}
                value={copies}
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

            {/* Reveal — same structure as Play, plus the Puzzle option */}
            {allowReveal && (
              <div style={{ border: nb.border, padding: '12px', backgroundColor: '#fafafa' }}>
                <div style={{ fontSize: '11px', fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>
                  👁 {t('modlab.reveal')}
                </div>
                <div style={{ display: 'flex', gap: '14px', marginBottom: '10px' }}>
                  {(['none', 'resources', 'puzzle'] as RevealMode[]).map(mode => (
                    <label key={mode} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                      <input type="radio" name="revealMode" checked={revealMode === mode} onChange={() => setRevealMode(mode)} />
                      {mode === 'none' ? t('modlab.revealNone') : mode === 'resources' ? t('modlab.revealResources') : t('modlab.revealPuzzle')}
                    </label>
                  ))}
                </div>

                {revealMode === 'resources' && (
                  <EffectListEditor
                    title={`▶ ${t('modlab.revealResources')}`}
                    isCost={false}
                    variant="cardPlay"
                    entries={revealEntries}
                    onChange={setRevealEntries}
                  />
                )}

                {revealMode === 'puzzle' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {Object.values(DistrictIconsEnum).map(symbol => (
                      <div key={symbol} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img src={districtIcons[symbol]} style={{ width: 20, height: 20 }} />
                        <input
                          type="number" min={0} max={PUZZLE_COUNT_MAX}
                          value={puzzleSymbolCounts[symbol] ?? 0}
                          onChange={(e) => {
                            const v = Math.min(PUZZLE_COUNT_MAX, Math.max(0, parseInt(e.target.value) || 0));
                            setPuzzleSymbolCounts(current => ({ ...current, [symbol]: v }));
                          }}
                          style={{ ...inputStyle, width: '64px', textAlign: 'center' }}
                        />
                      </div>
                    ))}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontWeight: 900, fontSize: '0.95em', width: 20, textAlign: 'center' }}>??</span>
                      <input
                        type="number" min={0} max={PUZZLE_COUNT_MAX}
                        value={puzzleWildcards}
                        onChange={(e) => setPuzzleWildcards(Math.min(PUZZLE_COUNT_MAX, Math.max(0, parseInt(e.target.value) || 0)))}
                        style={{ ...inputStyle, width: '64px', textAlign: 'center' }}
                      />
                      <span style={{ fontSize: '11px', color: '#777' }}>{t('modlab.puzzleWildcards')}</span>
                    </div>
                    <div style={{ padding: '10px', border: nb.border, backgroundColor: '#fff', display: 'flex', justifyContent: 'center' }}>
                      <PuzzleRequirement iconSize={20} requirement={{ symbolCounts: puzzleSymbolCounts, wildcards: puzzleWildcards }} />
                    </div>
                  </div>
                )}
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
    </ModalOverlay>
  );
};
