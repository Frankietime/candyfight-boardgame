import { memo } from "react";
import { Dictionary } from "@candyfight/shared/types";
import { DistrictIconsEnum, LocationActionsEnum, ResourceEnum } from "@candyfight/shared/enums";

// District icons
import D1 from "../../assets/board/district-1-icon.png";
import D2 from "../../assets/board/district-2-icon.png";
import D3 from "../../assets/board/district-3-icon.png";
import D4 from "../../assets/board/district-4-icon.png";

// Resource and action icons
import CANDY from "../../assets/board/resource-candy.png";
import LOOT from "../../assets/board/resource-loot.png";
import DISCARD from "../../assets/board/action-discard.png";
import TRASH from "../../assets/board/action-trash.png";
import DRAW from "../../assets/board/action-draw.png";

// Worker icons
import redWorker from "../../assets/tipitos/worker-red.png";
import greenWorker from "../../assets/tipitos/worker-green.png";
import violetWorker from "../../assets/tipitos/worker-purple.png";
import yellowWorker from "../../assets/tipitos/worker-yellow.png";

// Icon registries
const districtIcons: Dictionary<string> = {
  [DistrictIconsEnum.D1]: D1,
  [DistrictIconsEnum.D2]: D2,
  [DistrictIconsEnum.D3]: D3,
  [DistrictIconsEnum.D4]: D4,
};

const resourceIcons: Dictionary<string> = {
  [ResourceEnum.Candy]: CANDY,
  [ResourceEnum.Loot]: LOOT,
};

const actionIcons: Dictionary<string> = {
  [LocationActionsEnum.DISCARD]: DISCARD,
  [LocationActionsEnum.TRASH]: TRASH,
  [LocationActionsEnum.DRAW]: DRAW,
};

// Seat order (from human seat 0): red · violet (top-right) · green (bottom-right) · yellow (top-left)
const workerIcons: string[] = [redWorker, violetWorker, greenWorker, yellowWorker];

// Size presets in Tailwind classes
const sizeClasses = {
  xs: "h-3 w-3",
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
  xl: "h-10 w-10",
} as const;

export type IconType = "district" | "resource" | "action" | "worker";
export type IconSize = keyof typeof sizeClasses;

export interface GameIconProps {
  type: IconType;
  id: string | number;
  size?: IconSize;
  amount?: number;
  className?: string;
}

/**
 * Unified icon component for districts, resources, actions, and workers.
 * Consolidates DistrictIconComponent, ResourceComponent, and worker icons.
 */
export const GameIcon = memo(({
  type,
  id,
  size = "md",
  amount,
  className = ""
}: GameIconProps) => {
  let src: string | undefined;

  switch (type) {
    case "district":
      src = districtIcons[id as string];
      break;
    case "resource":
      src = resourceIcons[id as string];
      break;
    case "action":
      src = actionIcons[id as string];
      break;
    case "worker":
      src = workerIcons[id as number];
      break;
  }

  if (!src) {
    return null;
  }

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <img
        src={src}
        alt={`${type}-${id}`}
        className={`${sizeClasses[size]} inline-block`}
      />
      {amount !== undefined && amount > 0 && (
        <span className="text-xs">x{amount}</span>
      )}
    </span>
  );
});

GameIcon.displayName = "GameIcon";

// Specialized wrapper for districts (for backwards compatibility)
export interface DistrictIconProps {
  districtId: string;
  size?: IconSize;
  className?: string;
}

export const DistrictIcon = memo(({ districtId, size = "lg", className }: DistrictIconProps) => (
  <GameIcon type="district" id={districtId} size={size} className={className} />
));

DistrictIcon.displayName = "DistrictIcon";

// Specialized wrapper for resources (for backwards compatibility)
export interface ResourceIconProps {
  resourceId: string;
  amount?: number;
  size?: IconSize;
  className?: string;
}

export const ResourceIcon = memo(({ resourceId, amount, size = "md", className }: ResourceIconProps) => (
  <GameIcon type="resource" id={resourceId} amount={amount} size={size} className={className} />
));

ResourceIcon.displayName = "ResourceIcon";

// Specialized wrapper for actions
export interface ActionIconProps {
  actionId: string;
  amount?: number;
  size?: IconSize;
  className?: string;
}

export const ActionIcon = memo(({ actionId, amount, size = "md", className }: ActionIconProps) => (
  <GameIcon type="action" id={actionId} amount={amount} size={size} className={className} />
));

ActionIcon.displayName = "ActionIcon";

// Worker icon (single worker)
export interface WorkerIconProps {
  playerId: number;
  size?: IconSize;
  className?: string;
}

export const WorkerIcon = memo(({ playerId, size = "md", className }: WorkerIconProps) => (
  <GameIcon type="worker" id={playerId} size={size} className={className} />
));

WorkerIcon.displayName = "WorkerIcon";

// Worker group component (multiple workers for a player)
export interface WorkerGroupProps {
  playerId: number;
  count: number;
  size?: IconSize;
  className?: string;
}

export const WorkerGroup = memo(({ playerId, count, size = "sm", className = "" }: WorkerGroupProps) => {
  if (count <= 0) return null;

  return (
    <div className={`inline-flex items-center ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="relative"
          style={{ marginLeft: index > 0 ? "-4px" : 0 }}
        >
          <WorkerIcon playerId={playerId} size={size} />
        </div>
      ))}
    </div>
  );
});

WorkerGroup.displayName = "WorkerGroup";

// Re-export registries for direct access if needed
export { districtIcons, resourceIcons, actionIcons, workerIcons };
