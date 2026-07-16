import { useEffect, useMemo, useState } from 'react';
import _ from 'lodash';
import mapBg from '../../assets/board/board-background.png';
import { ModDefinition, ModDistrict, ModLocation, DISTRICT_POSITIONS, defaultMarketTierIds } from '@candyfight/shared/mods';
import { DistrictIconsEnum, LocationActionsEnum } from '@candyfight/shared/enums';
import { DEFAULT_MARKET_TIER } from '@candyfight/shared/constants';
import { DeckEditor } from './DeckEditor';
import { DeckSetLoader } from './DeckSetLoader';
import { District, Location } from '@candyfight/shared/types';
import { useBoardScale, getScaleStyle, getBoardContainerStyle } from '../board-component/hooks/useBoardScale';
import { locsXPos, locsYPos } from '../board-component/constants';
import { LocationComponent } from '../location-component/LocationComponent';
import { DistrictIcon } from '../ui/GameIcon';
import { useT } from '../../i18n/useT';
import { nb, BrutalButton, inputStyle } from '../ui/nb';
import { LocationEditorDialog } from './LocationEditorDialog';
import { useAppStore } from '../../store';

/**
 * The board AS the editor: the mod's districts rendered on the real board
 * canvas; clicking a location opens the maximized edit dialog. All edits live
 * in a local draft until SAVE hands the ModDefinition back to the Mod Lab.
 */
