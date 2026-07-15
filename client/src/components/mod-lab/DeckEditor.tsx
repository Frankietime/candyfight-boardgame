import { useState } from 'react';
import _ from 'lodash';
import { ModCard, ModDecks, ModMarketTier, revealEffectOf } from '@candyfight/shared/mods';
import { DistrictIconsEnum } from '@candyfight/shared/enums';
import { CardMini } from '../card-components/CardMini';
import { useT } from '../../i18n/useT';
import { nb, BrutalButton, inputStyle, sectionTitle } from '../ui/nb';
import { CardEditorDialog } from './CardEditorDialog';

/**
 * MAZOS view of the Mod Lab: the base deck (one section) + one section per
 * market tier. Cards render as CardMini rows with copies / edit / delete;
 * tiers can be added, renamed and (when no location uses them) deleted.
 */

let _newCardSeq = 0;
const newCard = (): ModCard => ({
  id: `card-${Date.now().toString(36)}-${++_newCardSeq}`,
  name: 'New Card',
  districtIds: [DistrictIconsEnum.D1],
});

export const DeckEditor = ({
  decks,
  usedTierIds,
  onChange,
}: {
  decks: ModDecks;
  /** Tier ids referenced by board locations — cannot be deleted. */
  usedTierIds: Set<string>;
  onChange: (decks: ModDecks) => void;
}) => {
  const t = useT();
  const [editing, setEditing] = useState<{ tierId: string | null; index: number; card: ModCard } | null>(null);

  const baseDeck = decks.baseDeck ?? [];
  const tiers = decks.marketTiers ?? [];

  const update = (mutate: (next: ModDecks) => void) => {
    const next = _.cloneDeep(decks);
    mutate(next);
    onChange(next);
  };

  const cardsOf = (next: ModDecks, tierId: string | null): ModCard[] =>
    tierId === null
      ? (next.baseDeck ??= [])
      : (next.marketTiers ?? []).find(tier => tier.id === tierId)!.cards;

  const onApplyCard = (edited: ModCard) => {
    if (!editing) return;
    update(next => { cardsOf(next, editing.tierId)[editing.index] = edited; });
    setEditing(null);
  };

  const addCard = (tierId: string | null) =>
    update(next => { cardsOf(next, tierId).push(newCard()); });

  const removeCard = (tierId: string | null, index: number) =>
    update(next => { cardsOf(next, tierId).splice(index, 1); });

  const addTier = () =>
    update(next => {
      const existing = new Set((next.marketTiers ?? []).map(tier => tier.id));
      let n = (next.marketTiers?.length ?? 0) + 1;
      while (existing.has(`tier${n}`)) n++;
      (next.marketTiers ??= []).push({ id: `tier${n}`, name: `Tier ${n}`, cards: [newCard()] });
    });

  const removeTier = (tierId: string) => {
    if (usedTierIds.has(tierId)) {
      window.alert(t('modlab.tierInUse'));
      return;
    }
    update(next => {
      next.marketTiers = (next.marketTiers ?? []).filter(tier => tier.id !== tierId);
    });
  };

  const renameTier = (tierId: string, name: string) =>
    update(next => {
      const tier = (next.marketTiers ?? []).find(x => x.id === tierId);
      if (tier) tier.name = name;
    });

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Base deck */}
      <DeckSection
        title={`🂠 ${t('modlab.baseDeck')}`}
        subtitle={t('modlab.baseDeckHint')}
        cards={baseDeck}
        onEdit={(index) => setEditing({ tierId: null, index, card: baseDeck[index] })}
        onRemove={(index) => removeCard(null, index)}
        onAdd={() => addCard(null)}
        addLabel={t('modlab.addCard')}
      />

      {/* Market tiers */}
      {tiers.map(tier => (
        <DeckSection
          key={tier.id}
          title={`🛒 ${tier.id}`}
          renameValue={tier.name}
          onRename={(name) => renameTier(tier.id, name)}
          onDelete={() => removeTier(tier.id)}
          deleteDisabled={usedTierIds.has(tier.id)}
          cards={tier.cards}
          onEdit={(index) => setEditing({ tierId: tier.id, index, card: tier.cards[index] })}
          onRemove={(index) => removeCard(tier.id, index)}
          onAdd={() => addCard(tier.id)}
          addLabel={t('modlab.addCard')}
        />
      ))}

      <BrutalButton onClick={addTier} style={{ justifyContent: 'center', backgroundColor: nb.accent, boxShadow: nb.shadowMd }}>
        {t('modlab.addTier')}
      </BrutalButton>

      {editing && (
        <CardEditorDialog
          card={editing.card}
          allowReveal={editing.tierId === null}
          onApply={onApplyCard}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  );
};

