import { useState } from 'react';
import { District, Location } from '@candyfight/shared/types';
import { DistrictIconsEnum, LocationActionsEnum } from '@candyfight/shared/enums';
import { ModDistrict, ModLocation, ModMarketTier } from '@candyfight/shared/mods';
import { LocationComponent } from '../location-component/LocationComponent';
import { useT } from '../../i18n/useT';
import { nb, BrutalButton, inputStyle, sectionTitle } from '../ui/nb';
import { EffectEntry, EffectListEditor, fromEntries, toEntries } from './EffectListEditor';

const NAME_MAX_LENGTH = 40;
const PREVIEW_SCALE = 3;
const TILE_W = 1280 / 12;
const TILE_H = 720 / 12;

/**
 * Maximized location view + edit form (name, restricted toggle, cost and
 * reward entry lists). APPLY hands the edited ModLocation back to the board
 * editor's draft; nothing touches the server until the editor's SAVE.
 */
export const LocationEditorDialog = ({
  district,
  location,
  marketTiers,
  onApply,
  onCancel,
}: {
  district: ModDistrict;
  location: ModLocation;
  /** The mod's market tiers — shown as the tier slot when the reward sells cards. */
  marketTiers: ModMarketTier[];
  onApply: (edited: ModLocation) => void;
  onCancel: () => void;
}) => {
  const t = useT();
  const [name, setName] = useState(location.name);
  const [isRestrictedArea, setIsRestrictedArea] = useState(!!location.isRestrictedArea);
  const [isDisabled, setIsDisabled] = useState(!!location.isDisabled);
  const [costEntries, setCostEntries] = useState<EffectEntry[]>(() => toEntries(location.cost));
  const [rewardEntries, setRewardEntries] = useState<EffectEntry[]>(() => toEntries(location.reward));
  const [marketTierId, setMarketTierId] = useState<string>(
    location.marketTierId ?? marketTiers[0]?.id ?? 'tier1'
  );

  const sellsCards = rewardEntries.some(
    e => e.kind === 'action' && e.id === LocationActionsEnum.BUY_CARD
  );

  // No undefined-valued keys: they survive _.isEqual but not JSON round-trips,
  // which would leave the editor's dirty flag permanently on after saving.
  const edited = (): ModLocation => {
    const { isRestrictedArea: _omit, isDisabled: _omit2, marketTierId: _omit3, ...rest } = location;
    return {
      ...rest,
      name: name.trim() || location.name,
      cost: fromEntries(costEntries, true),
      reward: fromEntries(rewardEntries, false),
      ...(isRestrictedArea ? { isRestrictedArea: true } : {}),
      ...(isDisabled ? { isDisabled: true } : {}),
      // Only card-selling locations carry a tier (no undefined keys).
      ...(sellsCards ? { marketTierId } : {}),
    };
  };

  // Live preview: the exact in-game tile, scaled up.
  const previewLocation: Location = {
    Id: 'preview',
    districtId: district.id,
    name: name.trim() || location.name,
    cost: { districtIconIds: [district.id], ...fromEntries(costEntries, true) },
    reward: fromEntries(rewardEntries, false),
    isRestrictedArea,
    isModDisabled: isDisabled,
  };
  const previewDistrict: District = {
    id: district.id as DistrictIconsEnum,
    name: district.name,
    x: 0,
    y: 0,
    presence: {},
    locations: [],
  };

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, fontFamily: nb.font,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#fff', border: nb.border, boxShadow: nb.shadowMd,
          padding: '24px', width: 'min(860px, 94vw)', maxHeight: '90vh', overflowY: 'auto',
          display: 'flex', flexDirection: 'column', gap: '18px',
        }}
      >
        <h2 style={{ ...sectionTitle, fontSize: '13px', margin: 0 }}>
          📍 {district.name} — {location.name}
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '24px', alignItems: 'start' }}>
          {/* Maximized tile preview (the real component, scaled) */}
          <div
            style={{
              width: TILE_W * PREVIEW_SCALE,
              height: TILE_H * PREVIEW_SCALE,
              position: 'relative',
              flexShrink: 0,
              border: '2px dashed #aaa',
            }}
          >
            <div
              style={{
                position: 'absolute',
                width: TILE_W,
                height: TILE_H,
                transform: `scale(${PREVIEW_SCALE})`,
                transformOrigin: 'top left',
              }}
            >
              <LocationComponent
                {...previewLocation}
                x={0}
                y={0}
                district={previewDistrict}
                onClick={() => {}}
                isDisabled={false}
                editorMode
              />
            </div>
          </div>

          {/* Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: 0 }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
                {t('modlab.locationName')}
              </div>
              <input
                value={name}
                maxLength={NAME_MAX_LENGTH}
                onChange={(e) => setName(e.target.value)}
                style={inputStyle}
              />
            </div>

            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isRestrictedArea}
                onChange={(e) => setIsRestrictedArea(e.target.checked)}
                style={{ width: 16, height: 16 }}
              />
              🚫 {t('modlab.restrictedArea')}
            </label>

            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', color: '#991b1b' }}>
              <input
                type="checkbox"
                checked={isDisabled}
                onChange={(e) => setIsDisabled(e.target.checked)}
                style={{ width: 16, height: 16 }}
              />
              ⛔ {t('modlab.disabledLocation')}
            </label>

            <EffectListEditor
              title={`💸 ${t('modlab.cost')}`}
              isCost
              entries={costEntries}
              onChange={setCostEntries}
            />
            <EffectListEditor
              title={`🎁 ${t('modlab.reward')}`}
              isCost={false}
              entries={rewardEntries}
              onChange={setRewardEntries}
            />

            {/* Market tier slot — only when the reward sells cards */}
            {sellsCards && (
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
                  🛒 {t('modlab.marketTier')}
                </div>
                <select
                  value={marketTierId}
                  onChange={(e) => setMarketTierId(e.target.value)}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  {marketTiers.map(tier => (
                    <option key={tier.id} value={tier.id}>{tier.id} — {tier.name}</option>
                  ))}
                </select>
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
