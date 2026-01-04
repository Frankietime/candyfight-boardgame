# Code Review
- Review the diff, report on issues, bugs, and improvements.
- End with a concise markdown table of any issues found, their solutions, and a risk assessment for each issue if applicable.
- Use emojis to convey the severity of each issue.

## Diff

diff --git a/.claude/settings.local.json b/.claude/settings.local.json
index da9cf7b..3b7f652 100644
--- a/.claude/settings.local.json
+++ b/.claude/settings.local.json
@@ -5,7 +5,16 @@
       "Bash(cat:*)",
       "Bash(find:*)",
       "Bash(npm install:*)",
-      "Bash(timeout 10 npm run dev:server:*)"
+      "Bash(timeout 10 npm run dev:server:*)",
+      "Bash(npm run build:*)",
+      "Bash(timeout 15 npm run dev:server:*)",
+      "Bash(cd:*)",
+      "Bash(tree:*)",
+      "WebSearch",
+      "WebFetch(domain:github.com)",
+      "Bash(timeout 15 npm run dev:*)",
+      "Bash(npx tsc:*)",
+      "mcp__ide__getDiagnostics"
     ]
   }
 }
diff --git a/client/package.json b/client/package.json
index c85944f..55721c0 100644
--- a/client/package.json
+++ b/client/package.json
@@ -14,7 +14,7 @@
     "@radix-ui/react-icons": "^1.3.2",
     "@radix-ui/themes": "^3.2.1",
     "@tailwindcss/vite": "^4.1.14",
-    "@tanstack/react-query": "^5.90.5",
+    "@tanstack/react-query": "^5.90.16",
     "@vitejs/plugin-react": "^5.0.4",
     "boardgame.io": "^0.50.2",
     "lodash": "^4.17.21",
diff --git a/client/src/App.css b/client/src/App.css
index 1560e61..950528d 100644
--- a/client/src/App.css
+++ b/client/src/App.css
@@ -2,7 +2,4 @@
 @import "nes.css/css/nes.min.css";
 @import "@fontsource/press-start-2p";
 @import "@radix-ui/themes/styles.css";
-
-.event-box:hover {
-  background-color: rgba(255, 255, 255, 0.5);
-}
\ No newline at end of file
+@import "./styles/theme.css";
\ No newline at end of file
diff --git a/client/src/components/board-component/BoardComponent.scss b/client/src/components/board-component/BoardComponent.scss
deleted file mode 100644
index 9d3a9f6..0000000
--- a/client/src/components/board-component/BoardComponent.scss
+++ /dev/null
@@ -1,88 +0,0 @@
-// .board-container {
-//     position: relative; 
-//     width: 1280px; 
-//     height: 720px; 
-//     background-size: 100% 100%; 
-//     overflow: visible;
-// }
-.pass-btn {
-    position: absolute;
-    border: 3px solid black;
-    top: 455px;
-    left: 970px;
-    width: 8%;
-    height: 7%;
-}
-
-.reveal-btn {
-    position: absolute;
-    border: 3px solid black;
-    top: 455px;
-    left: 1087px;
-    width: 8%;
-    height: 7%;
-}
-
-.pass-btn, .reveal-btn {
-    &:hover {
-        background-color: aqua;
-        opacity: 0.5;
-    }
-}
-.player-resource-container {
-    color: white; 
-    font-size: 9px;
-    font-weight: 600;
-    text-align: center;
-    width: 35px;
-    height: 220px;
-    top: 310px;
-    left: 255px;
-    div {
-        div {
-            color: rgb(155, 255, 155);
-            margin-bottom: 3px;
-        }
-    }
-}
-
-.card-selection-dialog-content {
-    z-index: 9999;
-    background-color: white;
-    width: 1500px;
-    height: 500px;
-}
-
-.board-outer {
-  position: relative;
-  width: 100vw;
-  height: 100vh;           /* fallback */
-  height: 100svh;          /* viewport estable en mobile */
-  display: grid;
-  place-items: center;
-  overflow: auto;          /* permite scroll si hace falta */
-  overscroll-behavior: contain;
-  -webkit-user-select: none;
-  user-select: none;
-}
-
-.board-viewport {
-  /* caja “real” que ocupa el tamaño escalado para centrar correctamente */
-  width: calc(1280px * var(--scale));
-  height: calc(720px * var(--scale));
-  position: relative;
-}
-
-.board-container {
-  position: absolute;
-  top: 0;
-  left: 0;
-  width: 1280px;
-  height: 720px;
-  transform-origin: top left;
-  transform: scale(var(--scale));
-  overflow: visible;
-  /* Render del bitmap, ajustá a gusto */
-  image-rendering: crisp-edges;   /* pixel-art look */
-  /* image-rendering: auto;       // suavizado */
-}
diff --git a/client/src/components/board-component/BoardComponent.tsx b/client/src/components/board-component/BoardComponent.tsx
index 636f65b..8726962 100644
--- a/client/src/components/board-component/BoardComponent.tsx
+++ b/client/src/components/board-component/BoardComponent.tsx
@@ -1,375 +1,209 @@
 import mapBg from "../../assets/board/prodis-tablero-estilo-y-char-v1.png";
 import { BoardProps } from "boardgame.io/react";
 import { GameState, PlayerGameState, Location, Card } from "@candyfight/shared/types";
-import { LocationComponent } from "../location-component/LocationComponent";
 import { GameInfoComponent } from "../game-info-component/GameInfoComponent";
 import { isNullOrEmpty } from "@candyfight/shared/common-methods";
-import { locsXPos, locsYPos } from "./constants";
-import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
-import "./BoardComponent.scss";
-import { LocationMovesEnum, PlayerColorsEnum } from "@candyfight/shared/enums";
-import _ from "lodash";
-import { Button, Dialog, Table } from "@radix-ui/themes";
+import { useEffect, useMemo, useState } from "react";
+import { LocationActionsEnum } from "@candyfight/shared/enums";
 import { useAppStore } from "../../store";
-import { CardSelectionModalOptions } from "./types";
 import { PlayerAreaComponent } from "../player-area-component/PlayerAreaComponent";
 import { useLobbyServices } from "../../services/lobbyServices";
-
-interface BoardGameProps extends BoardProps<GameState> {};
-
-export const BoardComponent = ({ 
-    ctx, 
-    G, 
-    moves, 
-    events,
-    log,
-    matchID,
-    playerID,
-    credentials,
-    sendChatMessage,
-    chatMessages,
-    
+import { useActionOrchestrator, ActionOrchestratorRenderer } from "../../actions/action-orchestrator";
+import { ActionParams } from "@candyfight/shared/actions";
+import { useMatchQuery } from "../../hooks/useMatchQuery";
+// Extracted hooks and components
+import { useBoardScale, getScaleStyle } from "./hooks/useBoardScale";
+import { BoardDistrictsLayer } from "./BoardDistrictsLayer";
+import { EndGameDialog, CombatPhaseDialog } from "./dialogs";
+// Import to trigger handler registration
+import "../input-handlers/CardSelectionHandler";
+
+interface BoardGameProps extends BoardProps<GameState> {}
+
+export const BoardComponent = ({
+  ctx,
+  G,
+  moves,
+  events,
+  matchID,
+  playerID,
 }: BoardGameProps) => {
-  const BASE_W = 1280;
-  const BASE_H = 720;
+  // Use extracted hook for responsive scaling
+  const { scale, outerRef, baseWidth, baseHeight } = useBoardScale();
 
-  const outerRef = useRef<HTMLDivElement | null>(null);
-  const [scale, setScale] = useState(1);
+  const { leaveMatch } = useLobbyServices();
+  const { playerState, setPlayerState } = useAppStore();
 
-    const { leaveMatch } = useLobbyServices();
+  // Fetch match data with React Query
+  const { data: matchData } = useMatchQuery(playerState?.matchID);
 
-    const { playerState, setPlayerState } = useAppStore();
+  // Action orchestrator for handling action input
+  const actionOrchestrator = useActionOrchestrator();
 
-  useLayoutEffect(() => {
-    const el = outerRef.current!;
-    const update = () => {
-      const availW = el.clientWidth;
-      const availH = el.clientHeight;
-      const s = Math.min(availW / BASE_W, availH / BASE_H);
-      // Allow scaling down on small (mobile) viewports
-      setScale(s);
-    };
-    update();
-    const ro = new ResizeObserver(update);
-    ro.observe(el);
-    window.addEventListener('resize', update);
-    return () => { ro.disconnect(); window.removeEventListener('resize', update); };
-  }, []);
-  
+  // Round ending state for combat phase
+  const [roundIsEnding, setRoundIsEnding] = useState(false);
+
+  // Reset UI state at the beginning of the round
   useEffect(() => {
-    // reset UI non-cient state at the begining of the round
-    if (ctx.phase == "mainPhase")
+    if (ctx.phase === "mainPhase") {
       setRoundIsEnding(false);
-    
-  }, [ctx.phase])
-
-  const { matchData } = useAppStore();
-
-  const initialCardSelectionModalOptions = {
-    actionName: "",
-    isOpen: false,
-    isRequired: true,
-    cardOptions: [],
-    callback: () => {},
-    selectionLimit: 0
-  }
-  const [cardSelectionModalOptions, setCardSelectionModalOptions] = useState<CardSelectionModalOptions>({...initialCardSelectionModalOptions});
+    }
+  }, [ctx.phase]);
 
+  // Current player state
   const player = useMemo<PlayerGameState>(() => {
-    if(playerID != null) 
-      return G.players[playerID] as PlayerGameState;    
+    if (playerID != null) {
+      return G.players[playerID] as PlayerGameState;
+    }
     return {} as PlayerGameState;
-  }, [G]);
+  }, [G.players, playerID]);
 
-  const onLeaveMatch = async () => {
-        leaveMatch(playerState)
-            .then(() => {
-                setPlayerState({ 
-                ...playerState, 
-                matchID: "", 
-                playerCredentials: ""
-            });
-        });
-    };
+  // Get currently selected card (not memoized - G changes every render)
+  const selectedCard = G.players[ctx.currentPlayer]?.selectedCard;
+
+  // Check if location is disabled (not memoized - depends on G)
+  const isLocationDisabled = (location: Location): boolean => {
+    return (
+      (location.name.includes("Sword Master") && player.maxNumberOfWorkers >= 3) ||
+      location.isDisabled ||
+      !selectedCard ||
+      player.currentNumberOfWorkers === 0
+    );
+  };
 