const REVEAL_BADGES: Record<string, string> = {
  fight: '👁 +1 Fight',
  candy: '👁 +1 Candy',
  puzzle: '👁 Puzzle',
};

const DeckSection = ({
  title,
  subtitle,
  renameValue,
  onRename,
  onDelete,
  deleteDisabled,
  cards,
  onEdit,
  onRemove,
  onAdd,
  addLabel,
}: {
  title: string;
  subtitle?: string;
  renameValue?: string;
  onRename?: (name: string) => void;
  onDelete?: () => void;
  deleteDisabled?: boolean;
  cards: ModCard[];
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
  addLabel: string;
}) => (
  <div style={{ backgroundColor: '#fff', border: nb.border, boxShadow: nb.shadowMd, padding: '16px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
      <h3 style={{ ...sectionTitle, margin: 0, whiteSpace: 'nowrap' }}>{title}</h3>
      {onRename !== undefined && (
        <input
          value={renameValue}
          maxLength={40}
          onChange={(e) => onRename(e.target.value)}
          style={{ ...inputStyle, width: '180px', padding: '4px 8px', fontSize: '12px' }}
        />
      )}
      <span style={{ flex: 1 }} />
      {onDelete && (
        <BrutalButton
          onClick={onDelete}
          disabled={deleteDisabled}
          title={deleteDisabled ? 'Tier in use by a location' : undefined}
          style={{ backgroundColor: '#fecaca', padding: '4px 10px', fontSize: '11px' }}
        >
          ✕
        </BrutalButton>
      )}
    </div>
    {subtitle && <div style={{ fontSize: '11px', color: '#777', marginBottom: '10px' }}>{subtitle}</div>}

    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
      {cards.map((card, index) => {
        const reveal = revealEffectOf(card);
        return (
          <div key={card.id} style={{ border: nb.border, padding: '8px', backgroundColor: '#fafafa', width: 150 }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
              <CardMini card={{ ...card, id: card.id } as never} width={92} height={138} iconSize={13} />
            </div>
            <div style={{ fontSize: '11px', fontWeight: 800, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {card.name}
            </div>
            <div style={{ fontSize: '10px', color: '#666', textAlign: 'center', minHeight: 14 }}>
              {(card.copies ?? 1) > 1 ? `×${card.copies}` : ''}
              {reveal !== 'none' && reveal !== 'invalid' ? ` ${REVEAL_BADGES[reveal]}` : ''}
            </div>
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginTop: 6 }}>
              <BrutalButton onClick={() => onEdit(index)} style={{ backgroundColor: '#000', color: '#fff', padding: '3px 9px', fontSize: '11px' }}>
                ✏️
              </BrutalButton>
              <BrutalButton onClick={() => onRemove(index)} disabled={cards.length <= 1} style={{ backgroundColor: '#fecaca', padding: '3px 9px', fontSize: '11px' }}>
                ✕
              </BrutalButton>
            </div>
          </div>
        );
      })}

      <button
        onClick={onAdd}
        style={{
          width: 150, minHeight: 200, border: '2px dashed #aaa', backgroundColor: 'transparent',
          color: '#888', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: nb.font,
        }}
      >
        {addLabel}
      </button>
    </div>
  </div>
);
