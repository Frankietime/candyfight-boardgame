import { useState } from 'react';
import { DEFAULT_GAME_CONFIG } from '@candyfight/shared/types';
import { BASE_MOD_ID, ModDefinition } from '@candyfight/shared/mods';
import { getRandomPlayerName } from '@candyfight/shared/services/moves/playerServices';
import { useAppStore } from '../../store';
import { useLobbyStore } from '../lobby-component/store';
import { useLobbyServices } from '../../services/lobbyServices';
import { generateBattleEvent } from '../lobby-component/helper';
import { fetchMod, useModsList } from '../../services/modServices';
import { useT } from '../../i18n/useT';
import { nb, BrutalButton, inputStyle, btnBase } from '../ui/nb';
import { BOT_MATCH_ID } from '../../botMatch';

/**
 * Inline match configuration inside the Open Matches box: a full-width
 * button that unfolds, in place, into the full config panel — match name,
 * starting resources, victory points, cartridge slot, and the seat roster
 * (host + humans and/or bots). Replaces the old GameConfigModal + vs-Bots
 * card.
 */

type SeatKind = 'human' | 'bot';
type Seat = { kind: SeatKind; botName: string };

const newBotSeat = (): Seat => ({ kind: 'bot', botName: getRandomPlayerName() });

const MAX_EXTRA_SEATS = 3;

const labelStyle: React.CSSProperties = {
  fontSize: '10px',
  fontWeight: 900,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: '6px',
};

const numberInput: React.CSSProperties = {
  ...inputStyle,
  width: '64px',
  textAlign: 'center',
  padding: '6px 8px',
};

