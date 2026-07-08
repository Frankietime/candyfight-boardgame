import D1 from "../../assets/board/district-1-icon.png";
import D2 from "../../assets/board/district-2-icon.png";
import D3 from "../../assets/board/district-3-icon.png";
import D4 from "../../assets/board/district-4-icon.png";

import redWorker from "../../assets/tipitos/worker-red.png";
import greenWorker from "../../assets/tipitos/worker-green.png";
import violetWorker from "../../assets/tipitos/worker-purple.png";
import yellowWorker from "../../assets/tipitos/worker-yellow.png";

import CANDY from "../../assets/board/resource-candy.png";
import LOOT from "../../assets/board/resource-loot.png";
import DISCARD from "../../assets/board/action-discard.png";
import TRASH from "../../assets/board/action-trash.png";
import DRAW from "../../assets/board/action-draw.png";

import cardCanvas from "../../assets/cards/card-canvas-1-small.png";
import cardCanvasLarge from "../../assets/cards/card-canvas-1-large.png";

export const cardCanvasSmall = cardCanvas;
export { cardCanvasLarge };

import { Dictionary } from "@candyfight/shared/types";
import { DistrictIconsEnum, LocationActionsEnum, ResourceEnum } from "@candyfight/shared/enums";

export const districtIconsDict: Dictionary<any> = {
    [DistrictIconsEnum.D1]: D1,
    [DistrictIconsEnum.D2]: D2,
    [DistrictIconsEnum.D3]: D3,
    [DistrictIconsEnum.D4]: D4,
}

export const resourceIconsDict: Dictionary<any> = {
    [ResourceEnum.Candy]: CANDY,
    [ResourceEnum.Loot]: LOOT,
    [LocationActionsEnum.DISCARD]: DISCARD,
    [LocationActionsEnum.TRASH]: TRASH,
    [LocationActionsEnum.DRAW]: DRAW,
}

// Seat order (from human seat 0): red · violet (top-right) · green (bottom-right) · yellow (top-left)
export const workerIconsByPlayerId = [redWorker, violetWorker, greenWorker, yellowWorker];
