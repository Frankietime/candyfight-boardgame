/**
 * Translation tables. Spanish (`es`) is the default; English (`en`) is the
 * fallback. Keys are looked up by dot-path (see `translate`). Character keys are
 * keyed by the CharacterEnum string values so the UI can build
 * `character.<id>.signet` directly.
 *
 * Narration strings mark keywords with `**double asterisks**`; the client renders
 * those as bold (see `richText.tsx`).
 *
 * Translation policy: only **asset proper names** stay in English in the Spanish
 * locale — district names (Conurbaplex, Ecoplex, Streets, AGI Control Zone),
 * location names (Easy Job, Time is Gold, Sword Master, Ecoplex Market…),
 * character names (Chill Dudes, Kawaiisis, Street Wizards, Tech Bros), the card
 * name Signet, the resources candy & loot, the pile labels Deck/Discard/Trash and
 * the End Round button (all literal UI labels). Everything else is translated
 * (presence, Victory Points/VP, workers, Maintenance/Main/Combat, card, hand,
 * deck, district, location, round, cost, reward, draw, …).
 */
import type { Messages } from "./index";

const es: Messages = {
    common: {
        next: "Siguiente ▸",
        finish: "Finalizar ▸",
        step: "Paso {n} / {total}",
        exitTutorial: "Salir del tutorial",
    },
    gate: {
        card: "Toca la **carta** resaltada.",
        location: "Toca la **ubicación** que brilla.",
        market: "Toca el **mercado** que brilla.",
        reveal: "Toca el botón **Revelar**.",
        signet: "Toca la **carta Signet**.",
        endRound: "Toca **End Round** en la tabla de resultados.",
    },
    lobby: {
        howToPlay: "Cómo jugar",
    },
    characterModal: {
        signetTitle: "Habilidad de Signet",
    },
    character: {
        chilldudes: {
            name: "Chill Dudes",
            description: "Se lo toman con calma, pero siempre llegan preparados.",
            signet: "Roba 1 carta + gana 1 loot",
        },
        kawaiisis: {
            name: "Kawaiisis",
            description: "No dejes que el exterior tierno te engañe.",
            signet: "Gana 2 candy + 1 presencia extra en el distrito actual",
        },
        streetwizards: {
            name: "Street Wizards",
            description: "Hacen aparecer loot de la nada.",
            signet: "Gana 3 loot",
        },
        techbros: {
            name: "Tech Bros",
            description: "Siempre optimizando, siempre robando.",
            signet: "Roba 2 cartas + gana 1 candy",
        },
    },
    tutorial: {
        menu: {
            title: "Cómo jugar",
            subtitle: "Cuatro lecciones cortas cubren todo el juego. Elige cualquiera para empezar — puedes repetirlas.",
            backToLobby: "← Lobby",
        },
        you: "Tú",
        rival: "Rival",
        label: { place: "colocar", buy: "comprar", toDiscard: "al Discard" },
        opponentContinue: "Continuar ▸",
        basics: {
            title: "1 · Lo básico",
            summary: "Tu objetivo, una ronda y tu primer agente.",
            objective: "Bienvenido a Candy Fight. Tu meta es simple: ser el primero en llegar a **6 Puntos de Victoria**.",
            vpCounter: "Este contador lleva tus **Puntos de Victoria**.",
            districtsLoop: "Ganás **Puntos de Victoria** conquistando **distritos**: quien tenga más **presencia** en cualquiera de los distritos gana el **Combate**. Estos son los cuatro distritos.",
            phases: "Las fases de cada ronda se dividen en **Mantenimiento** (robar una nueva mano y devolver los agentes al área del jugador), **Fase Principal** (ejecutar acciones) y **Combate** en los distritos.",
            hand: "En la fase de **Mantenimiento** se roban **5 cartas**. Cada **carta** muestra los **distritos** en los que puede jugarse — esta es de **AGI Control Zone**, y la flecha apunta a su distrito.",
            workers: "Jugar una carta envía un **agente** a una **ubicación**.",
            costReward: "Cada **ubicación** tiene un **coste** y una **recompensa**. **'Time is Gold'**, en **AGI Control Zone**, cuesta **2 loot** y te recompensa con **robar 2 cartas**. Veamos cómo se juega.",
            select: "Primero, selecciona una **carta**. Esta pertenece a **AGI Control Zone**. Tócala.",
            place: "Ahora coloca un **agente** en **'Time is Gold'**. Solo se iluminan las ubicaciones que coinciden con el **distrito** de la carta.",
            result: "Listo. Pagaste el **coste** (**2 loot**), recibiste la **recompensa** (**robaste 2 cartas**) y reclamaste la **ubicación** — ganando **presencia** en AGI Control Zone. Ese es el núcleo de todo el juego.",
        },
        build: {
            title: "2 · Presencia, mazo y Sword Master",
            summary: "Construí presencia, mejorá tu mazo y sumá un agente.",
            presence: "La **presencia** representa tu actividad política y callejera en los **distritos**. Reclamar una **ubicación** siempre da **+1 presencia**. Algunas cartas te permiten añadir otro **+1 de presencia** en el distrito en el que son jugadas. Vamos a construir presencia en **Streets**.",
            select: "Seleccioná tu carta de **Streets**.",
            place: "Colocá tu agente en **'Easy Job'** para sumar **presencia** en **Streets**.",
            count: "Mirá el encabezado de **Streets**: tu **presencia** ahora es **2** (reclamar +1 y el efecto de la carta +1). En el **Combate**, la mayor presencia gana el distrito.",
            resources: "Dos recursos mueven la economía: **candy** y **loot**. Las **ubicaciones** los gastan y los otorgan. Acá están los tuyos.",
            marketIntro: "Los **Card Markets** te permiten ir mejorando tu **mazo** a medida que avanza la partida, y al mismo tiempo **retirar de juego** las cartas que no querés usar.",
            selectMarket: "Este **Market** cuesta **desechar 2 cartas** y te da una **carta** del mercado. Selecciona esta carta — puede llegar al **Ecoplex Market**.",
            buy: "Toca el **Ecoplex Market** para jugar la carta ahí.",
            buyTrash: "Primero pagás el **coste**: elige **2 cartas** débiles para **desechar**.",
            buyPick: "Ahora elige una **carta** del **mercado** para comprar — toca la carta resaltada.",
            discardHover: "La carta comprada fue a tu **Discard** (luego se baraja en tu mazo). Pasá el mouse sobre el contador de **Discard** para verla — queda resaltada.",
            counters: "Estos contadores muestran tu **Deck** y tu **Trash**. Pasá el mouse por cualquiera para inspeccionar sus cartas.",
            character: "Esta es la info de tu **personaje**. Acá ves su **habilidad de Signet**, que se activa al jugar la **carta Signet**.",
            swordmaster: "El **Sword Master** de **AGI Control Zone** te da un **agente** permanente extra por **4 candy**. Seleccioná tu carta de AGI Control Zone y colocala ahí.",
            opponent: "El rival también juega: reclama **'Time is Gold'** y suma **presencia** en **AGI Control Zone**. No estás solo — los demás también compiten por los distritos.",
            opponentCaption: "El rival juega — **Time is Gold**",
            result: "¡Listo! Ahora tenés un **agente** extra para las próximas rondas. **Desechar** cartas débiles y sumar **agentes** hace tu motor más fuerte.",
        },
        signet: {
            title: "3 · Personajes y Signet",
            summary: "La habilidad de tu personaje y cómo activarla.",
            charIntro: "Al empezar la partida elegiste un **personaje**. El tuyo es **Street Wizards**. Cada personaje tiene una **habilidad de Signet** única.",
            abilities: "Esta es la info de tu personaje. Tu **habilidad de Signet** es **+3 loot**, y se activa al jugar la **carta Signet**. Cada personaje tiene la suya.",
            selectSignet: "Tu **carta Signet** activa esa habilidad. Pertenece a todos los distritos, así que puede jugarse en cualquier lugar. Selecciónala.",
            playSignet: "Juega la **Signet** en **'Easy Job'**, en **Streets**.",
            signetResult: "La **Signet** activó la habilidad de tu personaje: **+3 loot**, además de la recompensa propia de la ubicación. Guardá tu Signet para el momento justo.",
        },
        combat: {
            title: "4 · Una ronda completa",
            summary: "Jugá una ronda por turnos: vos, el rival, Revelar y Combate.",
            roundIntro: "Ahora jugamos una **ronda completa** por turnos, arrancando de cero. Vas a jugar, el rival también, y verás cómo sube la **presencia** en los distritos hasta que se resuelve el **Combate**.",
            playStreets: "Es tu turno. Jugá tu carta de **Streets** en **'Easy Job'** para ganar **presencia** ahí.",
            presenceUp: "Fijate el encabezado de **Streets**: tu **presencia** subió. En el **Combate**, quien más presencia tenga se lleva el distrito.",
            rivalSignet: "Ahora juega el rival. Es **Tech Bros**: su **Signet** **roba 2 cartas y gana 1 candy** — distinta a tu **+3 loot**. Reclama **'Sword Master'** en **AGI Control Zone**: gana un **agente** extra y suma **presencia**.",
            opponentSignetCaption: "El rival juega su **Signet** — Tech Bros",
            playAgi: "Tu turno otra vez. Disputá **AGI Control Zone**: jugá tu carta de AGI en **'Time is Gold'** para sumar **presencia** y **robar 2 cartas**.",
            rivalPush: "El rival vuelve a jugar y refuerza **AGI Control Zone** con más **presencia**. Ahora domina el distrito y **revela**.",
            opponentCaption: "El rival juega — **AGI Control Zone**",
            reveal: "Ya jugaste tu turno. Hacé **Revelar** para cerrar tu ronda — ahí empieza el **Combate**. Toca el botón **Revelar**.",
            combatResolve: "Acá está la tabla de resultados. El **Combate** puntúa cada distrito a la vez: el líder de **presencia** gana **+1 Punto de Victoria**, y un empate no da puntos. Cuando estés listo, toca **End Round** para cerrar la ronda.",
            victory: "Ganaste **Streets** por **+1 PV** — la flecha marca tu contador de puntos. El rival ganó **AGI Control Zone**. El primero en llegar a **6 PV** gana la partida. Eso es todo — ¡a pelear por candy!",
        },
    },
};