export const NewMatchPanel = () => {
  const t = useT();
  const { createMatch } = useLobbyServices();
  const { playerState, setPlayerState, setBotSeats, setBotNames, setActiveMod, activeMod } = useAppStore();
  const { matchLore, setMatchLore } = useLobbyStore();
  const { mods, modsUnavailable } = useModsList();

  const [open, setOpen] = useState(false);
  const [initialCandy, setInitialCandy] = useState(DEFAULT_GAME_CONFIG.initialCandy);
  const [initialLoot, setInitialLoot] = useState(DEFAULT_GAME_CONFIG.initialLoot);
  const [victoryPoints, setVictoryPoints] = useState(DEFAULT_GAME_CONFIG.victoryPoints);
  const [modId, setModId] = useState<string>(activeMod?.id ?? BASE_MOD_ID);
  const [modPayload, setModPayload] = useState<ModDefinition | null>(activeMod);
  const [seats, setSeats] = useState<Seat[]>([newBotSeat()]);
  const [creating, setCreating] = useState(false);
  const [loadingMod, setLoadingMod] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const botCount = seats.filter(s => s.kind === 'bot').length;
  const humanCount = seats.filter(s => s.kind === 'human').length;
  const isMixed = botCount > 0 && humanCount > 0;
  const canAccept = seats.length >= 1 && !isMixed && !creating && !loadingMod;

  const onSelectMod = async (id: string) => {
    setModId(id);
    setError(null);
    if (id === BASE_MOD_ID) {
      setModPayload(null);
      return;
    }
    setLoadingMod(true);
    try {
      const record = await fetchMod(id);
      const payload: ModDefinition = { ...record.payload, id: record.id, name: record.name, description: record.description };
      setModPayload(payload);
      // The cartridge's defaults pre-fill the config; still editable below.
      if (payload.gameConfig?.initialCandy !== undefined) setInitialCandy(payload.gameConfig.initialCandy);
      if (payload.gameConfig?.initialLoot !== undefined) setInitialLoot(payload.gameConfig.initialLoot);
      if (payload.gameConfig?.victoryPoints !== undefined) setVictoryPoints(payload.gameConfig.victoryPoints);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setModId(BASE_MOD_ID);
      setModPayload(null);
    } finally {
      setLoadingMod(false);
    }
  };

  const setSeatKind = (index: number, kind: SeatKind) =>
    setSeats(current => current.map((seat, i) =>
      i === index ? (kind === 'bot' ? { ...newBotSeat(), botName: seat.botName || getRandomPlayerName() } : { ...seat, kind }) : seat
    ));

  const rerollBotName = (index: number) =>
    setSeats(current => current.map((seat, i) => (i === index ? { ...seat, botName: getRandomPlayerName() } : seat)));

  const onAccept = async () => {
    if (!canAccept) return;
    setCreating(true);
    setError(null);
    try {
      const totalSeats = seats.length + 1;
      if (botCount > 0) {
        // All-bots table → fully client-side Local match.
        setActiveMod(modPayload);
        setBotNames(seats.map(s => s.botName));
        setBotSeats(totalSeats);
        setPlayerState({ ...playerState, matchID: BOT_MATCH_ID, playerID: '0', playerCredentials: '' });
      } else {
        await createMatch(totalSeats, {
          name: useLobbyStore.getState().matchLore.title,
          playerName: useAppStore.getState().playerState.name,
          initialCandy,
          initialLoot,
          victoryPoints,
          mod: modPayload ?? undefined,
        });
        setOpen(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  };

  if (!open) {
    return (
      <BrutalButton
        onClick={() => setOpen(true)}
        style={{
          width: '100%',
          justifyContent: 'center',
          backgroundColor: '#000',
          color: '#fff',
          boxShadow: nb.shadowMd,
          padding: '12px 16px',
          fontSize: '13px',
        }}
      >
        ➕ {t('lobby.newMatch')}
      </BrutalButton>
    );
  }

  return (
    <div style={{ border: nb.border, boxShadow: nb.shadowMd, backgroundColor: nb.accent, padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ fontSize: '12px', fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        ⚙ {t('lobby.newMatch')}
      </div>

      {/* Match name */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          value={matchLore.title}
          onChange={(e) => setMatchLore({ ...matchLore, title: e.target.value })}
          style={{ ...inputStyle, flex: 1 }}
          placeholder="Match name…"
        />
        <BrutalButton onClick={() => setMatchLore(generateBattleEvent())} style={{ backgroundColor: '#fff', padding: '8px 12px' }}>
          ⚡
        </BrutalButton>
      </div>

      {/* Cartridge slot */}
      <div>
        <div style={labelStyle}>🕹️ {t('lobby.cartridge')}</div>
        <select
          value={modId}
          onChange={(e) => onSelectMod(e.target.value)}
          style={{ ...inputStyle, cursor: 'pointer' }}
        >
          <option value={BASE_MOD_ID}>{t('modlab.baseCartridge')}</option>
          {mods.map(mod => (
            <option key={mod.id} value={mod.id}>{mod.name}</option>
          ))}
        </select>
        {modsUnavailable && (
          <div style={{ fontSize: '10px', fontWeight: 600, color: '#92400e', marginTop: '4px' }}>
            {t('modlab.unavailable')}
          </div>
        )}
      </div>

      {/* Config: starting resources + VP */}
      <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <div style={labelStyle}>🍬 Candy</div>
          <input
            type="number" min={0} max={20} value={initialCandy}
            onChange={(e) => setInitialCandy(Math.max(0, parseInt(e.target.value) || 0))}
            style={numberInput}
          />
        </div>
        <div>
          <div style={labelStyle}>💰 Loot</div>
          <input
            type="number" min={0} max={20} value={initialLoot}
            onChange={(e) => setInitialLoot(Math.max(0, parseInt(e.target.value) || 0))}
            style={numberInput}
          />
        </div>
        <div>
          <div style={labelStyle}>⭐ {t('lobby.victoryPoints')}</div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {[4, 6, 8, 10].map(vp => (
              <button
                key={vp}
                onClick={() => setVictoryPoints(vp)}
                style={{
                  ...btnBase,
                  padding: '6px 12px',
                  backgroundColor: victoryPoints === vp ? '#000' : '#fff',
                  color: victoryPoints === vp ? '#fff' : '#000',
                }}
              >
                {vp}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Seats roster */}
      <div>
        <div style={labelStyle}>👥 {t('lobby.seats')}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Host seat */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', border: nb.border, backgroundColor: '#fff', padding: '6px 10px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800 }}>1.</span>
            <span style={{ fontSize: '12px', fontWeight: 700, flex: 1 }}>{playerState.name}</span>
            <span style={{ fontSize: '9px', fontWeight: 900, backgroundColor: '#000', color: '#fff', padding: '2px 6px' }}>
              {t('lobby.you')}
            </span>
          </div>

          {seats.map((seat, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', border: nb.border, backgroundColor: '#fff', padding: '6px 10px' }}>
              <span style={{ fontSize: '12px', fontWeight: 800 }}>{index + 2}.</span>
              {/* Human / Bot toggle */}
              {(['human', 'bot'] as SeatKind[]).map(kind => (
                <button
                  key={kind}
                  onClick={() => setSeatKind(index, kind)}
                  style={{
                    ...btnBase,
                    padding: '4px 10px',
                    fontSize: '10px',
                    backgroundColor: seat.kind === kind ? '#000' : '#fff',
                    color: seat.kind === kind ? '#fff' : '#000',
                  }}
                >
                  {kind === 'human' ? `🧑 ${t('lobby.humanSeat')}` : `🤖 ${t('lobby.botSeat')}`}
                </button>
              ))}
              <span style={{ flex: 1, fontSize: '11px', fontWeight: 600, color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {seat.kind === 'bot' ? `🤖 ${seat.botName}` : t('lobby.openSeat')}
              </span>
              {seat.kind === 'bot' && (
                <BrutalButton onClick={() => rerollBotName(index)} style={{ padding: '2px 8px', fontSize: '11px', backgroundColor: '#fff' }} title="Reroll name">
                  ⚄
                </BrutalButton>
              )}
              <BrutalButton
                onClick={() => setSeats(current => current.filter((_, i) => i !== index))}
                disabled={seats.length <= 1}
                style={{ padding: '2px 8px', fontSize: '11px', backgroundColor: '#fecaca' }}
              >
                ✕
              </BrutalButton>
            </div>
          ))}

          {seats.length < MAX_EXTRA_SEATS && (
            <BrutalButton
              onClick={() => setSeats(current => [...current, newBotSeat()])}
              style={{ justifyContent: 'center', backgroundColor: '#fff', fontSize: '11px', padding: '6px' }}
            >
              ＋ {t('lobby.addSeat')}
            </BrutalButton>
          )}
        </div>
        {isMixed && (
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#92400e', marginTop: '6px' }}>
            ⚠ {t('lobby.mixedUnsupported')}
          </div>
        )}
      </div>

      {error && (
        <div style={{ fontSize: '11px', fontWeight: 600, color: '#991b1b', backgroundColor: '#fecaca', border: nb.border, padding: '8px' }}>
          {error}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        <BrutalButton onClick={() => setOpen(false)} style={{ backgroundColor: '#fff' }}>
          {t('modlab.cancel')}
        </BrutalButton>
        <BrutalButton
          onClick={onAccept}
          disabled={!canAccept}
          style={{ backgroundColor: '#000', color: '#fff', boxShadow: nb.shadowMd }}
        >
          {creating ? '…' : `▶ ${t('lobby.accept')} (${seats.length + 1}P)`}
        </BrutalButton>
      </div>
    </div>
  );
};