-  const onSelectToDiscard = (selectedCard: Card, limit: number) => {
+  // Handle location selection (not memoized - depends on G)
+  const onLocationSelect = (districtIndex: number, locationIndex: number) => {
+    if (player.hasPlayedCard) return;
 
-    let _cardSelection: Card[] = [];
-    
-    const selectedCardIds = cardSelectionModalOptions.cardsSelected?.map(c => c.id) ?? [];
+    const selectedLocation = G.districts[districtIndex].locations[locationIndex];
 
-    if (selectedCardIds && selectedCardIds.includes(selectedCard.id)) {
-      _cardSelection = [];
-    } else if (selectedCardIds.length < limit) {
-        _cardSelection = [...(cardSelectionModalOptions.cardsSelected ?? []), selectedCard];
+    // Find cost action that requires card selection (DISCARD or TRASH)
+    const cardSelectionAction = selectedLocation.cost.actions?.find(
+      a => a.actionId === LocationActionsEnum.DISCARD || a.actionId === LocationActionsEnum.TRASH
+    );
+
+    // Use the action orchestrator for DISCARD/TRASH actions
+    if (player.hand.length >= 2 && cardSelectionAction) {
+      actionOrchestrator.requestActionInput(cardSelectionAction.actionId, {
+        location: selectedLocation,
+        costAction: cardSelectionAction,
+        onComplete: (params: ActionParams) => {
+          moves.placeWorker(G, districtIndex, locationIndex, selectedCard, params);
+        },
+        onCancel: () => {
+          // User cancelled - do nothing
+        }
+      });
     } else {
-      _cardSelection = cardSelectionModalOptions.cardsSelected ?? []; 
+      // No card selection needed, place worker directly
+      if (!player.hasPlayedCard && selectedLocation.takenByPlayerID === undefined) {
+        moves.placeWorker(G, districtIndex, locationIndex, selectedCard);
+      }
     }
+  };
 
-    setCardSelectionModalOptions({
-      ...cardSelectionModalOptions,
-      cardsSelected: Array.from(new Set(_cardSelection))
+  // Handle leaving match
+  const onLeaveMatch = async () => {
+    leaveMatch(playerState).then(() => {
+      setPlayerState({
+        ...playerState,
+        matchID: "",
+        playerCredentials: ""
+      });
     });
-  }
-
-  const confirmCardSelection = () => {
-    if (cardSelectionModalOptions.cardsSelected && cardSelectionModalOptions.cardsSelected.length == cardSelectionModalOptions.selectionLimit) {
-      cardSelectionModalOptions.callback(cardSelectionModalOptions.cardsSelected!);
-      setCardSelectionModalOptions({...initialCardSelectionModalOptions});
-    }
-  }
-  
-  const cancelCardSelection = () => {
-      setCardSelectionModalOptions({...initialCardSelectionModalOptions});
-  }
+  };
 
-  const onLocationSelect = (districtIndex: number, locationIndex: number, e: any) => {
-
-    if (player.hasPlayedCard)
-      return;
-    const selectedCard = getSelectedCard();
-    const selectedLocation = G.districts[districtIndex].locations[locationIndex];
+  // Handle ending round
+  const onEndRound = () => {
+    moves.endRound();
+    setRoundIsEnding(true);
+  };
 
-    const move = selectedLocation.cost.moves?.find(m => m.moveId == LocationMovesEnum.DISCARD ||m.moveId == LocationMovesEnum.TRASH)
-
-    // Open card selection modal
-    if (player.hand.length >= 2 && move) {
-      setCardSelectionModalOptions({
-        actionName: move.moveId.toUpperCase(),
-        isOpen: true,
-        isRequired: true,
-        cardOptions: _.cloneDeep(player.hand.filter(c => c.id != selectedCard!.id)),
-        callback: (selectedCards: Card[]) => moves.placeWorker(G, districtIndex, locationIndex, G.players[ctx.currentPlayer]?.selectedCard, selectedCards),
-        selectionLimit: 2
-      })
-    } else {
-      !player.hasPlayedCard || selectedLocation.takenByPlayerID == undefined ? moves.placeWorker(G, districtIndex, locationIndex, G.players[ctx.currentPlayer]?.selectedCard) : null;
-    }   
-    
-    e.stopPropagation();
-    
+  // Don't render if no match
+  if (isNullOrEmpty(matchID)) {
+    return <div className="game-container" />;
   }
 
-  const isLocationDisabled = (location: Location): boolean => {
-    return (location.name.includes("Sword Master") && player.maxNumberOfWorkers >= 3) || location.isDisabled || !G.players[ctx.currentPlayer]?.selectedCard || player.currentNumberOfWorkers == 0;
+  // Don't render if game data not ready
+  if (!G.districts || !G.players || !player || !matchData) {
+    return <div className="game-container" />;
   }
 
-  const getSelectedCard = (): Card | undefined => {
-    return G.players[ctx.currentPlayer]?.selectedCard;
-  }
-
-  const [roundIsEnding, setRoundIsEnding] = useState(false);
-
-  const EndGameInfo = useMemo(() => {
-    if (ctx.phase == "endGamePhase")
-    return (
-      <Dialog.Root open={ctx.phase == "endGamePhase"}>
-        <Dialog.Content style={{
-          top: "230px",
-          width: "100%",
-          height: "100%"
-        }}>
-          <Table.Root size="1">
-            <Table.Header>
-              <Table.Row>
-                <Table.ColumnHeaderCell>#</Table.ColumnHeaderCell>
-                <Table.ColumnHeaderCell>Player</Table.ColumnHeaderCell>
-                <Table.ColumnHeaderCell>Victory Points</Table.ColumnHeaderCell>
-                <Table.ColumnHeaderCell>Candy</Table.ColumnHeaderCell>
-                <Table.ColumnHeaderCell>Loot</Table.ColumnHeaderCell>
-              </Table.Row>
-            </Table.Header>
-
-            <Table.Body>
-              {G.ranking.map((player, index) => (
-                <Table.Row>
-                  <Table.RowHeaderCell><span style={{ fontWeight: 600 }}>{index + 1}</span></Table.RowHeaderCell>
-                  <Table.Cell>
-                    <span style={{fontStyle: "italic", fontWeight: 600, color: PlayerColorsEnum[parseInt(player.id)]}}>
-                      {matchData.players[parseInt(player.id)].name}
-                    </span>
-                  </Table.Cell>
-                  <Table.Cell>
-                    {player.victoryPoints}
-                  </Table.Cell>
-                  <Table.Cell>
-                    {player.candy}
-                  </Table.Cell>
-                  <Table.Cell>
-                    {player.loot}
-                  </Table.Cell>
-                </Table.Row>
-              ))}
-              
-            </Table.Body>
-          </Table.Root>
-          <Button 
-            style={{ marginTop: "25px", width: "100%"}}
-            highContrast={true} 
-            color="red" 
-            size={"3"}
-            onClick={() => onLeaveMatch()}
-          >Go to Lobby </Button>
-        </Dialog.Content>
-      </Dialog.Root>
-    )
-  }, [ctx])
-
-return (
-  <div className='game-container'>
-    {!isNullOrEmpty(matchID) && (
-      <>
-        {G.districts && G.players && player && (
-          <div className="w-screen overflow-auto board-outer" ref={outerRef} style={{ ['--scale' as any]: scale }}>
-            <div className="board-viewport">
-              <GameInfoComponent
-                playersPublicInfo={G.playersViewModel}
-                G={G}
-                ctx={ctx}
-                onLeaveMatch={onLeaveMatch}
-              />
-
-              {/* Board Area */}
-              <div style={{
-                  width: BASE_W,
-                  height: BASE_H,
-                  backgroundImage: `url(${mapBg})`,
-                  backgroundSize: '100% 100%',
-                  imageRendering: 'crisp-edges',
-                }}
-                className="board-container relative mx-auto" 
-              >
-                {G.districts.map((district, dIndex) => (
-                  <div
-                    key={dIndex} 
-                    className="district-container absolute" 
-                    style={{top: district.y, left: district.x, width: "fit-content", height: "fit-content"}}>
-                      <div 
-                        className="district-name-container"
-                        style={{
-                          top: "-50px",
-                          position: "relative", 
-                          color: "black", 
-                          fontWeight: 600, 
-                          backgroundColor: "white",
-                          padding: "10px"
-                        }}
-                      >
-                        <div className="district-name">
-                          {district.id} - {district.name} |  {ctx.phase != "combatPhase" && district.presence ? G.playersViewModel
-                            .map(player => 
-                              <span
-                                key={player.id}
-                                style={{ 
-                                fontWeight: "600", 
-                                color: PlayerColorsEnum[parseInt(player.id)], 
-                                display: "inline"}}
-                              > 
-                                {district.presence[player.id]?.amount ?? " - "}
-                              </span>
-                            ) : 
-                              <span style={{ 
-                                  fontWeight: "600", 
-                                  display: "inline"
-                                }}> 
-                                  Winner:  
-                                  <span style={{
-                                    color: district.combatWinnerId ? PlayerColorsEnum[parseInt(district.combatWinnerId)] : "black"
-                                  }}> 
-                                    {" "}{district.combatWinnerId ? matchData.players[parseInt(district.combatWinnerId)].name :  " - "}
-                                  </span>
-                              </span>
-                          }
-                        </div>
-                      </div>
-                    
-                    {district.locations.map((location, locIndex) => (
-                      <div className="location-container" key={dIndex + "-" + locIndex}>
-                        <LocationComponent
-                          {...location}
-                          x={locsXPos[dIndex][locIndex]} y={locsYPos[dIndex][locIndex]}
-                          show={true}
-                          district={district}
-                          onClick={(e) => onLocationSelect(dIndex, locIndex, e)} 
-                          isDisabled={isLocationDisabled(location)}
-                          selectedCard={getSelectedCard()}
-                          player={player}
-                        />
-                      </div>)
-                    )}
-                    
-                  </div>
-                ))}
-                
-                {/* Player Area Component */}
-                <PlayerAreaComponent 
-                  G={G}
-                  playerView={G.playersViewModel}
-                  cancelCardSelection={cancelCardSelection}
-                  cardSelectionModalOptions={cardSelectionModalOptions}
-                  confirmCardSelection={confirmCardSelection}
-                  events={events}
-                  moves={moves}
-                  onSelectToDiscard={onSelectToDiscard}
-                  player={player}
-                  selectedCard={getSelectedCard()}
-                />
-                
-                {/* Combat Phase Modal */}
-                <Dialog.Root open={ctx.phase == "combatPhase"}>
-                  <Dialog.Content style={{
-                    top: "230px",
-                    width: "100%",
-                    height: "100%"
-                  }}>
-                    <Table.Root size="1">
-                      <Table.Header>
-                        <Table.Row>
-                          <Table.ColumnHeaderCell>District</Table.ColumnHeaderCell>
-                          <Table.ColumnHeaderCell>Winner</Table.ColumnHeaderCell>
-                          <Table.ColumnHeaderCell>Ranking</Table.ColumnHeaderCell>
-                        </Table.Row>
-                      </Table.Header>
-
-                      <Table.Body>
-                        {G.districts.map(d => (
-                          <Table.Row>
-                            <Table.RowHeaderCell><span style={{ fontWeight: 600 }}>{d.id} - {d.name}</span></Table.RowHeaderCell>
-                            <Table.Cell>
-                              <span style={{fontStyle: "italic", fontWeight: 600, color: PlayerColorsEnum[parseInt(d.combatWinnerId!)]}}>
-                                {d.combatWinnerId ? matchData.players[parseInt(d.combatWinnerId)].name :  " - "}
-                              </span>
-                            </Table.Cell>
-                            <Table.Cell>
-                              { Object.keys(d.presence)
-                                .map(k => d.presence[k])
-                                .sort((a, b) => b.amount - a.amount)
-                                .map((p, i, array) => 
-                                  <span style={{fontStyle: "italic", fontWeight: 600, color: PlayerColorsEnum[parseInt(p.playerID)]}}>{(p.amount ?? "") } {array.length != i + 1 &&<span style={{ color: "black"}}> / </span>}</span>
-                                )}
-                              </Table.Cell>
-                          </Table.Row>
-                        ))}
-                        
-                      </Table.Body>
-                    </Table.Root>
-                    <Button 
-                      style={{ marginTop: "25px", width: "100%"}}
-                      highContrast={true} 
-                      color="red" 
-                      size={"3"}
-                      disabled={roundIsEnding}
-                      onClick={() => { moves.endRound(); setRoundIsEnding(true) }}
-                    >{ roundIsEnding ? "Waiting for other players..." : "End Round"} </Button>
-                  </Dialog.Content>
-                </Dialog.Root>
-                {EndGameInfo}
-              </div>
-            </div>
+  return (
+    <div className="game-container">
+      <div
+        className="w-screen overflow-auto board-outer"
+        ref={outerRef}
+        style={getScaleStyle(scale)}
+      >
+        <div className="board-viewport">
+          {/* Game Info Header */}
+          <GameInfoComponent
+            playersPublicInfo={G.playersViewModel}
+            G={G}
+            ctx={ctx}
+            onLeaveMatch={onLeaveMatch}
+          />
+
+          {/* Board Area */}
+          <div
+            style={{
+              width: baseWidth,
+              height: baseHeight,
+              backgroundImage: `url(${mapBg})`,
+              backgroundSize: "100% 100%",
+              imageRendering: "crisp-edges",
+            }}
+            className="board-container relative mx-auto"
+          >
+            {/* Districts Layer */}
+            <BoardDistrictsLayer
+              districts={G.districts}
+              playersViewModel={G.playersViewModel}
+              phase={ctx.phase ?? ""}
+              matchData={matchData!}
+              player={player}
+              selectedCard={selectedCard}
+              onLocationSelect={onLocationSelect}
+              isLocationDisabled={isLocationDisabled}
+            />
+
+            {/* Action Orchestrator Renderer */}
+            <ActionOrchestratorRenderer
+              pendingRequest={actionOrchestrator.pendingRequest}
+              player={player}
+              excludeCardId={selectedCard?.id}
+            />
+
+            {/* Player Area */}
+            <PlayerAreaComponent
+              G={G}
+              playerView={G.playersViewModel}
+              events={events}
+              moves={moves}
+              player={player}
+              selectedCard={selectedCard}
+            />
+
+            {/* Combat Phase Dialog */}
+            <CombatPhaseDialog
+              open={ctx.phase === "combatPhase"}
+              districts={G.districts}
+              matchData={matchData!}
+              isRoundEnding={roundIsEnding}
+              onEndRound={onEndRound}
+            />
+
+            {/* End Game Dialog */}
+            <EndGameDialog
+              open={ctx.phase === "endGamePhase"}
+              ranking={G.ranking}
+              matchData={matchData!}
+              onLeaveMatch={onLeaveMatch}
+            />
           </div>
-        )}
-      </>
-    )}
-  </div>    
+        </div>
+      </div>
+    </div>
   );
-}
+};
diff --git a/client/src/components/board-component/UseBoardComponent.tsx b/client/src/components/board-component/UseBoardComponent.tsx
deleted file mode 100644
index a35da75..0000000
--- a/client/src/components/board-component/UseBoardComponent.tsx
+++ /dev/null
@@ -1,175 +0,0 @@
-
-import { District } from "@candyfight/shared/types";
-
-export const useBoardComponent = () => {
-    
-    const Hud = (props: {
-        onArrowUp?: () => void,
-        onSelectCard?: (card: number) => void,
-        onArrowDown?: () => void,
-        onPass?: () => void,
-        onReveal?: () => void,
-        selectedCardIndex: number | undefined,
-        children?: React.ReactNode
-    }) => {
-    return <>
-        <EventBox h={220} w={150} y={805} x={118} show={true} key="arrow-up" onClick={props.onArrowUp} />
-
-        {/* hand */}
-        {props.children}
-        
-        <EventBox h={220} w={150} y={790} x={1640} show={true} key="arrow-down" onClick={props.onArrowDown}  />
-
-        {/* <Button style y={455} x={970} show={true} key="btn-pass" onClick={props.onPass} /> */}
-
-        
-        {/* <Button  w={160} h={75} y={680} x={1630} show={true} key="btn-reveal" onClick={props.onReveal} /> */}
-        </>;
-    };
-
-    const Clickers = (props: {
-    x?: number, y?: number,
-    mirror?: boolean,
-    district?: District,
-    onLocationSelect: (districtIndex: number, locationIndex: number) => void;
-    }) => {
-    const bottomRowOffsetX = props.mirror ? 108 : 0;
-    const offsetY = 0;
-    const offsetX = 0;
-    return <div key={props.x + "-" + props.y} className="relative" style={{top: props.y ?? 0, left: props.x ?? 0, width: "fit-content", height: "fit-content"}}>
-        <ClickBox _onClick={() => props.onLocationSelect(0, 0)} x={54 + offsetX} y={0 + offsetY} show={true} />
-        <ClickBox _onClick={() => props.onLocationSelect(0, 1)} x={178 + offsetX} y={0 + offsetY} show={true} />
-        <ClickBox _onClick={() => props.onLocationSelect(0, 2)} x={0 + bottomRowOffsetX} y={67 + offsetY} show={true} />
-        <ClickBox _onClick={() => props.onLocationSelect(0, 3)} x={124 + bottomRowOffsetX} y={67 + offsetY} show={true} />
-    </div>;
-    }
-
-    const DebugBox = (props: {log?: string}) => {
-    return <div className="w-[calc(100%-1300px)] border-1 border-solid">
-        <h2>Debug</h2>
-        <code>{props.log ?? ""}</code>
-    </div>;
-    }
-
-    const ClickBox = (props: {
-        // w?: number,
-        // h?: number,
-        x: number,
-        y: number,
-        show?: boolean,
-        _onClick: () => void;
-        children?: React.ReactNode,
-        disabled?: boolean,
-    }) => {
-    return ( 
-        <EventBox 
-            key={props.x + "-" + props.y}
-            onClick={props._onClick} 
-            // w={props.w ?? 110} h={props.h ?? 55} 
-            // isSelected={props.isSelected}
-            disabled={props.disabled}
-            x={props.x} y={props.y}
-            show={props.show}
-        >
-            
-            {props.children}
-        
-        </EventBox>
-    );
-    }
-
-    const NumericTrackers = (props: {
-    x: number,
-    y: number,
-    }) => {
-    return <div key={props.x + "-" + props.y} className="relative" style={{top: props.y, left: props.x}}>
-        <NumericTracker x={0} y={0} show={true} />
-        <NumericTracker x={4} y={50} h={38} w={38} show={true} />
-        <NumericTracker x={4} y={49 + 1 * 38} h={38} w={38} show={true} />
-        <NumericTracker x={4} y={49 + 2 * 38} h={38} w={38} show={true} />
-    </div>;
-    };
-
-    const NumericTracker = (props: {
-    w?: number,
-    h?: number,
-    x: number,
-    y: number,
-    show?: boolean,
-    children?: React.ReactNode,
-    }) => {
-    return (
-        <EventBox {...props} w={props.w ?? 45} h={props.h ?? 45}>
-            {props.children}
-        </EventBox>
-    );
-    }
-
-    const VisualTracker = (props: {
-    w?: number,
-    h?: number,
-    x: number,
-    y: number,
-    show?: boolean,
-    }) => {
-    return <EventBox {...props} w={props.w ?? 175} h={props.h ?? 55} />;
-    }
-
-    const DynamicElement = (props: {
-    w?: number,
-    h?: number,
-    x: number,
-    y: number,
-    show?: boolean,
-    }) => {
-    return <div key={props.x + "-" + props.y} className="relative" style={{top: props.y, left: props.x}}>
-        <EventBox {...props} w={props.w ?? 20} h={props.h ?? 50} x={0} y={0} />
-        <EventBox {...props} w={props.w ?? 20} h={props.h ?? 50} x={(props.w ?? 20) - 1} y={0} />
-    </div>;
-    }
-
-    const Button = (props: {
-    w?: number,
-    h?: number,
-    x: number,
-    y: number,
-    show?: boolean,
-    onClick?: () => void,
-    }) => {
-    return <EventBox {...props} w={props.w ?? 105} h={props.h ?? 48} />
-    }
-
-    const EventBox = (props: {
-        w?: number,
-        h?: number,
-        x: number,
-        y: number,
-        show?: boolean,
-        isSelected?: boolean,
-        onClick?: () => void,
-        children?: React.ReactNode,
-        disabled?: boolean,
-        }) => {
-        return (
-            <div key={props.x + "-" + props.y} className={"event-box absolute" + (props.show ? " border-2 border-solid" : "") + (props.disabled ? " disabled" : "")}
-                style={{top: props.y, left: props.x, backgroundColor: props.isSelected  || props.disabled ? "RGB(75,0,130, 0.3)" : "none", width: props.w ?? "fit-content", height: props.h ?? "fit-content"}}
-                onClick={props.disabled ? () => {} : props.onClick}
-            >
-                {props.children}
-            </div>
-        );
-    }
-
-    return {
-        Hud,
-        Clickers,
-        DebugBox,
-        ClickBox,
-        NumericTrackers,
-        NumericTracker,
-        VisualTracker,
-        DynamicElement,
-        Button,
-        EventBox
-    }
-}
\ No newline at end of file
diff --git a/client/src/components/board-component/types.ts b/client/src/components/board-component/types.ts
deleted file mode 100644
index f8adb6b..0000000
--- a/client/src/components/board-component/types.ts
+++ /dev/null
@@ -1,9 +0,0 @@
-export type CardSelectionModalOptions = {
-    actionName: string;
-    isOpen: boolean;
-    cardOptions: Card[];
-    cardsSelected?: Card[];
-    isRequired: boolean;
-    callback: (selectedCards: Card[]) => void;
-    selectionLimit: number;
-  }
\ No newline at end of file
diff --git a/client/src/components/card-components/CardComponent.scss b/client/src/components/card-components/CardComponent.scss
deleted file mode 100644
index 3aa5fc7..0000000
--- a/client/src/components/card-components/CardComponent.scss
+++ /dev/null
@@ -1,92 +0,0 @@
-.card {
-    font-size: 12px;
-    overflow-wrap: break-word;
-    background-color: white;
-    height: 157px;
-    border: 2px solid black;
-
-    &:hover {
-        border: 2pt solid aqua;
-        // opacity: 0.5;
-    }
-
-
-    &.disabled {
-        opacity: 0.5;
-    }
-    
-    &.red {
-        border: 2pt solid red !important;
-    }
-    
-    &.selected {
-        border: 2pt solid aqua;
-
-        .card-name {
-            background-color: aqua;
-        }
-
-        .card-body {
-            .districts {
-                background-color: aqua;
-            }
-
-            .play {
-                background-color: rgb(99, 248, 248);
-            }
-            .play-effect{
-                border-bottom: 2pt solid rgb(99, 248, 248);
-
-            }
-            .reveal {
-                    background-color: rgb(190, 190, 190);
-                    color: grey;
-                    font-style: italic;
-            }
-            .reveal-effect {
-                color: rgb(193, 193, 193);
-                background-color: rgb(236, 236, 236);
-                font-style: italic;
-
-            }
-        }
-
-        
-    }
-    .card-name {
-        background-color: rgb(170, 184, 251);
-        height: 25px;
-        font-weight: 600;
-        text-align: center;
-        // padding-top: 1px
-
-    }
-
-    .card-body {
-        // padding-left: 5px;
-        max-height: 137px;
-
-        .districts {
-            background-color: rgb(170, 251, 202);
-        }
-        
-        .play {
-            background-color: rgb(207, 255, 226);
-        }
-        
-        .reveal {
-            background-color: rgb(255, 163, 163);
-        }
-        
-        .play-effect {
-                background-color: rgb(223, 248, 248);
-            border-bottom: 1px solid black;
-
-        }
-
-        .reveal-effect {
-            background-color: rgb(253, 245, 229);
-            border-bottom: 1px solid black;
-        }
-    }
-}
diff --git a/client/src/components/card-components/CardComponent.tsx b/client/src/components/card-components/CardComponent.tsx
index 1b30609..9464058 100644
--- a/client/src/components/card-components/CardComponent.tsx
+++ b/client/src/components/card-components/CardComponent.tsx
@@ -1,7 +1,6 @@
+import { memo, useMemo } from "react";
 import { Card } from "@candyfight/shared/types";
-import { useBoardComponent } from "../board-component/UseBoardComponent";
 import { DistrictIconComponent } from "../icon-components/DistrictIconComponent";
-import "./CardComponent.scss"
 
 export type CardComponentProps = {
     w?: number,
@@ -16,61 +15,91 @@ export type CardComponentProps = {
     selectionColor?: string;
     isDisabled?: boolean;
 }
-export const CardComponent = ({
+
+export const CardComponent = memo(({
     card,
     x,
     y,
-    children,
-    h, 
+    h,
     isSelected,
     onClick,
-    show,
     w,
     selectionColor,
     isDisabled,
 }: CardComponentProps) => {
+    // Memoize district icons
+    const districtIcons = useMemo(() =>
+        card?.districtIds?.map(did => <DistrictIconComponent key={did} districtId={did} />),
+        [card?.districtIds]
+    );
+
+    // Memoize primary effects text
+    const primaryEffectsText = useMemo(() =>
+        card?.primaryEffects?.map(e => e.name).join(", "),
+        [card?.primaryEffects]
+    );
+
+    // Memoize secondary effects text
+    const secondaryEffectsText = useMemo(() =>
+        card?.secondaryEffects?.map(e => e.name).join(", "),
+        [card?.secondaryEffects]
+    );
+
+    // Memoize class name computation
+    const cardClassName = useMemo(() => {
+        let className = "card";
+        if (isSelected) {
+            className += " selected";
+            if (selectionColor) className += ` ${selectionColor}`;
+        }
+        if (isDisabled) className += " disabled";
+        return className;
+    }, [isSelected, selectionColor, isDisabled]);
+
+    if (!card) return null;
 
-    const { EventBox } = useBoardComponent();
     return (
-        <EventBox 
-            x={x ?? 0}
-            y={y ?? 0}
-            key={x + "-" + y}
-            w={w ?? 105} 
-            h={h ?? 157} 
-            isSelected={isSelected}
+        <div
+            className={`absolute hover:bg-white/50 ${isSelected ? 'bg-indigo-900/30' : ''}`}
+            style={{
+                top: y ?? 0,
+                left: x ?? 0,
+                width: w ?? 105,
+                height: h ?? 157
+            }}
             onClick={onClick}
-        > 
-        {card != null && (
-            <div className={"card" + (isSelected ? " selected" + (selectionColor ? " " + selectionColor : "") : "" + (isDisabled ? " disabled" : ""))}>
+        >
+            <div className={cardClassName}>
                 <div className="card-name">
-                    <div>{card.districtIds.length > 0 ? card.districtIds
-                        .map(did => (<DistrictIconComponent key={did} districtId={did} />)) : <div className="non-location-title">{card.name}</div>}</div>
+                    <div>
+                        {card.districtIds?.length > 0
+                            ? districtIcons
+                            : <div className="non-location-title">{card.name}</div>
+                        }
+                    </div>
                 </div>
-            <hr></hr>
-            <div className="card-body">
-                {card?.districtIds.length > 0 && 
-                <div>
-                </div>
-                }
-                {card.primaryEffects != null &&
-                <div>
-                    <hr></hr>
-                    <div  className="play">Play</div>
-                    <hr></hr> 
-                    <div className="play-effect">{card?.primaryEffects?.name}</div>
-                </div>
-                }
-                {card?.secondaryEffects != null &&
-                <div>
-                    <hr></hr>
-                    <div className="reveal">Reveal</div>
-                    <hr></hr>
-                    <div className="reveal-effect">{card?.secondaryEffects.name}</div>
-                </div>
-                }
+                <hr />
+                <div className="card-body">
+                    {(card.primaryEffects?.length ?? 0) > 0 && (
+                        <div>
+                            <hr />
+                            <div className="play">Play</div>
+                            <hr />
+                            <div className="play-effect">{primaryEffectsText}</div>
+                        </div>
+                    )}
+                    {(card.secondaryEffects?.length ?? 0) > 0 && (
+                        <div>
+                            <hr />
+                            <div className="reveal">Reveal</div>
+                            <hr />
+                            <div className="reveal-effect">{secondaryEffectsText}</div>
+                        </div>
+                    )}
                 </div>
             </div>
-        )}
-        </EventBox>);
-    }
\ No newline at end of file
+        </div>
+    );
+});
+
+CardComponent.displayName = "CardComponent";
\ No newline at end of file
diff --git a/client/src/components/game-info-component/GameInfoComponent.scss b/client/src/components/game-info-component/GameInfoComponent.scss
deleted file mode 100644
index 96f6ad9..0000000
--- a/client/src/components/game-info-component/GameInfoComponent.scss
+++ /dev/null
@@ -1,3 +0,0 @@
-.content-text {
-    color: white;
-}
\ No newline at end of file
diff --git a/client/src/components/game-info-component/GameInfoComponent.tsx b/client/src/components/game-info-component/GameInfoComponent.tsx
index 7b09c87..eccfece 100644
--- a/client/src/components/game-info-component/GameInfoComponent.tsx
+++ b/client/src/components/game-info-component/GameInfoComponent.tsx
@@ -1,11 +1,21 @@
 import { useEffect, useRef, useState } from "react";
-import { useLobbyServices } from "../../services/lobbyServices";
 import { useAppStore } from "../../store";
-import { useQuery } from "@tanstack/react-query";
-import "./GameInfoComponent.scss"
 import { Ctx } from "boardgame.io";
-import _ from "lodash";
 import { GameState, PlayerViewModel } from "@candyfight/shared/types";
+import { useMatchQuery } from "../../hooks/useMatchQuery";
+
+/**
+ * Format phase name for display (replaces lodash kebabCase)
+ * Example: "mainPhase" -> "MAIN PHASE"
+ */
+function formatPhase(phase: string | null): string {
+    if (!phase) return "UNKNOWN";
+    // Convert camelCase to space-separated uppercase
+    return phase
+        .replace(/([A-Z])/g, " $1")
+        .trim()
+        .toUpperCase();
+}
 
 interface GameInfoComponentProps {
     ctx: Ctx;
@@ -28,33 +38,23 @@ export const GameInfoComponent = ({
     onLeaveMatch
 }: GameInfoComponentProps) => {
 
-    const { 
-        matchData, 
-        setMatchData,
-        playerState, 
-        setPlayerState 
-    } = useAppStore();
+    const { playerState } = useAppStore();
 
-    const { leaveMatch, getMatch } = useLobbyServices();
+    // Fetch match data with React Query
+    const { data: matchData, error: matchError } = useMatchQuery(playerState?.matchID);
 
     const [errorNotification, setErrorNotification] = useState("");
     const [chatMessage, setChatMessage] = useState("");
 
     const chatRef = useRef<HTMLDivElement | null>(null);
 
-    useQuery({
-        queryKey: ["fetch-match-data"], 
-        queryFn: () => getMatch(playerState.matchID)    
-        .then((match) => {
-            setMatchData(match);
-            return match;
-        },
-        (error) => {
-            setErrorNotification(error)
+    // Show error notification if match fetch fails
+    useEffect(() => {
+        if (matchError) {
+            const errorMessage = matchError instanceof Error ? matchError.message : String(matchError);
+            setErrorNotification(errorMessage);
         }
-        ),
-        enabled: playerState != null && playerState.matchID != ""}
-    );
+    }, [matchError]);
 
     // Chat auto-scroll
     useEffect(() => {
@@ -101,27 +101,27 @@ export const GameInfoComponent = ({
                 opacity: "0.7"
             }}
             >
-            <h2 style={{ textDecoration: "underline", fontSize: 10}}>Game | {matchData.setupData.name}</h2>
+            <h2 style={{ textDecoration: "underline", fontSize: 10}}>Game | {matchData?.setupData?.name ?? "Loading..."}</h2>
 
             <div className="message-list">
                 <div className="nes-text is-primary">
                     <p className="content-text">{playerState.name} | ID: {playerState.playerID}</p>
                 </div>
                 <div className="nes-text is-primary">
-                    <p><strong>PHASE: </strong><span className="content-text">{_.kebabCase(ctx.phase).replace("-", " ").toUpperCase()}</ span></p>
+                    <p><strong>PHASE: </strong><span className="content-text">{formatPhase(ctx.phase)}</span></p>
                 </div>
 
                 <div className="nes-text is-primary">
                     <strong>TURN</strong>
                 </div>
                 <ul className="nes-list is-circle" style={{ marginLeft: "1rem" }}>
-                
+
                 {playersPublicInfo.map((p: PlayerViewModel, index: number) => (
                     <li
                         key={index}
                         className={ctx.currentPlayer == p.id ? "nes-text is-success" : "nes-text"}
                     >
-                        {matchData.players[index].name} { p.hasRevealed ? "- REVEALED" : ""}
+                        {matchData?.players?.[index]?.name ?? `Player ${index + 1}`} { p.hasRevealed ? "- REVEALED" : ""}
                     </li>
                 ))}
                 </ul>
@@ -177,7 +177,7 @@ export const GameInfoComponent = ({
                             }}
                         >
                             <span className="nes-text is-info">
-                            {matchData.players[msj.sender].name}:
+                            {matchData?.players?.[msj.sender]?.name ?? `Player ${msj.sender}`}:
                             </span>{" "}
                             {msj.payload}
                         </p>
diff --git a/client/src/components/icon-components/WorkerComponent.scss b/client/src/components/icon-components/WorkerComponent.scss
deleted file mode 100644
index 6627127..0000000
--- a/client/src/components/icon-components/WorkerComponent.scss
+++ /dev/null
@@ -1,10 +0,0 @@
-.worker-container {
-    top: 530px;
-    left: 256px;
-    width: 16%;
-
-    .worker-image-container {
-        display: inline-block;
-        margin-right: 3px;
-    }
-}
\ No newline at end of file
diff --git a/client/src/components/icon-components/WorkerComponent.tsx b/client/src/components/icon-components/WorkerComponent.tsx
index d483d96..b377b43 100644
--- a/client/src/components/icon-components/WorkerComponent.tsx
+++ b/client/src/components/icon-components/WorkerComponent.tsx
@@ -1,5 +1,4 @@
 import { workerIconsByPlayerId } from "./constants";
-import "./WorkerComponent.scss";
 
 export interface WorkerComponentProps {
     mirror: number,
diff --git a/client/src/components/icon-components/constants.ts b/client/src/components/icon-components/constants.ts
index b4332af..2539b5b 100644
--- a/client/src/components/icon-components/constants.ts
+++ b/client/src/components/icon-components/constants.ts
@@ -16,7 +16,7 @@ import TRASH from "../../assets/board/C-trash.png";
 import DRAW from "../../assets/board/C-draw.png";
 
 import { Dictionary } from "@candyfight/shared/types";
-import { DistrictIconsEnum, LocationMovesEnum, ResourceEnum } from "@candyfight/shared/enums";
+import { DistrictIconsEnum, LocationActionsEnum, ResourceEnum } from "@candyfight/shared/enums";
 
 export const districtIconsDict: Dictionary<any> = {
     [DistrictIconsEnum.D1]: D1,
@@ -28,9 +28,9 @@ export const districtIconsDict: Dictionary<any> = {
 export const resourceIconsDict: Dictionary<any> = {
     [ResourceEnum.Candy]: CANDY,
     [ResourceEnum.Loot]: LOOT,
-    [LocationMovesEnum.DISCARD]: DISCARD,
-    [LocationMovesEnum.TRASH]: TRASH,
-    [LocationMovesEnum.DRAW]: DRAW,
+    [LocationActionsEnum.DISCARD]: DISCARD,
+    [LocationActionsEnum.TRASH]: TRASH,
+    [LocationActionsEnum.DRAW]: DRAW,
 }
 
 export const workerIconsByPlayerId = [redWorker, greenWorker, violetWorker, yellowWorker];
diff --git a/client/src/components/lobby-component/LobbyComponent.tsx b/client/src/components/lobby-component/LobbyComponent.tsx
index dcfd8fa..0e3c108 100644
--- a/client/src/components/lobby-component/LobbyComponent.tsx
+++ b/client/src/components/lobby-component/LobbyComponent.tsx
@@ -1,11 +1,10 @@
 import { useEffect, useState } from 'react';
-import { LobbyAPI } from 'boardgame.io';
 import { useAppStore } from '../../store';
 import { useLobbyStore } from './store';
 import { useLobbyServices } from '../../services/lobbyServices';
 import { BACKEND_URL } from '../../config';
 import { UpdateIcon } from "@radix-ui/react-icons"
-import { Button, Tooltip } from '@radix-ui/themes';
+import { Button } from '@radix-ui/themes';
 import { getRandomPlayerName } from '@candyfight/shared/services/moves/playerServices';
 import { generateBattleEvent } from './helper';
 
@@ -14,7 +13,6 @@ export const LobbyComponent = () => {
 
   const {
     createMatch,
-    getMatch,
     joinMatch,
     listMatches,
   } = useLobbyServices();
@@ -33,12 +31,15 @@ export const LobbyComponent = () => {
 
   const [numberOfPlayers, setNumberOfPlayers] = useState(2);
 
-  // Polling
+  // Polling - reduced from 500ms to 3000ms for better performance
   useEffect(() => {
+      // Initial fetch
+      listMatches().then((data) => setMatchList(data));
+
       const intervalId = setInterval(() => {
         listMatches()
           .then((data) => setMatchList(data))
-      }, 500);
+      }, 3000);
       return () => clearInterval(intervalId);
   }, []);
 
@@ -60,14 +61,12 @@ export const LobbyComponent = () => {
       }
     );
 
-    const match: LobbyAPI.Match = await getMatch(matchID);
-    useAppStore.getState().setMatchData(match);
-    
-    useAppStore.getState().setPlayerState({ 
-      ...useAppStore.getState().playerState, 
-      matchID, 
-      playerID, 
-      playerCredentials 
+    // Set player state - React Query will fetch match data automatically
+    useAppStore.getState().setPlayerState({
+      ...useAppStore.getState().playerState,
+      matchID,
+      playerID,
+      playerCredentials
     });
   }
 
diff --git a/client/src/components/location-component/LocationComponent.scss b/client/src/components/location-component/LocationComponent.scss
deleted file mode 100644
index 82d3bbc..0000000
--- a/client/src/components/location-component/LocationComponent.scss
+++ /dev/null
@@ -1,172 +0,0 @@
-.location-component-container {
-    width: calc(1280px / 12);
-    height: calc(720px / 12);
-    // background-color: white;
-    background-color: rgb(218, 218, 218);
-
-    font-size: 12px;
-
-    &.disabled {
-        opacity: 0.5;
-    }
-    
-
-    .worker-image-container {
-        width: 10px;
-        height: 10px;
-        position: relative;
-        top: -25px;
-        left: 11px;
-    }
-
-    .location-container {
-
-        max-height: 60px;
-
-        display: grid;
-
-
-        &.selected {
-            border: 1px solid aqua;
-        }
-
-        .location-cost-container {
-            // background-color: red;
-            // padding: 2px;
-            margin-right: 7px;
-            border-right: 1pt solid;
-            overflow-wrap: break-word;
-            height: 45px;
-            color: rgb(56, 69, 255);
-        }
-
-        .location-name-container {
-            width: 100%;
-            height: 13px;
-            background-color: violet;
-            font-size: 8pt;
-            font-weight: 600;
-            // padding-left: 15px;
-            text-align: centergit p;
-        }        
-
-        .location-icons-container {
-            width: 38px;
-            height: 20px;
-        }
-
-        .location-resource-cost-container {
-            width: 73px;
-            height: 50px;
-            padding-top: 2px;
-        }
-
-        .location-moves-cost-container {
-            padding-top: 10px;
-            padding-left: 2px;
-            text-align: center;
-            text-transform: uppercase;
-        }
-
-        .location-reward-container {
-            padding-top: 10px;
-            
-
-            hr {
-            color: rgb(255, 149, 0);
-            }
-            .reward-item {
-
-            }
-        }
-    }
-}
-
-.resource-container {
-    display: inline-block;
-}
-
-.reward-moves-container {
-    text-align: center;
-    color: rgb(255, 217, 0);
-    font-weight: 600;
-    // color: rgb(255, 213, 0);
-    text-shadow: -1px -1px 0 #000000, 1px -1px 0 #000, -1px 1px 0 #000, 2px 2px 0 #000;
-    .reward-move-item {
-        padding-top: 2px;
-        padding-bottom: 2px;
-    }
-}
-
-
-.candy {
-    height: 5px;
-    width: 12px;
-    background-color: red;
-    margin: 3px;
-    display: inline;
-    text-align: center;
-    color: yellow;
-    border: 1pt solid rgb(16, 28, 255);
-}
-
-.loot {
-    height: 5px;
-    width: 12px;
-    background-color: rgb(140, 140, 140);
-    margin: 3px;
-    display: inline;
-    text-align: center;
-    color: yellow;
-    border: 1pt solid aqua;
-}
-
-/* Glow intermitente para outlines sin mover el layout */
-.proto-glow {
-  position: relative; /* Necesario para posicionar ::after */
-  --glow-color: aqua;        /* celeste por defecto */
-  --glow-alpha: 0.7;            /* opacidad del halo */
-  --glow-size: 8px;             /* tamaño del halo */
-  --glow-border: 2px;           /* grosor del borde */
-  --glow-speed: 1.8s;           /* velocidad del pulso */
-}
-
-.proto-glow::after {
-  content: "";
-  position: absolute;
-  inset: calc(var(--glow-border) * -1);
-  pointer-events: none;
-  /* Borde visible + halo externo */
-  outline: var(--glow-border) solid var(--glow-color);
-  box-shadow:
-    0 0 var(--glow-size) calc(var(--glow-size) * 0.35)
-    color-mix(in oklab, var(--glow-color) var(--glow-alpha), transparent);
-  animation: proto-glow-pulse var(--glow-speed) ease-in-out infinite;
-  opacity: 0.85;
-  /* Para pantallas con muchos elementos, ayuda el rendimiento */
-  will-change: box-shadow, opacity;
-}
-
-/* Pulso leve */
-@keyframes proto-glow-pulse {
-  0%, 100% {
-    opacity: 0.65;
-    box-shadow:
-      0 0 calc(var(--glow-size) * 0.9) calc(var(--glow-size) * 0.25)
-      color-mix(in oklab, var(--glow-color) var(--glow-alpha), transparent);
-  }
-  50% {
-    opacity: 1;
-    box-shadow:
-      0 0 calc(var(--glow-size) * 1.2) calc(var(--glow-size) * 0.45)
-      color-mix(in oklab, var(--glow-color) 100%, transparent);
-  }
-}
-
-/* Respeta usuarios con reduced motion */
-@media (prefers-reduced-motion: reduce) {
-  .proto-glow::after {
-    animation: none;
-    opacity: 0.9;
-  }
-}
diff --git a/client/src/components/location-component/LocationComponent.tsx b/client/src/components/location-component/LocationComponent.tsx
index d274ec2..c9a4101 100644
--- a/client/src/components/location-component/LocationComponent.tsx
+++ b/client/src/components/location-component/LocationComponent.tsx
@@ -1,13 +1,11 @@
-import "./LocationComponent.scss";
+import { memo, useMemo } from "react";
 import { isNullOrEmpty } from "@candyfight/shared/common-methods";
 import { Card, District, Location, PlayerGameState } from "@candyfight/shared/types";
-import { useBoardComponent } from "../board-component/UseBoardComponent";
 import { ResourceComponent } from "../icon-components/ResourceComponent";
 import { DistrictIconComponent } from "../icon-components/DistrictIconComponent";
 import { workerIconsByPlayerId } from "../icon-components/constants";
-import { LocationMovesEnum } from "@candyfight/shared/enums";
+import { LocationActionsEnum } from "@candyfight/shared/enums";
 import { isWorkerPlacementValid } from "@candyfight/shared/game-helper";
-import { useAppStore } from "../../store";
 
 export interface LocationComponentProps extends Location {
     x: number,
@@ -15,13 +13,13 @@ export interface LocationComponentProps extends Location {
     district: District,
     show?: boolean,
     isSelected?: boolean;
-    onClick: (event: any) => void,
+    onClick: () => void,
     isDisabled: boolean;
     selectedCard?: Card;
     player: PlayerGameState;
 }
 
-export const LocationComponent = ({
+export const LocationComponent = memo(({
     x, y,
     district,
     show = true,
@@ -36,20 +34,65 @@ export const LocationComponent = ({
     player,
     isRestrictedArea
 }: LocationComponentProps) => {
+    const isClickDisabled = isDisabled || isRestrictedArea;
 
-    const { ClickBox } = useBoardComponent();
+    // Memoize whether this location shows the glow effect
+    const showGlow = useMemo(() =>
+        !isRestrictedArea && !isSelected && !isDisabled &&
+        isWorkerPlacementValid(player, { cost, reward } as Location, selectedCard ?? {} as Card),
+        [isRestrictedArea, isSelected, isDisabled, player, cost, reward, selectedCard]
+    );
+
+    // Memoize cost icons
+    const costIcons = useMemo(() =>
+        cost.districtIconIds.map(did =>
+            <DistrictIconComponent key={did} districtId={did} />
+        ),
+        [cost.districtIconIds]
+    );
+
+    // Memoize cost resources
+    const costResources = useMemo(() => (
+        <>
+            {cost.resources?.map((resource, index) =>
+                <ResourceComponent key={`res-${index}`} resourceId={resource.resourceId ?? ""} amount={resource.amount} />
+            )}
+            {cost.actions?.map((action, actionIndex) => {
+                if (action.actionId === LocationActionsEnum.DISCARD || action.actionId === LocationActionsEnum.TRASH) {
+                    return Array.from({ length: action.params?.selectionNumber }).map((_, i) =>
+                        <ResourceComponent key={`action-${actionIndex}-${i}`} resourceId={action.actionId ?? ""} />
+                    );
+                }
+                return null;
+            })}
+        </>
+    ), [cost.resources, cost.actions]);
 
-    const { playerState } = useAppStore();
+    // Memoize reward display
+    const rewardDisplay = useMemo(() => (
+        <>
+            {reward.resources?.map((resource, index) =>
+                <ResourceComponent key={`reward-${index}`} resourceId={resource.resourceId} amount={resource.amount}/>
+            )}
+            {reward?.actions?.map((action, index) => {
+                if (action.actionId === LocationActionsEnum.DISCARD || action.actionId === LocationActionsEnum.TRASH || action.actionId === LocationActionsEnum.DRAW) {
+                    return Array.from({ length: action.params?.selectionNumber }).map((_, i) =>
+                        <ResourceComponent key={`reward-action-${index}-${i}`} resourceId={action.actionId ?? ""} />
+                    );
+                }
+                return <span key={`action-${index}`}><hr /><div className="reward-action-item">{action.name}</div></span>;
+            })}
+        </>
+    ), [reward.resources, reward.actions]);
 
-    return ( 
-        <ClickBox 
-            _onClick={onClick}
-            disabled={isDisabled || isRestrictedArea}
-            x={x} y={y} 
-            show={true}>
+    return (
+        <div
+            className={`absolute border-2 border-solid ${isClickDisabled ? 'opacity-50 pointer-events-none bg-indigo-900/30' : 'hover:bg-white/50 cursor-pointer'}`}
+            style={{ top: y, left: x }}
+            onClick={isClickDisabled ? undefined : onClick}
+        >
             <div className="location-component-container">                
-                {/* <div className="location-container" style={{outline: !isSelected && !isDisabled && isWorkerPlacementValid(player, { cost, reward } as Location, selectedCard ?? {} as Card) ? "3px solid aqua" : "none"}}> */}
-                <div className={!isRestrictedArea && !isSelected && !isDisabled && isWorkerPlacementValid(player, { cost, reward } as Location, selectedCard ?? {} as Card) ? "location-container proto-glow" : "location-container"}>
+                <div className={showGlow ? "location-container proto-glow" : "location-container"}>
                     
                     {/* Name */}
                     <div className="location-name-container">{name}</div>
@@ -60,24 +103,11 @@ export const LocationComponent = ({
                             <div>
                                 {/* Location Icons Cost */}
                                 <div className="location-icons-container">
-                                    {cost.districtIconIds.map(did => 
-                                        <DistrictIconComponent key={did} districtId={did} />
-                                    )}
+                                    {costIcons}
                                 </div>
                                 {/* Location Resources Cost */}
                                 <div className="location-resource-cost-container">
-                                    <div>
-                                    {cost.resources?.map((resource, index) => 
-                                        <ResourceComponent key={index} resourceId={resource.resourceId ?? ""} amount={resource.amount} />
-                                    )}
-                                    {cost.moves?.map((move, index) => {
-                                       if (move.moveId == LocationMovesEnum.DISCARD || move.moveId == LocationMovesEnum.TRASH) {
-                                            return Array.from({ length: move.params?.selectionNumber }).map((_, index: number) => <ResourceComponent key={index} resourceId={move.moveId ?? ""} />)
-                                        } else {
-                                            return <></>
-                                        } 
-                                    })}
-                                    </div>
+                                    <div>{costResources}</div>
                                 </div>
                             </div>
                         </div>
@@ -86,19 +116,7 @@ export const LocationComponent = ({
                         <div className="location-reward-container col-span-3">
                             <div style={{overflowWrap: "break-word"}}>
                                 {/* Resources and Moves Reward */}
-                                <div className="">
-                                    {reward.resources?.map((resource, index) => 
-                                        <ResourceComponent key={index} resourceId={resource.resourceId} amount={resource.amount}/>
-                                    )}
-                                    {reward != undefined && reward.moves && reward.moves?.length > 0 ? 
-                                        reward.moves.map((move, index) => {
-                                            if (move.moveId == LocationMovesEnum.DISCARD || move.moveId == LocationMovesEnum.TRASH || move.moveId == LocationMovesEnum.DRAW) {
-                                                return Array.from({ length: move.params?.selectionNumber }).map((_, index: number) => <ResourceComponent key={index} resourceId={move.moveId ?? ""} />)
-                                            } else {
-                                                return <span key={index}><hr></hr><div className="reward-move-item" key={index}>{move.name}</div></ span>
-}                                        })
-                                        : <></>}
-                                </div>
+                                <div>{rewardDisplay}</div>
                             </div>
                         </div>
                     </div>
@@ -111,6 +129,8 @@ export const LocationComponent = ({
                     )}
                 </div>
             </div>
-        </ClickBox>
+        </div>
     );
-}
+});
+
+LocationComponent.displayName = "LocationComponent";
diff --git a/client/src/components/player-area-component/PlayerAreaComponent.scss b/client/src/components/player-area-component/PlayerAreaComponent.scss
deleted file mode 100644
index 717e210..0000000
--- a/client/src/components/player-area-component/PlayerAreaComponent.scss
+++ /dev/null
@@ -1,13 +0,0 @@
-.victory-points {
-    top: -39px;
-    position: relative;
-    left: 3px;
-    font-size: 15pt;
-    color: rgb(66, 1, 141);
-    text-shadow: -1px -1px 0 goldenrod, 1px -1px 0 goldenrod, -1px 1px 0 goldenrod, 2px 2px 0 goldenrod;
-    
-
-    &.enemy {
-        top: -8px
-    }
-}
\ No newline at end of file
diff --git a/client/src/components/player-area-component/PlayerAreaComponent.tsx b/client/src/components/player-area-component/PlayerAreaComponent.tsx
index dfd1fef..dbf1d2e 100644
--- a/client/src/components/player-area-component/PlayerAreaComponent.tsx
+++ b/client/src/components/player-area-component/PlayerAreaComponent.tsx
@@ -1,129 +1,150 @@
-import { Button, Dialog, Flex, Tooltip } from "@radix-ui/themes";
+import { memo, useMemo } from "react";
+import { Tooltip } from "@radix-ui/themes";
 import { Card, GameState, PlayerGameState, PlayerViewModel } from "@candyfight/shared/types"
-import { useBoardComponent } from "../board-component/UseBoardComponent";
 import { WorkerComponent } from "../icon-components/WorkerComponent"
 import { CardComponent } from "../card-components/CardComponent";
-import { CardSelectionModalOptions } from "../board-component/types";
-import "./PlayerAreaComponent.scss"
 
 export type PlayerAreaComponentProps = {
     G: GameState;
     player: PlayerGameState;
     events: any;
     moves: any;
-    cardSelectionModalOptions: CardSelectionModalOptions;
     selectedCard?: Card;
     playerView: PlayerViewModel[];
-    onSelectToDiscard: (selectedCard: Card, limit: number) => void;
-    confirmCardSelection: () => void;
-    cancelCardSelection: () => void;
 }
 
-export const PlayerAreaComponent = ({
+export const PlayerAreaComponent = memo(({
     G,
     player,
     events,
     moves,
-    cardSelectionModalOptions,
     selectedCard,
     playerView,
-    onSelectToDiscard,
-    confirmCardSelection,
-    cancelCardSelection,
 }: PlayerAreaComponentProps) => {
+    // Not using useCallback - G changes every render from boardgame.io
+    const onSelectCard = (card: Card) => {
+        moves.selectCard(G, card);
+    };
 
-    const { Hud } = useBoardComponent();
+    const onPass = () => {
+        if (G.playersViewModel.filter(p => !p.hasRevealed).length === 1) return null;
+        return events.endTurn();
+    };
 
-    const onSelectCard = (selectedCard: Card) => {
-        moves.selectCard(G, selectedCard)
-    }
-
-    const onPass = () => G.playersViewModel.filter(p => !p.hasRevealed).length == 1 ? null : events.endTurn();
-    
     const onReveal = () => moves.reveal();
-    
+
+    // Memoize tooltip content strings
+    const discardPileTooltip = useMemo(() =>
+        player.discardPile.length > 0 ? player.discardPile.map(t => t.name).join(" - ") : "Discard Pile",
+        [player.discardPile]
+    );
+
+    const trashPileTooltip = useMemo(() =>
+        player.trashPile.length > 0 ? player.trashPile.map(t => t.name).join(" - ") : "Trash Pile",
+        [player.trashPile]
+    );
+
+    // Memoize enemies list
+    const enemies = useMemo(() =>
+        playerView.filter(p => p.id !== player.id),
+        [playerView, player.id]
+    );
+
     return (<>
         <WorkerComponent
             numerOfWorkers={player.currentNumberOfWorkers}
             x={281} y={463}
             mirror={0}
             playerID={parseInt(player.id!)}
-            />  
-            <div className="player-resource-container absolute">
-                    <div className="victory-points">{player.victoryPoints}</div>
-                    <div>Candy<hr /><div>{player.candy}</div></div>
-                    <div>Loot<hr /><div>{player.loot}</div></div>        
-                    <div>Deck<hr /><div>{player.deck.length}</div></div>        
-                    <Tooltip content={player.discardPile.length > 0 ? player.discardPile.map(t => t.name).join(" - ") : "Discard Pile"}><div>Discard<hr /><div>{player.discardPile.length}</div></div></Tooltip>  
-                    <Tooltip content={player.trashPile.length > 0 ? player.trashPile.map(t => t.name).join(" - ") : "Trash Pile"}><div>Trash<hr /><div>{player.trashPile.length}</div></div></Tooltip>   
-                </div>            
-            {playerView.filter(p => p.id != player.id).map((enemy, seatIndex) => (
-                // if (player.id != player.id)
-                <div className="player-resource-container absolute" style={{
-                    top: seatIndex == 0 || seatIndex == 2 ? 90 : 0, left: seatIndex == 0 ? 968 : 260, fontSize: "7px"
-                }}>
-                    <div className="enemy victory-points">{player.victoryPoints}</div>
-                    <div>Candy<hr /><div>{player.candy}</div></div>
-                    <div>Loot<hr /><div>{player.loot}</div></div>        
-                    <div>Deck<hr /><div>{player.deck.length}</div></div>        
-                    <Tooltip content={player.discardPile.length > 0 ? player.discardPile.map(t => t.name).join(" - ") : "Discard Pile"}><div>Discard<hr /><div>{player.discardPile.length}</div></div></Tooltip>  
-                    <Tooltip content={player.trashPile.length > 0 ? player.trashPile.map(t => t.name).join(" - ") : "Trash Pile"}><div>Trash<hr /><div>{player.trashPile.length}</div></div></Tooltip>   
-                </div>
-            ))}
-    
-            <div className="hand-container" style={{
-            width: "200px", position: "relative", top: "-14px"
-            }}>
+        />
+
+        {/* Current Player Resources */}
+        <div className="player-resource-container absolute">
+            <div className="victory-points">{player.victoryPoints}</div>
+            <div>Candy<hr /><div>{player.candy}</div></div>
+            <div>Loot<hr /><div>{player.loot}</div></div>
+            <div>Deck<hr /><div>{player.deck.length}</div></div>
+            <Tooltip content={discardPileTooltip}>
+                <div>Discard<hr /><div>{player.discardPile.length}</div></div>
+            </Tooltip>
+            <Tooltip content={trashPileTooltip}>
+                <div>Trash<hr /><div>{player.trashPile.length}</div></div>
+            </Tooltip>
+        </div>
 
-            {!cardSelectionModalOptions.isOpen ? player.hand?.map((card: Card, index) => 
-                
-                // hand
+        {/* Enemy Player Resources */}
+        {enemies.map((enemy, seatIndex) => (
+            <EnemyResourceDisplay
+                key={`enemy-${enemy.id}`}
+                enemy={enemy}
+                seatIndex={seatIndex}
+            />
+        ))}
+
+        {/* Player Hand */}
+        <div className="hand-container" style={{
+            width: "200px", position: "relative", top: "-14px"
+        }}>
+            {player.hand?.map((card: Card, index) => (
                 <CardComponent
                     isDisabled={player.currentNumberOfWorkers == 0}
                     isSelected={card?.id == selectedCard?.id}
-                    y={540} x={390 + index*105} show={true} 
-                    key={`card-${card?.id}-${index}`} 
+                    y={540} x={390 + index * 105} show={true}
+                    key={`card-${card?.id}-${index}`}
                     onClick={() => onSelectCard(card)}
                     card={card}
-                >
-                </CardComponent>
-            ) :
-            (
-            // card selection for discard or trash
-            <Dialog.Root open={cardSelectionModalOptions.isOpen}>
-
-                <Dialog.Content height={"300px"} maxWidth={"1000px"}>
-                <Dialog.Title><Flex justify={"center"}>{cardSelectionModalOptions.actionName}</Flex></Dialog.Title>
-                <Flex>
-                    {cardSelectionModalOptions.cardOptions.map((card, index) => (
-                    <CardComponent
-                        isSelected={cardSelectionModalOptions.cardsSelected?.map(c => c.id).includes(card.id)}
-                        y={120} x={20 + index*105} show={true} 
-                        key={`select-card-${card.id}-${index }`} 
-                        onClick={() => onSelectToDiscard(card, cardSelectionModalOptions.selectionLimit)}
-                        card={card}
-                        selectionColor={"red"}
-                    >
-                    </CardComponent>
-                    ))}
-                </Flex>
-
-                <Flex gap="3" justify="center">
-                    <Dialog.Close>
-                    <Button variant="soft" color="gray" onClick={confirmCardSelection}>
-                        Confirm Selection
-                    </Button>
-                    </Dialog.Close>
-                    <Dialog.Close>
-                    <Button onClick={cancelCardSelection}>Cancel Selection</Button>
-                    </Dialog.Close>
-                </Flex>
-                </Dialog.Content>
-            </Dialog.Root>
-            )}  
-            </div>
-            <div className="pass-btn" onClick={onPass} />
-            <div className="reveal-btn" onClick={onReveal} />
-        </>
-    )
-}
\ No newline at end of file
+                />
+            ))}
+        </div>
+
+        {/* Action Buttons */}
+        <div className="pass-btn" onClick={onPass} />
+        <div className="reveal-btn" onClick={onReveal} />
+    </>);
+});
+
+PlayerAreaComponent.displayName = "PlayerAreaComponent";
+
+/**
+ * Memoized enemy resource display component
+ */
+interface EnemyResourceDisplayProps {
+    enemy: PlayerViewModel;
+    seatIndex: number;
+}
+
+const EnemyResourceDisplay = memo(({ enemy, seatIndex }: EnemyResourceDisplayProps) => {
+    const discardTooltip = useMemo(() =>
+        enemy.discardPile.length > 0 ? enemy.discardPile.map(t => t.name).join(" - ") : "Discard Pile",
+        [enemy.discardPile]
+    );
+
+    const trashTooltip = useMemo(() =>
+        enemy.trashPile.length > 0 ? enemy.trashPile.map(t => t.name).join(" - ") : "Trash Pile",
+        [enemy.trashPile]
+    );
+
+    return (
+        <div
+            className="player-resource-container absolute"
+            style={{
+                top: seatIndex === 0 || seatIndex === 2 ? 90 : 0,
+                left: seatIndex === 0 ? 968 : 260,
+                fontSize: "7px"
+            }}
+        >
+            <div className="enemy victory-points">{enemy.victoryPoints}</div>
+            <div>Candy<hr /><div>{enemy.candy}</div></div>
+            <div>Loot<hr /><div>{enemy.loot}</div></div>
+            <div>Deck<hr /><div>{enemy.deckLength}</div></div>
+            <Tooltip content={discardTooltip}>
+                <div>Discard<hr /><div>{enemy.discardPile.length}</div></div>
+            </Tooltip>
+            <Tooltip content={trashTooltip}>
+                <div>Trash<hr /><div>{enemy.trashPile.length}</div></div>
+            </Tooltip>
+        </div>
+    );
+});
+
+EnemyResourceDisplay.displayName = "EnemyResourceDisplay";
diff --git a/client/src/lib/LobbyProvider.tsx b/client/src/lib/LobbyProvider.tsx
index 69f09a3..808f739 100644
--- a/client/src/lib/LobbyProvider.tsx
+++ b/client/src/lib/LobbyProvider.tsx
@@ -9,17 +9,16 @@ const LobbyContext = createContext<LobbyCtx | null>(null);
 
 type Props = {
   serverUrl: string;
-  gameComponents: any[];
   children: React.ReactNode;
 };
 
-export function LobbyProvider({ serverUrl, gameComponents, children }: Props) {
+export function LobbyProvider({ serverUrl, children }: Props) {
 
   // useMemo evita recrear el cliente en cada render
   const value = useMemo(() => {
-    const lobby = new LobbyClient({ server: serverUrl, gameComponents: gameComponents });
+    const lobby = new LobbyClient({ server: serverUrl });
     return { lobby };
-  }, [serverUrl, gameComponents]);
+  }, [serverUrl]);
 
   return (
     <LobbyContext.Provider value={value}>
diff --git a/client/src/main.tsx b/client/src/main.tsx
index 204fd79..bc6ab36 100644
--- a/client/src/main.tsx
+++ b/client/src/main.tsx
@@ -1,24 +1,25 @@
 import React from "react";
 import { createRoot } from "react-dom/client";
-import App from "./App";
 import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
+import App from "./App";
 import { LobbyProvider } from "./lib/LobbyProvider";
-import { Game } from "@candyfight/shared/Game";
-import { BoardComponent } from "./components/board-component/BoardComponent";
 import { BACKEND_URL } from "./config";
 import { Theme } from "@radix-ui/themes";
-import "././styles.scss";
-
+import "./styles.scss";
 
-const queryClient = new QueryClient();
+const queryClient = new QueryClient({
+  defaultOptions: {
+    queries: {
+      staleTime: 1000 * 60, // 1 minute
+      refetchOnWindowFocus: false,
+    },
+  },
+});
 
 createRoot(document.getElementById("root")!).render(
   <React.StrictMode>
     <QueryClientProvider client={queryClient}>
-      <LobbyProvider
-        serverUrl={BACKEND_URL}
-        gameComponents={[{ game: Game, board: BoardComponent }]}
-      >
+      <LobbyProvider serverUrl={BACKEND_URL}>
         <Theme appearance="inherit" scaling="110%">
           <App />
         </Theme>
diff --git a/client/src/store.ts b/client/src/store.ts
index 5f12d1c..ac25549 100644
--- a/client/src/store.ts
+++ b/client/src/store.ts
@@ -1,15 +1,13 @@
 import { create } from "zustand";
 import { PlayerState } from "@candyfight/shared/types";
-import { LobbyAPI } from "boardgame.io";
 import { getRandomPlayerName } from "@candyfight/shared/services/moves/playerServices";
 
 type AppState = {
+  // Player state
   playerState: PlayerState;
   setPlayerState: (p: PlayerState) => void;
 
-  matchData: any;
-  setMatchData: (m: any) => void;
-
+  // Client instances
   client: any;
   setClient: (client: any) => void;
 
@@ -18,15 +16,14 @@ type AppState = {
 }
 
 export const useAppStore = create<AppState>((set) => ({
-  playerState: { name: getRandomPlayerName()} as PlayerState,
+  // Player state
+  playerState: { name: getRandomPlayerName() } as PlayerState,
   setPlayerState: (p) => set({ playerState: p }),
-  
-  matchData: {} as LobbyAPI.Match,
-  setMatchData: (m) => set({ matchData: m }),
 
+  // Client instances
   client: {},
   setClient: (client: any) => set({ client }),
 
   server: {},
-  setServer: (server: any) => set({ server })
+  setServer: (server: any) => set({ server }),
 }));
\ No newline at end of file
diff --git a/client/tsconfig.tsbuildinfo b/client/tsconfig.tsbuildinfo
index 4b35179..5e99e9e 100644
--- a/client/tsconfig.tsbuildinfo
+++ b/client/tsconfig.tsbuildinfo
@@ -1 +1 @@
-{"root":["./src/app.tsx","./src/main.tsx","./src/notifications.ts","./src/react-app-env.d.ts","./src/socket.ts","./src/store.ts","./src/types.ts","./src/vite-env.d.ts","./src/components/board-component/boardcomponent.tsx","./src/components/board-component/useboardcomponent.tsx","./src/components/lobby-component/lobbycomponent.tsx","./src/components/lobby-component/store.ts","./src/components/location-component/locationcomponent.tsx","./src/lib/client.ts"],"version":"5.9.3"}
\ No newline at end of file
+{"root":["./src/app.tsx","./src/config.ts","./src/main.tsx","./src/notifications.ts","./src/react-app-env.d.ts","./src/socket.ts","./src/store.ts","./src/vite-env.d.ts","./src/actions/action-orchestrator.tsx","./src/actions/index.ts","./src/actions/input-handlers.ts","./src/components/board-component/boardcomponent.tsx","./src/components/board-component/boarddistrictslayer.tsx","./src/components/board-component/constants.ts","./src/components/board-component/dialogs/combatphasedialog.tsx","./src/components/board-component/dialogs/endgamedialog.tsx","./src/components/board-component/dialogs/index.ts","./src/components/board-component/hooks/index.ts","./src/components/board-component/hooks/useboardscale.ts","./src/components/board-component/hooks/uselocationselection.ts","./src/components/card-components/cardcomponent.tsx","./src/components/game-info-component/gameinfocomponent.tsx","./src/components/icon-components/districticoncomponent.tsx","./src/components/icon-components/resourcecomponent.tsx","./src/components/icon-components/workercomponent.tsx","./src/components/icon-components/constants.ts","./src/components/input-handlers/cardselectionhandler.tsx","./src/components/lobby-component/lobbycomponent.tsx","./src/components/lobby-component/helper.ts","./src/components/lobby-component/store.ts","./src/components/location-component/locationcomponent.tsx","./src/components/player-area-component/playerareacomponent.tsx","./src/components/ui/gamedialog.tsx","./src/components/ui/gameicon.tsx","./src/components/ui/playerrankingtable.tsx","./src/components/ui/playerresourcedisplay.tsx","./src/components/ui/index.ts","./src/hooks/usematchquery.ts","./src/lib/lobbyprovider.tsx","./src/services/lobbyservices.ts"],"version":"5.9.3"}
\ No newline at end of file
diff --git a/package-lock.json b/package-lock.json
index 6ccaf94..d38830b 100644
--- a/package-lock.json
+++ b/package-lock.json
@@ -23,7 +23,7 @@
         "@radix-ui/react-icons": "^1.3.2",
         "@radix-ui/themes": "^3.2.1",
         "@tailwindcss/vite": "^4.1.14",
-        "@tanstack/react-query": "^5.90.5",
+        "@tanstack/react-query": "^5.90.16",
         "@vitejs/plugin-react": "^5.0.4",
         "boardgame.io": "^0.50.2",
         "lodash": "^4.17.21",
diff --git a/shared/Game.ts b/shared/Game.ts
index 3d364a1..3e73a04 100644
--- a/shared/Game.ts
+++ b/shared/Game.ts
@@ -1,29 +1,29 @@
-import { Ctx, DefaultPluginAPIs, Game as GameInterface, PlayerID} from "boardgame.io";
-import { ActivePlayers, INVALID_MOVE, PlayerView, Stage } from "boardgame.io/core";
-import { GAME_NAME, NO_CARD_SELECTED } from "./constants";
-import { BoardMove, GameState, Location, MetaGameState, PlayerGameState, PlayerViewModel } from "./types";
-import { 
-    calculateCombatWinner,
+import { Game as GameInterface } from "boardgame.io";
+import { INVALID_MOVE, Stage } from "boardgame.io/core";
+import { GAME_NAME } from "./constants";
+import { Card, GameState, MetaGameState } from "./types";
+import {
     districtsSetup,
-    getInitialPlayersState, 
-    getInitialPlayersViewModel, 
-    isPlayCardValid, 
-    isWorkerPlacementValid, 
-    playersSetup, 
+    getInitialPlayersState,
+    isWorkerPlacementValid,
+    playersSetup,
     resetEndPhaseTriggers
 } from "./game-helper";
-import { LocationMovesEnum } from "./enums";
-import { Card } from "./types";
 import { getMarketTierOneCards } from "./services/cardServices";
-import _, { get } from "lodash";
-
 import { getInitialDistrictsState } from "./services/locationServices";
-import { discard, draw, getLoot, selectCard } from "./services/moves/moves";
-import { checlInvalidMoves } from "./services/moves/moveValidations";
-import { executeMove, locationMoves } from "./services/moves/movesServices";
+import { draw, selectCard } from "./services/moves/moves";
+import { placeWorker } from "./services/moves/workerPlacementService";
+import {
+    calculateRanking,
+    dealHands,
+    discardAllHands,
+    resetTurnState,
+    resolveCombat,
+    revealPlayer
+} from "./services/moves/phaseService";
+import { playerView } from "./services/playerViewService";
 import { getCurrentLocation, getCurrentPlayer } from "./services/moves/helper";
 import { getPlayersList } from "./services/moves/playerServices";
-import { log } from "./common-methods";
 
 export const Game: GameInterface<GameState> = {
     
@@ -32,77 +32,37 @@ export const Game: GameInterface<GameState> = {
     minPlayers: 2,
     maxPlayers: 4,
     
-    setup: ({ ctx, ...plugins }, setupData) => ({
+    setup: ({ ctx, ...plugins }) => ({
         players: getInitialPlayersState(ctx.numPlayers, plugins),
-        playersViewModel: [] as PlayerViewModel[],
         districts: getInitialDistrictsState(),
-        cardMarket: plugins.random.Shuffle([
-            ...getMarketTierOneCards(),
-        ]),
+        cardMarket: plugins.random.Shuffle([...getMarketTierOneCards()]),
         roundEndingCounter: 0,
         gameEndingCounter: 0,
-        ranking: []
+        ranking: [],
+        playersViewModel: [], // Will be populated by playerView
     }),
 
-    playerView: PlayerView.STRIP_SECRETS,
+    playerView,
 
     phases: {
         maintenancePhase: {
             start: true,
             next: "mainPhase",
-            endIf: ({ G, }) => getPlayersList(G).every(player => player.hand.length == 5),
-            onBegin: ({ G, ctx, ...plugins }) => {
-                console.log("**  **");
-                log("MAINTENANCE", true);
+            endIf: ({ G }) => getPlayersList(G).every(player => player.hand.length === 5),
+            onBegin: ({ G, random }) => {
                 resetEndPhaseTriggers(G);
                 playersSetup(G);
                 districtsSetup(G);
-                log();
-                log("SET PLAYER PUBLIC INFO");
-
-                // cada accion que updatea player tiene que updatear playersViewModel a traves de una funcion que filtra propiedades de player
-                G.playersViewModel = getPlayersList(G).map<PlayerViewModel>(p => ({ 
-                    id: p.id,
-                    deckLength: p.deck.length,
-                    discardPile: p.discardPile,
-                    handLength: p.hand.length,
-                    hasRevealed: false,
-                    currentNumberOfWorkers: p.currentNumberOfWorkers,
-                    trashPile: p.trashPile,
-                    victoryPoints: p.victoryPoints,
-                    candy: p.candy,
-                    loot: p.loot,
-                 }))
-                log();
-                log("HAND DEAL");
-                log();
-                getPlayersList(G).forEach(player => { 
-                    log("player " + player.id + " hand: " + player.hand.length + " deck: " + player.deck.length + " discardPile: " + player.discardPile.length );
-                    draw(player, plugins.random, 5);
-                    log("player " + player.id + " hand: " + player.hand.length);
-                });
+                dealHands(G, random);
             }
         },
-        // Worker Placement & Reveal Phase
         mainPhase: {
             next: "combatPhase",
-            endIf: ({ G }) => Object.keys(G.players).every(key => G.players[key].hasRevealed),
-            onBegin: (context) => {
-                log("MAIN", true);
-            },
-            turn: {                
-                // play or reveal
+            endIf: ({ G }) => getPlayersList(G).every(p => p.hasRevealed),
+            turn: {
                 minMoves: 1,
-                onBegin: (mgState: MetaGameState) => {
-                    // reset player state
-                    const playerState = getCurrentPlayer(mgState);
-                    playerState.hasPlayedCard = false;
-                    playerState.selectedCard = NO_CARD_SELECTED;
-                    
-                },
-                onEnd: ({ G, ctx, events, random, ...plugins }) => {},                
-                // end if no workers left, stage?
-                endIf: (mgState) => getCurrentPlayer(mgState).hasRevealed
+                onBegin: (mgState: MetaGameState) => resetTurnState(getCurrentPlayer(mgState)),
+                endIf: (mgState: MetaGameState) => getCurrentPlayer(mgState).hasRevealed
             },
             moves: {
                 draw: {
@@ -119,126 +79,44 @@ export const Game: GameInterface<GameState> = {
                 },    
                 placeWorker: {
                     move: (
-                        mgState: MetaGameState, 
-                        gameState: GameState, 
-                        districtID: number, 
-                        locationID: number, 
-                        selectedCard: Card, 
+                        mgState: MetaGameState,
+                        gameState: GameState,
+                        districtID: number,
+                        locationID: number,
+                        selectedCard: Card,
                         moveParams: any
                     ) => {
-                        
-                        const currentLocation: Location = getCurrentLocation(mgState, districtID, locationID);
-                        const playerState = getCurrentPlayer(mgState);
+                        const location = getCurrentLocation(mgState, districtID, locationID);
+                        const player = getCurrentPlayer(mgState);
 
-                        if (!isWorkerPlacementValid(playerState, currentLocation, selectedCard))
+                        if (!isWorkerPlacementValid(player, location, selectedCard)) {
                             return INVALID_MOVE;
-
-                        if (currentLocation.cost?.moves && currentLocation.cost.moves.length > 0) {
-                            checlInvalidMoves(mgState, currentLocation.cost.moves);
                         }
 
-                        // play card
-                        const playedCard = discard(playerState, [selectedCard]);
-                        
-                        // playerState.discardPile.push(playedCard[0] as Card);
-                        
-                        if (selectedCard.primaryEffects)
-                            executeMove(mgState, {...selectedCard.primaryEffects!, params: { ...selectedCard.primaryEffects.params }, location: currentLocation });
-                    
-                        // update resources
-                        playerState.currentNumberOfWorkers -= 1;
-                        playerState.hasPlayedCard = true;
-                        playerState.cardsInPlay?.push(selectedCard);
-                        
-                        currentLocation.cost.resources?.forEach(res => {
-                            playerState[res.resourceId] -= res.amount;
-                        })
-
-                        currentLocation.cost.moves?.map(move => {
-                            locationMoves[move.moveId]({ mgState, playerState, move: {...move, params: [...moveParams]}});
-                        });
-
-                        currentLocation.reward.resources?.forEach(res => {
-                            playerState[res.resourceId] += res.amount;
-                        });
-
-                        currentLocation.reward.moves?.forEach(move => {
-                            locationMoves[move.moveId]({ mgState, playerState, move, location: currentLocation });
-                        })
-
-                        // update district & location
-                        currentLocation.isDisabled = true;
-                        currentLocation.isSelected = true;
-                        currentLocation.takenByPlayerID = mgState.ctx.currentPlayer;
-                        mgState.G.districts.forEach(d => {
-                            if (d.id == currentLocation.districtId)
-                                d.presence[playerState.id] = {
-                                    playerID: playerState.id,
-                                    amount: d.presence && d.presence[playerState.id] ? d.presence[playerState.id].amount + 1 : 1
-                                };
-                            
-                        });
+                        placeWorker({ mgState, player, location, card: selectedCard, moveParams });
                     },
                     undoable: true
                 },
                 reveal: {
-                    move: (mgState) => { 
-                        const player = getCurrentPlayer(mgState);
-                        mgState.G.playersViewModel[parseInt(player.id)].hasRevealed = player.hasRevealed = true 
-                    } 
+                    move: (mgState: MetaGameState) => revealPlayer(getCurrentPlayer(mgState))
                 }
-            },
-            onEnd: (context) => {
-            },
+            }
         },
         combatPhase: {
             next: ({ G }) => getPlayersList(G).some(p => p.victoryPoints >= 6) ? "endGamePhase" : "maintenancePhase",
-            turn: {
-                activePlayers: { all: Stage.NULL },  
-            },
+            turn: { activePlayers: { all: Stage.NULL } },
             moves: {
-                endRound: {
-                    move: ({ G }) => {G.roundEndingCounter += 1}
-                }
+                endRound: { move: ({ G }) => { G.roundEndingCounter += 1; } }
             },
-            onBegin: ({ G, events }) => {
-                log("COMBAT PHASE", true);
-                G.districts.forEach(d => {
-                    d.combatWinnerId = calculateCombatWinner(d);
-                    if (d.combatWinnerId) {
-                        G.players[d.combatWinnerId].victoryPoints += 1;
-                    }
-                })
-            },
-            onEnd: ({ G, events }) => {
-                getPlayersList(G).forEach(p => {
-                    p.discardPile = [...p.discardPile, ...p.hand.map(c => c)];
-                    p.hand = [];
-                });
-            },
-            endIf: (mgState) => mgState.G.roundEndingCounter >= mgState.ctx.numPlayers
+            onBegin: ({ G }) => resolveCombat(G),
+            onEnd: ({ G }) => discardAllHands(G),
+            endIf: ({ G, ctx }) => G.roundEndingCounter >= ctx.numPlayers
         },
         endGamePhase: {
-            onBegin: ({ G }) => {
-                
-                // calculate players ranking
-                G.ranking = getPlayersList(G).sort((a, b) => {
-                    return (
-                        (b.victoryPoints - a.victoryPoints) == 0 ? 
-                        (b.candy - a.candy) == 0 ? 
-                        (b.loot - a.loot)
-                        : (b.victoryPoints - a.victoryPoints) 
-                        : (b.candy - a.candy)
-                    );
-                });
-            },
-            turn: {
-                activePlayers: { all: Stage.NULL }
-            },
+            onBegin: ({ G }) => calculateRanking(G),
+            turn: { activePlayers: { all: Stage.NULL } },
             moves: {
-                goToLobby: {
-                    move: ({ G }) => {G.gameEndingCounter += 1}
-                }
+                goToLobby: { move: ({ G }) => { G.gameEndingCounter += 1; } }
             },
             onEnd: ({ events }) => events.endGame()
         }
diff --git a/shared/enums.ts b/shared/enums.ts
index c4af297..b8bba57 100644
--- a/shared/enums.ts
+++ b/shared/enums.ts
@@ -10,10 +10,11 @@ export enum ResourceEnum {
     Loot = "loot",
 }
 
-export enum LocationMovesEnum {
+export enum LocationActionsEnum {
     DRAW = "draw",
-    ADD_PRESENCE_TOKEN ="addPresenceToken",
+    ADD_PRESENCE_TOKEN = "addPresenceToken",
     GET_LOOT = "getLoot",
+    GET_CANDY = "getCandy",
     STRANGE_CANDY_PUZZLE = "strangeCandyPuzzle",
     COOLDOWN = "coolDown",
     SIGNET_TRIGGER = "signetTrigger",
@@ -27,6 +28,11 @@ export enum LocationMovesEnum {
     DEAL = "deal",
 }
 
+export enum RequirementType {
+    CARDS_IN_HAND = "cardsInHand",
+    RESOURCE = "resource",
+}
+
 export enum PlayerColorsEnum {
     "red" = 0,
     "green" = 1,
diff --git a/shared/game-helper.ts b/shared/game-helper.ts
index 7cda4bf..28866bb 100644
--- a/shared/game-helper.ts
+++ b/shared/game-helper.ts
@@ -8,6 +8,7 @@ import _ from "lodash";
 import { DefaultPluginAPIs } from "boardgame.io";
 import { getInitialLocationReward } from "./services/locationServices";
 import { getPlayersList } from "./services/moves/playerServices";
+import { canPayLocationCosts } from "./services/actions/requirements";
 
 export const getInitialLocationsState = (districtName: string, districtId: string, names: string[]): Location[] => names.map<Location>((name, locIndex) => ({
     Id: districtName + "-" + locIndex.toString(),
@@ -64,11 +65,11 @@ export const isPlayCardValid = (playerState: PlayerGameState, selectedCardId: st
 
 export const isWorkerPlacementValid = (playerState: PlayerGameState, currentLocation: Location, cardInPlay: Card): boolean => {
     return (
-        !playerState.hasPlayedCard && playerState.currentNumberOfWorkers > 0 && 
-        isNullOrEmpty(currentLocation.takenByPlayerID)
-        && currentLocation.cost.districtIconIds.every(lid => cardInPlay!.districtIds.includes(lid))
-        && (
-            currentLocation.cost.resources ? currentLocation.cost.resources.every(resource => playerState[resource.resourceId] >= resource.amount) : true)
+        !playerState.hasPlayedCard &&
+        playerState.currentNumberOfWorkers > 0 &&
+        isNullOrEmpty(currentLocation.takenByPlayerID) &&
+        currentLocation.cost.districtIconIds.every(lid => cardInPlay.districtIds.includes(lid)) &&
+        canPayLocationCosts(playerState, currentLocation, cardInPlay)
     );
 }
 
diff --git a/shared/services/cardServices.ts b/shared/services/cardServices.ts
index dbeb33a..0cd00d4 100644
--- a/shared/services/cardServices.ts
+++ b/shared/services/cardServices.ts
@@ -1,7 +1,8 @@
 import { Card } from "../types";
-import { DistrictIconsEnum, LocationMovesEnum } from "../enums";
+import { DistrictIconsEnum } from "../enums";
 import { getEnumStringKeys } from "../common-methods";
 import _ from "lodash";
+import { resources, actions } from "../actions/effect-factories";
 
 export const getInitialDeck = (): Card[] => {
     return [
@@ -15,42 +16,24 @@ export const getInitialDeck = (): Card[] => {
 
 export const getTierOneCards = () => {
     return Object.values(DistrictIconsEnum).map<Card>(
-        (districtId) => {
-            return {
+        (districtId) => ({
             ...getDistrictCard([districtId]),
-            primaryEffects: 
-                {
-                    moveId: LocationMovesEnum.ADD_PRESENCE_TOKEN,
-                    name: "FIGHT!"
-                }
-            }
-        }
+            primaryEffects: [actions.addPresence()]
+        })
     );
 }
 
 export const getTierTwoCards = (): Card[] => {
-
     return [
         {
             ...getDistrictCard([DistrictIconsEnum.D1, DistrictIconsEnum.D3]),
-            secondaryEffects:
-                {
-                    moveId: LocationMovesEnum.ADD_REPAIR_TOKEN,
-                    name: "REPAIR"
-                }
-            ,
+            secondaryEffects: [actions.addRepairToken()],
         },
         {
             ...getDistrictCard([DistrictIconsEnum.D2, DistrictIconsEnum.D4]),
-            secondaryEffects:
-                {
-                    moveId: LocationMovesEnum.ADD_REPAIR_TOKEN,
-                    name: "REPAIR"
-                }
-            ,
+            secondaryEffects: [actions.addRepairToken()],
         },
         ...getMiscelanousDeck()
-
     ];
 }
 
@@ -72,50 +55,28 @@ export const getMarketTierOneCards = () => {
 }
 
 const getMiscelanousDeck = (): Card[] => {
+    const allDistricts = [DistrictIconsEnum.D1, DistrictIconsEnum.D2, DistrictIconsEnum.D3, DistrictIconsEnum.D4];
+
     return [
         {
             id: "MISC-1",
             name: "Strange Candy",
-            districtIds: [DistrictIconsEnum.D1, DistrictIconsEnum.D2, DistrictIconsEnum.D3, DistrictIconsEnum.D4
-            ],
-            primaryEffects: 
-                {
-                    moveId: LocationMovesEnum.GET_LOOT,
-                    name: "GET LOOT"
-                }
-            ,
-            secondaryEffects:
-                {
-                    moveId: LocationMovesEnum.STRANGE_CANDY_PUZZLE,
-                    name: "Stg. Candy Puzzle"
-                }
+            districtIds: allDistricts,
+            primaryResources: [resources.loot(1)],
+            secondaryEffects: [actions.strangeCandyPuzzle()]
         },
         {
             id: "MISC-2",
             name: "Cooldown",
             districtIds: [],
-            secondaryEffects: 
-                {
-                    moveId: LocationMovesEnum.COOLDOWN,
-                    name: "COOLDOWN"
-                }            
+            secondaryEffects: [actions.cooldown()]
         },
         {
             id: "MISC-3",
             name: "Strange Candy",
-            districtIds: [DistrictIconsEnum.D1, DistrictIconsEnum.D2, DistrictIconsEnum.D3, DistrictIconsEnum.D4],
-            primaryEffects: 
-                {
-                    moveId: LocationMovesEnum.GET_LOOT,
-                    name: "GET LOOT"
-                }
-            ,
-            secondaryEffects: 
-                {
-                    moveId: LocationMovesEnum.STRANGE_CANDY_PUZZLE,
-                    name: "Stg. Candy Puzzle"
-                }
-            
+            districtIds: allDistricts,
+            primaryResources: [resources.loot(1)],
+            secondaryEffects: [actions.strangeCandyPuzzle()]
         }
     ];
 }
@@ -130,7 +91,7 @@ export const getDistrictCard = (districtIds: string[]): Card => {
     }
 }
 
-export const getSignetCard = () => ({
+export const getSignetCard = (): Card => ({
     id: "signet",
     name: "Signet",
     districtIds: [
@@ -139,6 +100,6 @@ export const getSignetCard = () => ({
         DistrictIconsEnum.D3,
         DistrictIconsEnum.D4,
     ],
-    primaryEffect: [LocationMovesEnum.SIGNET_TRIGGER]
+    primaryEffects: [actions.signetTrigger()]
 });
 
diff --git a/shared/services/locationServices.ts b/shared/services/locationServices.ts
index 2b9ad73..2cd19dd 100644
--- a/shared/services/locationServices.ts
+++ b/shared/services/locationServices.ts
@@ -1,5 +1,6 @@
-import { DistrictIconsEnum, LocationMovesEnum, ResourceEnum } from "../enums";
+import { DistrictIconsEnum, LocationActionsEnum, ResourceEnum } from "../enums";
 import { District, Location, LocationReward } from "../types";
+import { discardCost, trashCost } from "./actions/requirements";
 
 
 export const getInitialLocationReward = (): LocationReward => ({
@@ -7,7 +8,7 @@ export const getInitialLocationReward = (): LocationReward => ({
         // {resourceId: ResourceEnum.Candy, amount: 1},
         // {resourceId: ResourceEnum.Loot, amount: 1},
     ],
-    moves: [{ moveId: LocationMovesEnum.DRAW, name: "draw", params: { selectionNumber: 2 }}]
+    actions: [{ actionId: LocationActionsEnum.DRAW, name: "draw", params: { selectionNumber: 2 }}]
 });
 
 export const getHighCouncil = (district: DistrictIconsEnum, locIndex: number): Location => ({
@@ -16,16 +17,16 @@ export const getHighCouncil = (district: DistrictIconsEnum, locIndex: number): L
     name: district.toString() + " - High Council",
     cost: {
         districtIconIds: [district],
-        moves: [{ moveId: LocationMovesEnum.DISCARD, name: "discard 2", params: {cardIds: [], selectionNumber: 2}}]
+        actions: [discardCost(2)]
     },
     reward: {
-        moves: [
+        actions: [
             {
-                moveId: LocationMovesEnum.ADVANCE_TRACKER,
+                actionId: LocationActionsEnum.ADVANCE_TRACKER,
                 name: "+Tracker"
             },
             {
-                moveId: LocationMovesEnum.ADD_PRESENCE_TOKEN,
+                actionId: LocationActionsEnum.ADD_PRESENCE_TOKEN,
                 name: "FIGHT!"
             }
         ],
@@ -48,7 +49,7 @@ export const getInitialDistrictsState = (): District[] => {
                 cost: {
                     districtIconIds: [DistrictIconsEnum.D1],
                 },
-                reward: {moves: [], resources: []},
+                reward: {actions: [], resources: []},
                 dominanceBy: [],
                 isRestrictedArea: true,
             },
@@ -58,10 +59,10 @@ export const getInitialDistrictsState = (): District[] => {
                 name: "CONURBA Market",
                 cost: {
                     districtIconIds: [DistrictIconsEnum.D1],
-                    moves: [{ moveId: LocationMovesEnum.TRASH, name: "trash", params: {cardIds: [], selectionNumber: 2}}]
+                    actions: [trashCost(2)]
                 },
                 reward: {
-                    moves: [{moveId: LocationMovesEnum.BUY_CARD, name: "buy card"}]
+                    actions: [{actionId: LocationActionsEnum.BUY_CARD, name: "buy card"}]
                 }
             },
             {...getHighCouncil(DistrictIconsEnum.D1, 2)},
@@ -71,7 +72,7 @@ export const getInitialDistrictsState = (): District[] => {
                 name: "Time for Candy",
                 cost: {
                     districtIconIds: [DistrictIconsEnum.D1],
-                    moves: [{ moveId: LocationMovesEnum.DISCARD, name: "discard 2", params: {cardIds: [], selectionNumber: 2}}]
+                    actions: [discardCost(2)]
                 },
                 reward: {
                     resources: [{resourceId: ResourceEnum.Candy, amount: 1}]
@@ -92,9 +93,10 @@ export const getInitialDistrictsState = (): District[] => {
                 name: "ECO Market",
                 cost: {
                     districtIconIds: [DistrictIconsEnum.D2],
-                    moves: [{moveId: LocationMovesEnum.TRASH, name: "trash", params: { cardIds: [], selectionNumber: 2 }}, {moveId: LocationMovesEnum.BUY_CARD, name: "buy card"}]
+                    actions: [trashCost(2)]
                 },
                 reward: {
+                    actions: [{actionId: LocationActionsEnum.BUY_CARD, name: "buy card"}]
                 }
             },
             {
@@ -103,7 +105,7 @@ export const getInitialDistrictsState = (): District[] => {
                 name: "Momentum",
                 cost: {
                     districtIconIds: [DistrictIconsEnum.D2],
-                    moves: [{ moveId: LocationMovesEnum.TRASH, name: "trash 2", params: {cardIds: [], selectionNumber: 2}}]
+                    actions: [trashCost(2)]
                 },
                 reward: {
                 }
@@ -116,7 +118,7 @@ export const getInitialDistrictsState = (): District[] => {
                     districtIconIds: [DistrictIconsEnum.D2],
                 },
                 reward: {
-                    moves: [{ moveId: LocationMovesEnum.DEAL, name: "deal"}]
+                    actions: [{ actionId: LocationActionsEnum.DEAL, name: "deal"}]
                 },
                 dominanceBy: [],
                 isRestrictedArea: true
@@ -153,7 +155,7 @@ export const getInitialDistrictsState = (): District[] => {
                     name: "Bargain",
                     cost: {
                         districtIconIds: [DistrictIconsEnum.D3],
-                        moves: [{ moveId: LocationMovesEnum.TRASH, name: "trash", params: {cardIds: [], selectionNumber: 2}}]
+                        actions: [trashCost(2)]
                     },
                     reward: {
                         resources: [
@@ -201,7 +203,7 @@ export const getInitialDistrictsState = (): District[] => {
                     ],
                 },
                 reward: {
-                    moves: [{moveId: LocationMovesEnum.DRAW, name: "draw", params: {selectionNumber: 2}}]
+                    actions: [{actionId: LocationActionsEnum.DRAW, name: "draw", params: {selectionNumber: 2}}]
                 }
             },
             {
@@ -218,7 +220,7 @@ export const getInitialDistrictsState = (): District[] => {
                     ],
                 },
                 reward: {
-                    moves: [{moveId: LocationMovesEnum.GET_SWORD_MASTER, name: "Sword Master"}]
+                    actions: [{actionId: LocationActionsEnum.GET_SWORD_MASTER, name: "Sword Master"}]
                 }
             },
             {
diff --git a/shared/services/moves/moveValidations.ts b/shared/services/moves/moveValidations.ts
index fe4563c..e9a625b 100644
--- a/shared/services/moves/moveValidations.ts
+++ b/shared/services/moves/moveValidations.ts
@@ -1,12 +1,13 @@
-
 import _ from "lodash";
-import { BoardMove, MetaGameState } from "../../types";
-import { executeMove } from "./movesServices";
+import { RewardAction, MetaGameState } from "../../types";
+import { actionRegistry } from "../../actions";
+import { getCurrentPlayer } from "./helper";
 
-export const checlInvalidMoves = (mgState: MetaGameState ,moves: BoardMove[]) => {
+export const checkInvalidActions = (mgState: MetaGameState, actions: RewardAction[]) => {
     const clonedState = _.cloneDeep(mgState);
-    for (let i = 0; i <= moves.length, i++;) {
-        const clonedMove = _.cloneDeep(moves[i]);
-        executeMove(clonedState, clonedMove)
+    const player = getCurrentPlayer(clonedState);
+    for (let i = 0; i <= actions.length, i++;) {
+        const clonedAction = _.cloneDeep(actions[i]);
+        actionRegistry.execute(clonedAction.actionId, clonedAction.params ?? {}, clonedState, player, { location: clonedAction.location });
     }
 }
\ No newline at end of file
diff --git a/shared/services/moves/moves.ts b/shared/services/moves/moves.ts
index 02b3cc2..ed0564e 100644
--- a/shared/services/moves/moves.ts
+++ b/shared/services/moves/moves.ts
@@ -33,9 +33,7 @@ export const draw = (player: PlayerGameState, random: any, numberOfCards?: numbe
     
 }
 
-export const getLoot = (player: PlayerGameState) => {
-    player.loot = player.loot + 1;
-}
+// NOTE: getLoot removed - use resources[] array instead (see types.ts)
 
 export const discard = (player: PlayerGameState, cards: Card[]): Card[] | string => {
     
diff --git a/shared/services/moves/movesServices.ts b/shared/services/moves/movesServices.ts
deleted file mode 100644
index bf7aae5..0000000
--- a/shared/services/moves/movesServices.ts
+++ /dev/null
@@ -1,62 +0,0 @@
-import { LocationMovesEnum } from "../../enums"
-import { BoardMove, MetaGameState, PlayerPresence } from "../../types"
-import { discard, draw, getLoot, trash } from "./moves"
-import { getCurrentPlayer } from "./helper"
-import { MoveFunction, MoveFunctionArgs } from "./types"  
-import { isNullOrEmpty } from "../../common-methods"
-
-export const locationMoves: { [key: string]: MoveFunction } = {
-    [LocationMovesEnum.DRAW]: ({ mgState, playerState, move }: MoveFunctionArgs) => {
-        
-        draw(playerState, mgState.random, move.params.selectionNumber)
-    },
-    [LocationMovesEnum.ADD_PRESENCE_TOKEN]: ({ mgState, playerState, move, location }: MoveFunctionArgs) => {
-        const district = mgState.G.districts.find(d => d.id == location!.districtId);
-        if (district && !isNullOrEmpty(district.presence) && district.presence[playerState.id]) {
-            district.presence[playerState.id].amount += 1;
-        } else {
-            district!.presence = {...district?.presence, [playerState.id]: {playerID: playerState.id, amount: 1}};            
-        }
-        // draw(playerState, mgState.random)
-    },
-    [LocationMovesEnum.GET_LOOT]: ({ mgState, playerState, move }: MoveFunctionArgs) => {
-
-        getLoot(playerState)
-    },
-    [LocationMovesEnum.DISCARD]: ({ mgState, playerState, move }: MoveFunctionArgs) => {
-
-        discard(playerState, move.params)
-    }, 
-    [LocationMovesEnum.TRASH]: ({ mgState, playerState, move }: MoveFunctionArgs) => {
-        
-        trash(playerState, move.params)
-    },
-    [LocationMovesEnum.ADD_REPAIR_TOKEN]: ({ mgState, playerState, move }: MoveFunctionArgs) => {
-        
-    },
-    [LocationMovesEnum.ADVANCE_TRACKER]: ({ mgState, playerState, move }: MoveFunctionArgs) => {
-        
-    },
-    [LocationMovesEnum.BUY_CARD]: ({ mgState, playerState, move }: MoveFunctionArgs) => {
-        
-    },
-    [LocationMovesEnum.COOLDOWN]: ({ mgState, playerState, move }: MoveFunctionArgs) => {
-        
-    },
-    [LocationMovesEnum.DEAL]: ({ mgState, playerState, move }: MoveFunctionArgs) => {
-        
-    },
-    [LocationMovesEnum.GET_SWORD_MASTER]: ({ mgState, playerState, move }: MoveFunctionArgs) => {
-        playerState.currentNumberOfWorkers += 1;
-        playerState.maxNumberOfWorkers += 1;
-        
-    },
-    [LocationMovesEnum.SIGNET_TRIGGER]: ({ mgState, playerState, move }: MoveFunctionArgs) => {
-        
-    },
-}
-
-export const executeMove = (mgState: MetaGameState, move: BoardMove) => {
-    const playerState = getCurrentPlayer(mgState);
-    locationMoves[move.moveId] ? locationMoves[move.moveId]({ mgState, playerState, move, location: move.location }) : null;
-}
\ No newline at end of file
diff --git a/shared/services/moves/types.ts b/shared/services/moves/types.ts
deleted file mode 100644
index d0ea9d1..0000000
--- a/shared/services/moves/types.ts
+++ /dev/null
@@ -1,10 +0,0 @@
-import { BoardMove, Location, MetaGameState, PlayerGameState } from "../../types";
-
-export type MoveFunctionArgs = {
-    mgState: MetaGameState, 
-    playerState: PlayerGameState, 
-    move: BoardMove,
-    location?: Location
-}
-
-export type MoveFunction = (args: MoveFunctionArgs) => void;
diff --git a/shared/types.ts b/shared/types.ts
index b9c6fff..f1bb41a 100644
--- a/shared/types.ts
+++ b/shared/types.ts
@@ -1,5 +1,5 @@
 import { Ctx, DefaultPluginAPIs, PlayerID } from "boardgame.io";
-import { DistrictIconsEnum, ResourceEnum } from "./enums";
+import { DistrictIconsEnum, LocationActionsEnum, RequirementType, ResourceEnum } from "./enums";
 
 export type MetaGameState = {
     G: GameState;
@@ -11,14 +11,30 @@ export type MetaGameState = {
 
 export interface GameState {
   players: Dictionary<PlayerGameState>;
-  playersViewModel: PlayerViewModel[];
   districts: District[];
   cardMarket: Card[];
   roundEndingCounter: number;
   gameEndingCounter: number;
   ranking: PlayerGameState[];
+  /** Public view of all players for UI display */
+  playersViewModel: PlayerViewModel[];
 }
 
+/**
+ * Helper type to get a player's public or private state.
+ * After playerView filtering:
+ * - Current player: PlayerGameState (full access)
+ * - Other players: PlayerViewModel (public only)
+ */
+export type PlayerPublicOrPrivate = PlayerGameState | PlayerViewModel;
+
+/**
+ * Type guard to check if a player state is the full private state.
+ */
+export const isFullPlayerState = (player: PlayerPublicOrPrivate): player is PlayerGameState => {
+    return 'hand' in player && Array.isArray(player.hand);
+};
+
 export type PlayerGameState = {
   id: string;
   cardsInPlay?: Card[];
@@ -87,39 +103,99 @@ export type Location = {
   isRestrictedArea?: boolean;
 }
 
+/**
+ * Cost to enter a location.
+ *
+ * Use `resources` for simple numeric costs (loot, candy).
+ * Use `actions` for complex costs requiring validation or user input (discard, trash).
+ */
 export type LocationCost = {
   districtIconIds: string[];
+  /** Simple numeric resource costs - deducted directly from player */
   resources?: ResourceBag[];
-  moves?: BoardMove[]; 
+  /** Complex action costs - executed via action registry, may require user input */
+  actions?: CostAction[];
 }
 
+/**
+ * A simple numeric resource amount.
+ * Use for straightforward +/- operations on player resources.
+ */
 export type ResourceBag = {
   resourceId: ResourceEnum;
   amount: number
 }
 
-// evitar rewards que requieren elecciones de usuario por el momento
-// la interaccion es mas facil en el momento de pagar el coste (cuando todavia no se ejecuta la move)
+/**
+ * Rewards granted when entering a location.
+ *
+ * Use `resources` for simple numeric rewards (loot, candy).
+ * Use `actions` for complex rewards requiring game logic (draw, presence tokens).
+ */
 export type LocationReward = {
+  /** Simple numeric resource rewards - added directly to player */
   resources?: ResourceBag[];
-  moves?: BoardMove[];
+  /** Complex action rewards - executed via action registry */
+  actions?: RewardAction[];
+}
+
+// Validation context for checking if an action can be performed
+export type ValidationContext = {
+  selectedCard?: Card;
+  location?: Location;
 }
 
-export type BoardMove = {
-  moveId: string;
+// Base requirement - serializable data only (no functions)
+export type ActionRequirement = {
+  type: RequirementType;
+  params: { count: number };
+}
+
+/**
+ * Cost action - MUST be performed to enter location.
+ * Use for complex costs that require validation or user input.
+ * Executed via action registry.
+ */
+export type CostAction = {
+  actionId: LocationActionsEnum;
+  name: string;
+  params?: any;
+  requirements: ActionRequirement[];
+}
+
+/**
+ * Reward action - Performed AFTER entering location or playing a card.
+ * Use for complex rewards that require game logic.
+ * Executed via action registry.
+ */
+export type RewardAction = {
+  actionId: LocationActionsEnum;
   name: string;
   params?: any;
   location?: Location;
 }
 
+/**
+ * A playable card in the game.
+ *
+ * Cards can provide both resources and actions when played:
+ * - Use `primaryResources`/`secondaryResources` for simple numeric rewards
+ * - Use `primaryEffects`/`secondaryEffects` for complex game logic
+ */
 export type Card = {
   id: string;
   name: string;
   districtIds: string[];
 
-  // card effects must be atomic in case we need rollback
-  primaryEffects?: BoardMove;
-  secondaryEffects?: BoardMove;
+  /** Simple numeric resources granted when card is played */
+  primaryResources?: ResourceBag[];
+  /** Simple numeric resources for secondary/delayed effects */
+  secondaryResources?: ResourceBag[];
+
+  /** Complex action effects executed via registry when card is played */
+  primaryEffects?: RewardAction[];
+  /** Complex action effects for secondary/delayed execution */
+  secondaryEffects?: RewardAction[];
 }
 
 // Utils
