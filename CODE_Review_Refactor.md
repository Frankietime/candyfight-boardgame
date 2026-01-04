# Code Review & Refactoring - Candy Fight

## Análisis de Shallow Modules (John Ousterhout)

### Fecha: 2026-01-04

### ¿Qué es un Shallow Module?

Según John Ousterhout en "A Philosophy of Software Design", un **shallow module** es aquel cuya interfaz es casi tan compleja como su implementación. No oculta complejidad ni proporciona una abstracción significativa. Los módulos deben ser **profundos** (deep): interface simple, implementación compleja.

---

## Módulos Superficiales Identificados

### 1. ⚠️ `/shared/common-methods.ts` - CRÍTICO

**Ubicación:** `shared/common-methods.ts:1-15`

**Problemas:**
- 4 funciones utilitarias triviales sin abstracción real
- La interfaz es tan compleja como la implementación
- Wrappers innecesarios sobre operaciones básicas

**Ejemplos:**

```typescript
// Línea 1-10: Wrapper trivial sobre operaciones nativas
export const isNullOrEmpty = (item: any) => {
    const type = typeof item;
    switch (type) {
        case "string": return item == "";
        default: return item == null || item == undefined || item.length == 0;
    }
}

// Línea 12-13: Wrappers de una línea sobre Object.keys
export const getEnumStringKeys = (_: {}) => Object.keys(_).filter(k => isNaN(parseInt(k)));
export const getEnumNumberKeys = (_: {}) => Object.keys(_).filter(k => typeof k == "string").map(k => parseInt(k));

// Línea 15: Wrapper trivial sobre console.log
export const log = (text?: string, isPhase?: boolean) =>
    text ? console.log(`${isPhase ? '**  ' :'    -> '}${text}${isPhase ? ' PHASE  **' :''}`) : console.log(isPhase ? '----' : '');
```

**Impacto:** Usado en múltiples archivos, agregando capa de indirección sin beneficio.

**Recomendación:**
- **Eliminar** `isNullOrEmpty` - Usar operadores nativos directamente
- **Eliminar** `getEnumStringKeys/NumberKeys` - Usar directamente o crear tipo utilitario TypeScript
- **Eliminar** `log` - Usar `console.log` directamente o implementar logger robusto

---

### 2. ⚠️ `/shared/services/moves/helper.ts` - MEDIO

**Ubicación:** `shared/services/moves/helper.ts:5-11`

**Problemas:**
- Getters triviales que no reducen complejidad cognitiva
- Accessors de una línea que podrían ser inline

**Ejemplos:**

```typescript
// Líneas 5-7
export const getCurrentPlayer = (mgState: MetaGameState) => {
    return mgState.G.players[mgState.ctx.currentPlayer];
}

// Líneas 9-11
export const getCurrentLocation = (mgState: MetaGameState, districtID: number, locationID: number) => {
    return mgState.G.districts[districtID].locations[locationID];
}
```

**Recomendación:**
- **Inline** estos accessors en el código que los usa
- Si la navegación es compleja, considerar agregar métodos a las clases/interfaces correspondientes
- `takeFromHand` (línea 13-29) SÍ tiene lógica y debe mantenerse

---

### 3. ⚠️ `/client/src/services/lobbyServices.ts` - MEDIO

**Ubicación:** `client/src/services/lobbyServices.ts:6-54`

**Problemas:**
- Hook de React que envuelve la API del lobby con wrappers casi directos
- Solo agrega `GAME_NAME` como parámetro constante
- Abstracción mínima que no justifica la capa adicional

**Ejemplos:**

```typescript
// Líneas 9-14
const getMatch = async (matchID: string): Promise<LobbyAPI.Match> => {
    return await lobby.getMatch(GAME_NAME, matchID);
}

// Línea 27
const listMatches = async (): Promise<LobbyAPI.MatchList> =>
    await lobby.listMatches(GAME_NAME);

// Líneas 29-37
const createMatch = async (numPlayers: number, setupData: any): Promise<any> => {
    return await lobby.createMatch(GAME_NAME, { numPlayers, setupData })
}
```

