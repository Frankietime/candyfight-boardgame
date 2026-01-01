import { Card } from "../types";
import { DistrictIconsEnum, LocationMovesEnum } from "../enums";
import { getEnumStringKeys } from "../common-methods";
import _ from "lodash";

export const getInitialDeck = (): Card[] => {
    return [
        getSignetCard(),
        ...getTierOneCards(),
        ...getTierTwoCards(),
    ]
}



export const getTierOneCards = () => {
    return Object.values(DistrictIconsEnum).map<Card>(
        (districtId) => {
            return {
            ...getDistrictCard([districtId]),
            primaryEffects: 
                {
                    moveId: LocationMovesEnum.ADD_PRESENCE_TOKEN,
                    name: "FIGHT!"
                }
            }
        }
    );
}

export const getTierTwoCards = (): Card[] => {

    return [
        {
            ...getDistrictCard([DistrictIconsEnum.D1, DistrictIconsEnum.D3]),
            secondaryEffects:
                {
                    moveId: LocationMovesEnum.ADD_REPAIR_TOKEN,
                    name: "REPAIR"
                }
            ,
        },
        {
            ...getDistrictCard([DistrictIconsEnum.D2, DistrictIconsEnum.D4]),
            secondaryEffects:
                {
                    moveId: LocationMovesEnum.ADD_REPAIR_TOKEN,
                    name: "REPAIR"
                }
            ,
        },
        ...getMiscelanousDeck()

    ];
}

export const getMarketTierOneCards = () => {
    const districtIds = getEnumStringKeys(DistrictIconsEnum);
    
    const tierOneMarketCards = _.flatMap(districtIds, id1 =>
        districtIds.map(id2 => [id1, id2])
        .filter(s => {
            const [a, b] = s;
            return a !== b; // elimina "LOC1-LOC1"
        }));

        const marketTierOne: Card[] = [];
        [...new Set(tierOneMarketCards)].forEach(tuple => {
            marketTierOne.push(getDistrictCard(tuple));
        })
    return marketTierOne;
}

const getMiscelanousDeck = (): Card[] => {
    return [
        {
            id: "MISC-1",
            name: "Strange Candy",
            districtIds: [DistrictIconsEnum.D1, DistrictIconsEnum.D2, DistrictIconsEnum.D3, DistrictIconsEnum.D4
            ],
            primaryEffects: 
                {
                    moveId: LocationMovesEnum.GET_LOOT,
                    name: "GET LOOT"
                }
            ,
            secondaryEffects:
                {
                    moveId: LocationMovesEnum.STRANGE_CANDY_PUZZLE,
                    name: "Stg. Candy Puzzle"
                }
        },
        {
            id: "MISC-2",
            name: "Cooldown",
            districtIds: [],
            secondaryEffects: 
                {
                    moveId: LocationMovesEnum.COOLDOWN,
                    name: "COOLDOWN"
                }            
        },
        {
            id: "MISC-3",
            name: "Strange Candy",
            districtIds: [DistrictIconsEnum.D1, DistrictIconsEnum.D2, DistrictIconsEnum.D3, DistrictIconsEnum.D4],
            primaryEffects: 
                {
                    moveId: LocationMovesEnum.GET_LOOT,
                    name: "GET LOOT"
                }
            ,
            secondaryEffects: 
                {
                    moveId: LocationMovesEnum.STRANGE_CANDY_PUZZLE,
                    name: "Stg. Candy Puzzle"
                }
            
        }
    ];
}

export const getDistrictCard = (districtIds: string[]): Card => {
    const districtId = districtIds.join("-");

    return {
        id: districtId,
        districtIds,
        name: districtId,
    }
}

export const getSignetCard = () => ({
    id: "signet",
    name: "Signet",
    districtIds: [
        DistrictIconsEnum.D1,
        DistrictIconsEnum.D2,
        DistrictIconsEnum.D3,
        DistrictIconsEnum.D4,
    ],
    primaryEffect: [LocationMovesEnum.SIGNET_TRIGGER]
});