export const ModBoardEditor = ({
  mod,
  saving,
  onSave,
  onBack,
}: {
  mod: ModDefinition;
  saving: boolean;
  onSave: (draft: ModDefinition) => void;
  onBack: () => void;
}) => {
  const t = useT();
  const { scale, outerRef } = useBoardScale();
  const [draft, setDraft] = useState<ModDefinition>(() => _.cloneDeep(mod));
  const [editing, setEditing] = useState<{ districtIndex: number; locationIndex: number } | null>(null);
  // Consumes a pending "land on this tab" hint left by the Deck Lab's Volver
  // (returning from the "✏️ Editar Mazo" trip) — runs once, since this
  // component remounts fresh per mod (key={mod.id} in ModLabScreen).
  const [view, setView] = useState<'board' | 'decks'>(() => {
    const pending = useAppStore.getState().modLabReturnView;
    if (pending) useAppStore.getState().setModLabReturnView(null);
    return pending ?? 'board';
  });
  // Tier to scroll into view when landing on MAZOS from the location dialog's
  // "✏️ Editar Mazo" shortcut.
  const [highlightTierId, setHighlightTierId] = useState<string | null>(null);

  // Round-robin default tier per market location — single source shared with
  // buildDistrictsFromMod, so what the editor shows matches what plays.
  const marketDefaults = useMemo(() => defaultMarketTierIds(draft), [draft]);

  // Tiers referenced by BUY_CARD locations can't be deleted in the deck view.
  const usedTierIds = useMemo(() => {
    const used = new Set<string>();
    draft.districts.forEach((d, districtIndex) => d.locations.forEach((loc, locationIndex) => {
      if (loc.reward.actions?.some(a => a.actionId === LocationActionsEnum.BUY_CARD)) {
        used.add(loc.marketTierId ?? marketDefaults.get(`${districtIndex}:${locationIndex}`) ?? DEFAULT_MARKET_TIER);
      }
    }));
    return used;
  }, [draft, marketDefaults]);

  // After a successful save the parent hands back the persisted mod — resync
  // the draft so the dirty flag clears (the state initializer only runs once).
  useEffect(() => {
    setDraft(_.cloneDeep(mod));
  }, [mod]);

  const isDirty = useMemo(() => !_.isEqual(draft, mod), [draft, mod]);

  const onApplyLocation = (edited: ModLocation) => {
    if (!editing) return;
    setDraft(current => ({
      ...current,
      districts: current.districts.map((d, i) =>
        i === editing.districtIndex
          ? { ...d, locations: d.locations.map((l, j) => j === editing.locationIndex ? edited : l) }
          : d
      ),
    }));
    setEditing(null);
  };

  const onDistrictRename = (districtIndex: number, name: string) => {
    setDraft(current => ({
      ...current,
      districts: current.districts.map((d, i) => i === districtIndex ? { ...d, name } : d),
    }));
  };

  const onBackGuarded = () => {
    if (isDirty && !window.confirm(t('modlab.discardUnsaved'))) return;
    onBack();
  };

  // "✏️ Edit Deck Set" shortcut from the MAZOS view: leaves the mod editor
  // for the Deck Lab, opened straight into that deck set — same dirty guard
  // as the back button, since it's an equivalent navigation-away. Remembers
  // this mod so the Deck Lab's "Volver" can jump straight back into it
  // (MAZOS tab) instead of landing on the Deck Lab's own table.
  const onEditDeckSet = (deckSetId: string) => {
    if (isDirty && !window.confirm(t('modlab.discardUnsaved'))) return;
    useAppStore.getState().setDeckLabReturnModId(mod.id);
    useAppStore.getState().setDeckLabTargetId(deckSetId);
    useAppStore.getState().setScreen('deckLab');
  };

  // "✏️ Editar Mazo" shortcut from the location dialog's market-tier select:
  // apply the location's pending edits (so the chosen tier isn't lost), then
  // jump straight to that tier's card list in the MAZOS view.
  const onEditTierDeck = (tierId: string, editedLocation: ModLocation) => {
    onApplyLocation(editedLocation);
    setHighlightTierId(tierId);
    setView('decks');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: nb.bg, fontFamily: nb.font }}>
      {/* Header bar */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
          padding: '12px 16px', backgroundColor: '#fff', borderBottom: nb.border,
        }}
      >
        <BrutalButton onClick={onBackGuarded} style={{ backgroundColor: '#fff' }}>
          ← {t('modlab.back')}
        </BrutalButton>

        <input
          value={draft.name}
          maxLength={40}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          style={{ ...inputStyle, width: '220px', fontWeight: 800 }}
          placeholder={t('modlab.name')}
        />
        <input
          value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          style={{ ...inputStyle, flex: 1, minWidth: '160px' }}
          placeholder={t('modlab.description')}
        />

        {/* View tabs: board | decks */}
        <div style={{ display: 'inline-flex', border: nb.border }}>
          {([['board', t('modlab.viewBoard')], ['decks', t('modlab.viewDecks')]] as const).map(([id, label], i) => (
            <button
              key={id}
              onClick={() => setView(id)}
              style={{
                padding: '6px 14px', fontWeight: 900, fontSize: '11px',
                textTransform: 'uppercase', letterSpacing: '0.06em',
                fontFamily: nb.font, cursor: 'pointer', border: 'none',
                borderLeft: i > 0 ? '2px solid #000' : 'none',
                backgroundColor: view === id ? '#000' : '#fff',
                color: view === id ? '#fff' : '#000',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <span
          style={{
            fontSize: '10px', fontWeight: 900, letterSpacing: '0.08em',
            padding: '4px 8px', border: nb.border,
            backgroundColor: isDirty ? '#fecaca' : '#dcfce7',
            whiteSpace: 'nowrap',
          }}
        >
          {isDirty ? `● ${t('modlab.unsaved')}` : `✓ ${t('modlab.saved')}`}
        </span>

        <BrutalButton
          onClick={() => onSave(draft)}
          disabled={!isDirty || saving}
          style={{ backgroundColor: '#000', color: '#fff' }}
        >
          {saving ? '…' : `💾 ${t('modlab.save')}`}
        </BrutalButton>
      </div>

      {/* Board canvas */}
      {view === 'board' && (
        <div className="w-screen overflow-auto board-outer" ref={outerRef} style={{ ...getScaleStyle(scale), flex: 1 }}>
          <div className="board-viewport">
            <div style={getBoardContainerStyle(mapBg)} className="board-container relative mx-auto">
              {draft.districts.map((district, districtIndex) => (
                <EditorDistrict
                  key={district.id}
                  district={district}
                  districtIndex={districtIndex}
                  onRename={(name) => onDistrictRename(districtIndex, name)}
                  onLocationClick={(locationIndex) => setEditing({ districtIndex, locationIndex })}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Deck editor */}
      {view === 'decks' && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <DeckSetLoader
            currentDecks={draft.decks ?? {}}
            lastSavedDecks={mod.decks}
            onLoad={(decks) => setDraft(current => ({ ...current, decks: _.cloneDeep(decks) }))}
            onEditDeckSet={onEditDeckSet}
          />
          <DeckEditor
            decks={draft.decks ?? {}}
            usedTierIds={usedTierIds}
            highlightTierId={highlightTierId}
            onHighlightConsumed={() => setHighlightTierId(null)}
            onChange={(decks) => setDraft(current => ({ ...current, decks }))}
          />
        </div>
      )}

      {/* Location editor modal */}
      {editing && (
        <LocationEditorDialog
          district={draft.districts[editing.districtIndex]}
          location={draft.districts[editing.districtIndex].locations[editing.locationIndex]}
          marketTiers={draft.decks?.marketTiers ?? []}
          defaultTierId={marketDefaults.get(`${editing.districtIndex}:${editing.locationIndex}`)}
          onApply={onApplyLocation}
          onCancel={() => setEditing(null)}
          onEditTierDeck={onEditTierDeck}
        />
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Editor board layer — same geometry as BoardDistrictsLayer, without the
// live-match plumbing (players, presence, phases).
// ---------------------------------------------------------------------------

const TILE_W = Math.round(1280 / 12);
const TILE_H = Math.round(720 / 12);
const HEADER_H = 32;
const HEADER_GAP = 8;
const HEADER_MARGIN = 6;

const EditorDistrict = ({
  district,
  districtIndex,
  onRename,
  onLocationClick,
}: {
  district: ModDistrict;
  districtIndex: number;
  onRename: (name: string) => void;
  onLocationClick: (locationIndex: number) => void;
}) => {
  const position = DISTRICT_POSITIONS[district.id as DistrictIconsEnum];
  const xs = locsXPos[districtIndex];
  const ys = locsYPos[districtIndex];
  const isTop = districtIndex >= 2;

  const headerLeft = Math.min(...xs) - HEADER_MARGIN;
  const headerWidth = Math.max(...xs) + TILE_W - Math.min(...xs) + HEADER_MARGIN * 2;
  const headerTop = isTop
    ? Math.max(...ys) + TILE_H + HEADER_GAP
    : Math.min(...ys) - HEADER_H - HEADER_GAP;

  const runtimeDistrict: District = {
    id: district.id as DistrictIconsEnum,
    name: district.name,
    x: position.x,
    y: position.y,
    presence: {},
    locations: [],
  };

  return (
    <div className="district-container absolute" style={{ top: position.y, left: position.x, width: '340px', height: '130px' }}>
      {/* Header with inline-editable district name */}
      <div
        className={`district-header district-header--${district.id.toLowerCase()}`}
        style={{ top: headerTop, left: headerLeft, width: headerWidth }}
      >
        <DistrictIcon districtId={district.id} size="md" />
        <input
          value={district.name}
          maxLength={40}
          onChange={(e) => onRename(e.target.value)}
          style={{
            background: 'transparent',
            border: 'none',
            borderBottom: '1px dashed #888',
            color: 'inherit',
            font: 'inherit',
            fontWeight: 700,
            width: '70%',
            outline: 'none',
          }}
        />
      </div>

      {/* Location tiles — every tile clickable in editorMode */}
      {district.locations.map((location: ModLocation, locationIndex: number) => {
        const runtimeLocation: Location = {
          Id: `${district.id}-${locationIndex}`,
          districtId: district.id,
          name: location.name,
          cost: { districtIconIds: [district.id], ...location.cost },
          reward: location.reward,
          isRestrictedArea: location.isRestrictedArea,
          isModDisabled: location.isDisabled,
        };
        return (
          <div className="location-container" key={`editor-location-${districtIndex}-${locationIndex}`}>
            <LocationComponent
              {...runtimeLocation}
              x={xs[locationIndex]}
              y={ys[locationIndex]}
              district={runtimeDistrict}
              onClick={() => onLocationClick(locationIndex)}
              isDisabled={false}
              editorMode
            />
          </div>
        );
      })}
    </div>
  );
};
