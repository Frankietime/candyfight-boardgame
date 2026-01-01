import { DistrictIconsEnum, LocationMovesEnum, ResourceEnum } from "../enums";
import { District, Location, LocationReward } from "../types";


export const getInitialLocationReward = (): LocationReward => ({
    resources: [
        // {resourceId: ResourceEnum.Candy, amount: 1},
        // {resourceId: ResourceEnum.Loot, amount: 1},
    ],
    moves: [{ moveId: LocationMovesEnum.DRAW, name: "draw", params: { selectionNumber: 2 }}]
});

export const getHighCouncil = (district: DistrictIconsEnum, locIndex: number): Location => ({
    Id: district.toString() + locIndex,
    districtId: district.toString(),
    name: district.toString() + " - High Council",
    cost: {
        districtIconIds: [district],
        moves: [{ moveId: LocationMovesEnum.DISCARD, name: "discard 2", params: {cardIds: [], selectionNumber: 2}}]
    },
    reward: {
        moves: [
            {
                moveId: LocationMovesEnum.ADVANCE_TRACKER,
                name: "+Tracker"
            },
            {
                moveId: LocationMovesEnum.ADD_PRESENCE_TOKEN,
                name: "FIGHT!"
            }
        ],
    }
});

export const getInitialDistrictsState = (): District[] => {
    return [
        {
            id: DistrictIconsEnum.D1,
            name: "CONURBAPLEX",
            y: 67,
            x: 355,
            presence: {},
            locations: [
            {
                Id: DistrictIconsEnum.D1.toString() + 0,
                districtId: DistrictIconsEnum.D1,
                name: "Restricted Area",
                cost: {
                    districtIconIds: [DistrictIconsEnum.D1],
                },
                reward: {moves: [], resources: []},
                dominanceBy: [],
                isRestrictedArea: true,
            },
            {
                Id: DistrictIconsEnum.D1 + 1,
                districtId: DistrictIconsEnum.D1,
                name: "CONURBA Market",
                cost: {
                    districtIconIds: [DistrictIconsEnum.D1],
                    moves: [{ moveId: LocationMovesEnum.TRASH, name: "trash", params: {cardIds: [], selectionNumber: 2}}]
                },
                reward: {
                    moves: [{moveId: LocationMovesEnum.BUY_CARD, name: "buy card"}]
                }
            },
            {...getHighCouncil(DistrictIconsEnum.D1, 2)},
            {
                Id: DistrictIconsEnum.D1.toString() + 3,
                districtId: DistrictIconsEnum.D1,
                name: "Time for Candy",
                cost: {
                    districtIconIds: [DistrictIconsEnum.D1],
                    moves: [{ moveId: LocationMovesEnum.DISCARD, name: "discard 2", params: {cardIds: [], selectionNumber: 2}}]
                },
                reward: {
                    resources: [{resourceId: ResourceEnum.Candy, amount: 1}]
                }
            },
        ]
        },
        {
            id: DistrictIconsEnum.D2,
            name: "ECOPLEX - MARKET",
            presence: {},
            x: 613,
            y: 67,
            locations: [
            {
                Id: DistrictIconsEnum.D2 + 0,
                districtId: DistrictIconsEnum.D2,
                name: "ECO Market",
                cost: {
                    districtIconIds: [DistrictIconsEnum.D2],
                    moves: [{moveId: LocationMovesEnum.TRASH, name: "trash", params: { cardIds: [], selectionNumber: 2 }}, {moveId: LocationMovesEnum.BUY_CARD, name: "buy card"}]
                },
                reward: {
                }
            },
            {
                Id: DistrictIconsEnum.D2 + 1,
                districtId: DistrictIconsEnum.D2,
                name: "Momentum",
                cost: {
                    districtIconIds: [DistrictIconsEnum.D2],
                    moves: [{ moveId: LocationMovesEnum.TRASH, name: "trash 2", params: {cardIds: [], selectionNumber: 2}}]
                },
                reward: {
                }
            },
            {
                Id: DistrictIconsEnum.D2 + 2,
                districtId: DistrictIconsEnum.D2,
                name: "Restricted Area",
                cost: {
                    districtIconIds: [DistrictIconsEnum.D2],
                },
                reward: {
                    moves: [{ moveId: LocationMovesEnum.DEAL, name: "deal"}]
                },
                dominanceBy: [],
                isRestrictedArea: true
            },
            { ...getHighCouncil(DistrictIconsEnum.D2, 3) }
            ],
        },
        {
            id: DistrictIconsEnum.D3,
            name: "Streets",
            presence: {},
            x: 303,
            y: 344,
            locations: [
                {
                    Id: DistrictIconsEnum.D3.toString() + 0,
                    districtId: DistrictIconsEnum.D3,
                    name: "Easy Job",
                    cost: {
                        districtIconIds: [DistrictIconsEnum.D3],
                    },
                    reward: {
                        resources: [
                            {
                                resourceId: ResourceEnum.Loot,
                                amount: 1
                            }
                        ]
                    }
                },
                {
                    Id: DistrictIconsEnum.D3.toString() + 0,
                    districtId: DistrictIconsEnum.D3,
                    name: "Bargain",
                    cost: {
                        districtIconIds: [DistrictIconsEnum.D3],
                        moves: [{ moveId: LocationMovesEnum.TRASH, name: "trash", params: {cardIds: [], selectionNumber: 2}}]
                    },
                    reward: {
                        resources: [
                            {
                                resourceId: ResourceEnum.Loot,
                                amount: 2
                            }
                        ]
                    }
                },
                {
                    Id: DistrictIconsEnum.D3.toString() + 0,
                    districtId: DistrictIconsEnum.D3,
                    name: "Restricted Area",
                    cost: {
                        districtIconIds: [DistrictIconsEnum.D3],
                    },
                    reward: {
                        resources: []
                    },
                    isRestrictedArea: true
                },
                { ...getHighCouncil(DistrictIconsEnum.D3, 3) }
            ],
        },
        {
        id: DistrictIconsEnum.D4,
        name: "AGI Control Zone",
        presence: {},
        x: 665,
        y: 344,
        locations: [
            { ...getHighCouncil(DistrictIconsEnum.D4, 0) },
            {
                Id: DistrictIconsEnum.D4.toString() + 1,
                districtId: DistrictIconsEnum.D4,
                name: "Time is Gold",
                cost: {
                    districtIconIds: [DistrictIconsEnum.D4],
                    resources: [
                        {
                            resourceId: ResourceEnum.Loot,
                            amount: 2
                        }
                    ],
                },
                reward: {
                    moves: [{moveId: LocationMovesEnum.DRAW, name: "draw", params: {selectionNumber: 2}}]
                }
            },
            {
                Id: DistrictIconsEnum.D4.toString() + 2,
                districtId: DistrictIconsEnum.D4,
                name: "Sword Master",
                cost: {
                    districtIconIds: [DistrictIconsEnum.D4],
                    resources: [
                        {
                            resourceId: ResourceEnum.Candy,
                            amount: 4
                        }
                    ],
                },
                reward: {
                    moves: [{moveId: LocationMovesEnum.GET_SWORD_MASTER, name: "Sword Master"}]
                }
            },
            {
                Id: DistrictIconsEnum.D4.toString() + 3,
                districtId: DistrictIconsEnum.D4,
                name: "Restricted Area",
                cost: {
                    districtIconIds: [DistrictIconsEnum.D4],
                    resources: [],
                },
                reward: {},
                isRestrictedArea: true
            }
        ],
        }
    ];
}