const en: Messages = {
    common: {
        next: "Next ▸",
        finish: "Finish ▸",
        step: "Step {n} / {total}",
        exitTutorial: "Exit tutorial",
    },
    gate: {
        card: "Click the highlighted **card**.",
        location: "Click the glowing **location**.",
        market: "Click the glowing **market**.",
        reveal: "Click the **Reveal** button.",
        signet: "Click the **Signet** card.",
        endRound: "Press **End Round** in the results table.",
    },
    lobby: {
        howToPlay: "How to Play",
    },
    characterModal: {
        signetTitle: "Signet Ability",
    },
    character: {
        chilldudes: {
            name: "Chill Dudes",
            description: "They take it slow, but always come prepared.",
            signet: "Draw 1 card + gain 1 loot",
        },
        kawaiisis: {
            name: "Kawaiisis",
            description: "Don't let the cute exterior fool you.",
            signet: "Gain 2 candy + 1 extra presence in current district",
        },
        streetwizards: {
            name: "Street Wizards",
            description: "They make loot appear from thin air.",
            signet: "Gain 3 loot",
        },
        techbros: {
            name: "Tech Bros",
            description: "Always optimizing, always drawing.",
            signet: "Draw 2 cards + gain 1 candy",
        },
    },
    tutorial: {
        menu: {
            title: "How to Play",
            subtitle: "Four short lessons cover the whole game. Pick any to start — each is replayable.",
            backToLobby: "← Lobby",
        },
        you: "You",
        rival: "Rival",
        label: { place: "place", buy: "buy", toDiscard: "to Discard" },
        opponentContinue: "Continue ▸",
        basics: {
            title: "1 · The Basics",
            summary: "Your goal, a round, and your first agent.",
            objective: "Welcome to Candy Fight. Your goal is simple: be the first to reach **6 Victory Points**.",
            vpCounter: "This counter tracks your **Victory Points**.",
            districtsLoop: "You earn **Victory Points** by winning **districts**: whoever has the most **presence** in any of the districts wins it at **combat**. Here are the four districts.",
            phases: "Each round's phases are: **Maintenance** (draw a new hand and return your agents to your area), **Main phase** (take actions), and **Combat** in the districts.",
            hand: "In the **Maintenance** phase you draw **5 cards**. Each **card** shows the **districts** where it can be played — this one is an **AGI Control Zone** card, and the arrow points to its district.",
            workers: "Playing a card sends one **agent** to a **location**.",
            costReward: "Every **location** has a **cost** and a **reward**. **'Time is Gold'**, in the **AGI Control Zone**, costs **2 loot** and rewards you with **draw 2 cards**. Let's play it.",
            select: "First, select a **card**. This one belongs to the **AGI Control Zone**. Click it.",
            place: "Now place an **agent** at **'Time is Gold'**. Only locations matching the card's **district** light up.",
            result: "Done. You paid the **cost** (**2 loot**), collected the **reward** (**draw 2 cards**), and claimed the **location** — gaining **presence** in the AGI Control Zone. That's the core of the whole game.",
        },
        build: {
            title: "2 · Presence, Deck & Sword Master",
            summary: "Build presence, improve your deck, and gain an agent.",
            presence: "**Presence** represents your political and street activity in the **districts**. Claiming a **location** always gives **+1 presence**. Some cards let you add **+1 presence** in the district where they're played. Let's build presence in the **Streets**.",
            select: "Select your **Streets** card.",
            place: "Place your agent at **'Easy Job'** to add **presence** in the **Streets**.",
            count: "Look at the **Streets** header: your **presence** is now **2** (claim +1 and the card's effect +1). At **Combat**, the highest presence wins the district.",
            resources: "Two resources drive the economy: **candy** and **loot**. **Locations** spend and grant them. Here are yours.",
            marketIntro: "**Card Markets** let you improve your **deck** as the game goes on, while also **removing from play** the cards you don't want to use.",
            selectMarket: "This **Market** costs **trash 2 cards** and gives you a **card** from the Market. Select this card — it can reach the **Ecoplex Market**.",
            buy: "Click the **Ecoplex Market** to play the card there.",
            buyTrash: "First pay the **cost**: choose **2 weak cards** to **trash**.",
            buyPick: "Now choose a **card** from the **Market** to buy — click the highlighted card.",
            discardHover: "The bought card went to your **Discard** (it shuffles into your deck later). Hover the **Discard** counter to see it — it's highlighted.",
            counters: "These counters show your **Deck** and your **Trash**. Hover any of them to inspect its cards.",
            character: "This is your **character** info. Here's its **Signet ability**, which fires when you play the **Signet card**.",
            swordmaster: "The **Sword Master** in the **AGI Control Zone** grants a permanent extra **agent** for **4 candy**. Select your AGI Control Zone card and place it there.",
            opponent: "The rival plays too: they claim **'Time is Gold'** and gain **presence** in the **AGI Control Zone**. You're not alone — others compete for the districts as well.",
            opponentCaption: "Rival plays — **Time is Gold**",
            result: "Done! You now have an extra **agent** for the next rounds. **Trashing** weak cards and adding **agents** makes your engine stronger.",
        },
        signet: {
            title: "3 · Characters & Signet",
            summary: "Your character ability and how to fire it.",
            charIntro: "At game start you chose a **character**. Yours is the **Street Wizards**. Every character has a unique **Signet ability**.",
            abilities: "This is your character info. Your **Signet ability** is **+3 loot**, and it fires when you play the **Signet card**. Every character has their own.",
            selectSignet: "Your **Signet card** triggers that ability. It belongs to every district, so it can be played anywhere. Select it.",
            playSignet: "Play the **Signet** at **'Easy Job'** in the **Streets**.",
            signetResult: "The **Signet** fired your character's ability: **+3 loot**, on top of the location's own reward. Save your Signet for the right moment.",
        },
        combat: {
            title: "4 · A full round",
            summary: "Play a round turn by turn: you, the rival, Reveal, and Combat.",
            roundIntro: "Now we play a **full round**, turn by turn, starting from zero. You'll play, the rival will play, and you'll watch **presence** climb in the districts until **Combat** resolves.",
            playStreets: "It's your turn. Play your **Streets** card at **'Easy Job'** to gain **presence** there.",
            presenceUp: "Look at the **Streets** header: your **presence** went up. At **Combat**, whoever has the most presence takes the district.",
            rivalSignet: "Now the rival plays. They're the **Tech Bros**: their **Signet** **draws 2 cards and gains 1 candy** — unlike your **+3 loot**. They claim **'Sword Master'** in the **AGI Control Zone**: an extra **agent** and **presence**.",
            opponentSignetCaption: "Rival plays their **Signet** — Tech Bros",
            playAgi: "Your turn again. Contest the **AGI Control Zone**: play your AGI card at **'Time is Gold'** to add **presence** and **draw 2 cards**.",
            rivalPush: "The rival plays again and reinforces the **AGI Control Zone** with more **presence**. Now they dominate the district and **reveal**.",
            opponentCaption: "Rival plays — **AGI Control Zone**",
            reveal: "You've taken your turn. **Reveal** to close your round — that's where **Combat** begins. Click the **Reveal** button.",
            combatResolve: "Here's the results table. **Combat** scores every district at once: the **presence** leader gets **+1 Victory Point**, and a **tie** scores nothing. When you're ready, press **End Round** to close the round.",
            victory: "You won the **Streets** for **+1 VP** — the arrow points to your points counter. The rival won the **AGI Control Zone**. First to **6 VP** wins the game. That's everything — go fight for some candy!",
        },
    },
};

export const messages: Record<"es" | "en", Messages> = { es, en };
