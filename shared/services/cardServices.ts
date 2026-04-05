import { Card } from "../types";
import { DistrictIconsEnum } from "../enums";
import { getEnumStringKeys } from "../common-methods";
import _ from "lodash";
import { resources, actions } from "../actions/effect-factories";

let _cardInstanceCounter = 0;

export const getInitialDeck = (): Card[] => {
    return [
        getSignetCard(),
        ...getTierOneCards(),
        ...getTierTwoCards(),
    ]
}

export const getTierOneCards = () => {
    return Object.values(DistrictIconsEnum).map<Card>(
        (districtId) => ({
            ...getDistrictCard([districtId]),
            primaryEffects: [actions.addPresence()]
        })
    );
}

export const getTierTwoCards = (): Card[] => {
    return [
        {
            ...getDistrictCard([DistrictIconsEnum.D1, DistrictIconsEnum.D3]),
            secondaryEffects: [actions.addRepairToken()],
        },
        {
            ...getDistrictCard([DistrictIconsEnum.D2, DistrictIconsEnum.D4]),
            secondaryEffects: [actions.addRepairToken()],
        },
        ...getMiscelanousDeck()
    ];
}

export const getMarketTierOneCards = () => {
    const districtIds = Object.values(DistrictIconsEnum);
    
    const tierOneMarketCards = _.flatMap(districtIds, id1 =>
        districtIds.map(id2 => [id1, id2])
        .filter(s => {
            const [a, b] = s;
            return a !== b; // elimina "LOC1-LOC1"
        }));

        const marketTierOne: Card[] = [];
        [...new Set(tierOneMarketCards)].forEach(tuple => {
            marketTierOne.push({
                ...getDistrictCard(tuple),
                primaryEffects: [actions.addPresence()],
            });
        })
    return marketTierOne;
}

const getMiscelanousDeck = (): Card[] => {
    const allDistricts = [DistrictIconsEnum.D1, DistrictIconsEnum.D2, DistrictIconsEnum.D3, DistrictIconsEnum.D4];

    return [
        {
            id: `MISC-STRANGE-${++_cardInstanceCounter}`,
            name: "Strange Candy",
            districtIds: allDistricts,
            primaryResources: [resources.loot(1)],
            secondaryEffects: [actions.strangeCandyPuzzle()]
        },
        {
            id: `MISC-COOLDOWN-${++_cardInstanceCounter}`,
            name: "Cooldown",
            districtIds: [],
            secondaryEffects: [actions.cooldown()]
        },
        {
            id: `MISC-STRANGE-${++_cardInstanceCounter}`,
            name: "Strange Candy",
            districtIds: allDistricts,
            primaryResources: [resources.loot(1)],
            secondaryEffects: [actions.strangeCandyPuzzle()]
        }
    ];
}

export const getDistrictCard = (districtIds: string[]): Card => {
    const districtId = districtIds.join("-");

    return {
        id: `${districtId}-${++_cardInstanceCounter}`,
        districtIds,
        name: districtId,
    }
}

export const getSignetCard = (): Card => ({
    id: `SIGNET-${++_cardInstanceCounter}`,
    name: "Signet",
    districtIds: [
        DistrictIconsEnum.D1,
        DistrictIconsEnum.D2,
        DistrictIconsEnum.D3,
        DistrictIconsEnum.D4,
    ],
    primaryEffects: [actions.signetTrigger()]
});