**Recomendación:**
- **Evaluar** si esta abstracción aporta valor o solo agrega indirección
- Si se mantiene, agregar validación, manejo de errores, o lógica de retry
- Considerar configuración centralizada para `GAME_NAME`

---

### 4. ⚠️ `/shared/services/moves/playerServices.ts` - BAJO

**Ubicación:** `shared/services/moves/playerServices.ts:3`

**Problemas:**
- Wrapper de una línea sobre operaciones nativas

**Ejemplo:**

```typescript
// Línea 3
export const getPlayersList = (G: GameState) =>
    Object.keys(G.players).map(playerId => G.players[playerId]);
```

**Nota:** La función `getRandomPlayerName` (líneas 5-39) SÍ tiene lógica sustancial y no es shallow.

**Recomendación:**
- **Inline** `getPlayersList` donde se use
- Alternativamente, usar `Object.values(G.players)` directamente

---

### 5. ⚠️ `/shared/services/locationServices.ts` - BAJO

**Ubicación:** `shared/services/locationServices.ts:5-11`

**Problemas:**
- Función que solo retorna un objeto literal hardcodeado sin lógica

**Ejemplo:**

```typescript
// Líneas 5-11
export const getInitialLocationReward = (): LocationReward => ({
    resources: [],
    moves: [{ moveId: LocationMovesEnum.DRAW, name: "draw", params: { selectionNumber: 2 }}]
});
```

**Nota:** Las funciones `getHighCouncil` y `getInitialDistrictsState` SÍ tienen lógica compleja de configuración.

**Recomendación:**
- **Evaluar** si este valor debería ser una constante en lugar de una función
- Si necesita parametrización futura, mantener; de lo contrario, usar constante

---

## Resumen de Recomendaciones

### Prioridad Alta
1. **Refactorizar** `/shared/common-methods.ts`
   - Eliminar wrappers triviales
   - Promover uso de operadores/funciones nativas
   - Considerar logger más robusto si logging es necesario

### Prioridad Media
2. **Simplificar** `/shared/services/moves/helper.ts`
   - Inline getters triviales
   - Mantener solo funciones con lógica sustancial (`takeFromHand`)

3. **Revisar** `/client/src/services/lobbyServices.ts`
   - Agregar valor real (validación, error handling) o eliminar capa
   - Documentar justificación si se mantiene

### Prioridad Baja
4. **Limpiar** funciones utilitarias triviales
   - `getPlayersList` → inline o `Object.values()`
   - `getInitialLocationReward` → evaluar si debe ser constante

---

## Principios a Aplicar

### Criterios para Módulos Profundos (Deep Modules)

✅ **Mantener cuando:**
- La implementación es significativamente más compleja que la interfaz
- Oculta detalles de implementación
- Reduce duplicación de lógica compleja
- Proporciona abstracción que facilita cambios futuros

❌ **Eliminar cuando:**
- La interfaz refleja 1:1 la implementación
- Es un simple pass-through o wrapper
- No agrega validación, transformación o lógica
- Aumenta complejidad cognitiva en lugar de reducirla

---

## Métricas de Mejora

**Archivos con Shallow Modules:** 5
**Funciones/métodos triviales identificados:** ~10
**Líneas de código que podrían simplificarse:** ~50-80

**Beneficios esperados:**
- Reducción de indirecciones innecesarias
- Código más directo y fácil de entender
- Menor superficie de API a mantener
- Mejor claridad en flujos de datos

---

## Referencias

- Ousterhout, John. *A Philosophy of Software Design*. Yaknyam Press, 2018.
- Concepto clave: "Modules should be deep" (Chapter 4)
- Shallow modules: interface complexity ≈ implementation complexity
- Deep modules: simple interface, complex implementation
