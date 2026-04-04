import { ReactNode, memo } from "react";
import React from "react";
import { Button, Dialog, Flex } from "@radix-ui/themes";

export type DialogSize = "sm" | "md" | "lg" | "xl" | "full" | "half";

const sizeStyles: Record<DialogSize, { maxWidth: string; height?: string }> = {
  sm: { maxWidth: "min(400px, 90vw)" },
  md: { maxWidth: "min(600px, 90vw)" },
  lg: { maxWidth: "min(800px, 95vw)" },
  xl: { maxWidth: "min(1000px, 95vw)" },
  full: { maxWidth: "100%", height: "auto" },
  half: { maxWidth: "50%", height: "auto" },
};

export interface DialogAction {
  label: string;
  onClick: () => void;
  variant?: "solid" | "soft" | "outline" | "ghost" | "surface";
  color?: "red" | "blue" | "green" | "gray" | "amber" | "violet";
  disabled?: boolean;
  highContrast?: boolean;
}

export interface GameDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Optional callback when dialog open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Dialog title */
  title?: React.ReactNode;
  /** Title alignment (uses Radix Flex values) */
  titleAlign?: "start" | "center" | "end";
  /** Dialog content */
  children: ReactNode;
  /** Primary action button */
  primaryAction?: DialogAction;
  /** Secondary action button */
  secondaryAction?: DialogAction;
  /** Additional actions */
  extraActions?: DialogAction[];
  /** Dialog size preset */
  size?: DialogSize;
  /** Custom height */
  height?: string;
  /** Top offset for positioning */
  top?: string;
  /** Whether to show action buttons */
  showActions?: boolean;
}

/**
 * Unified dialog component for the game.
 * Wraps Radix UI Dialog with consistent styling and common patterns.
 */
export const GameDialog = memo(({
  open,
  onOpenChange,
  title,
  titleAlign = "center",
  children,
  primaryAction,
  secondaryAction,
  extraActions = [],
  size = "md",
  height,
  top,
  showActions = true,
}: GameDialogProps) => {
  const sizeStyle = sizeStyles[size];
  const allActions = [
    ...(primaryAction ? [primaryAction] : []),
    ...(secondaryAction ? [secondaryAction] : []),
    ...extraActions,
  ];

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content
        style={{
          ...sizeStyle,
          ...(height && { height }),
          ...(top && { top }),
        }}
      >
        {title && (
          <Dialog.Title>
            <Flex justify={titleAlign}>{title}</Flex>
          </Dialog.Title>
        )}

        {children}

        {showActions && allActions.length > 0 && (
          <Flex gap="3" justify="center" style={{ marginTop: "20px" }}>
            {allActions.map((action, index) => (
              <Button
                key={`dialog-action-${index}`}
                variant={action.variant ?? "solid"}
                color={action.color}
                disabled={action.disabled}
                highContrast={action.highContrast}
                onClick={action.onClick}
              >
                {action.label}
              </Button>
            ))}
          </Flex>
        )}
      </Dialog.Content>
    </Dialog.Root>
  );
});

GameDialog.displayName = "GameDialog";

// Pre-configured dialog variants for common use cases

/**
 * Confirmation dialog with Yes/No or OK/Cancel actions
 */
export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: DialogAction["color"];
  isConfirmDisabled?: boolean;
}

export const ConfirmDialog = memo(({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmColor = "blue",
  isConfirmDisabled = false,
}: ConfirmDialogProps) => (
  <GameDialog
    open={open}
    title={title}
    size="sm"
    primaryAction={{
      label: confirmLabel,
      onClick: onConfirm,
      color: confirmColor,
      disabled: isConfirmDisabled,
    }}
    secondaryAction={{
      label: cancelLabel,
      onClick: onCancel,
      variant: "soft",
      color: "gray",
    }}
  >
    <Flex justify="center" style={{ padding: "20px" }}>
      {message}
    </Flex>
  </GameDialog>
));

ConfirmDialog.displayName = "ConfirmDialog";

/**
 * Full-screen game phase dialog (for combat results, end game, etc.)
 */
export interface PhaseDialogProps {
  open: boolean;
  title?: ReactNode;
  children: ReactNode;
  actionLabel: string;
  onAction: () => void;
  actionColor?: DialogAction["color"];
  isActionDisabled?: boolean;
  waitingMessage?: string;
  top?: string;
}

export const PhaseDialog = memo(({
  open,
  title,
  children,
  actionLabel,
  onAction,
  actionColor = "red",
  isActionDisabled = false,
  waitingMessage,
  top = "max(10vh, 100px)",
}: PhaseDialogProps) => (
  <GameDialog
    open={open}
    title={title}
    size="half"
    top={top}
    primaryAction={{
      label: isActionDisabled && waitingMessage ? waitingMessage : actionLabel,
      onClick: onAction,
      color: actionColor,
      highContrast: true,
      disabled: isActionDisabled,
    }}
  >
    {children}
  </GameDialog>
));

PhaseDialog.displayName = "PhaseDialog";

/**
 * Card selection dialog
 */
export interface CardSelectionDialogProps {
  open: boolean;
  title: string;
  children: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  isConfirmDisabled?: boolean;
  selectionCount?: { current: number; required: number };
}

export const CardSelectionDialog = memo(({
  open,
  title,
  children,
  onConfirm,
  onCancel,
  confirmLabel = "Confirm Selection",
  cancelLabel = "Cancel",
  isConfirmDisabled = false,
  selectionCount,
}: CardSelectionDialogProps) => {
  const confirmText = selectionCount
    ? `${confirmLabel} (${selectionCount.current}/${selectionCount.required})`
    : confirmLabel;

  return (
    <GameDialog
      open={open}
      title={title}
      size="xl"
      height="300px"
      primaryAction={{
        label: confirmText,
        onClick: onConfirm,
        variant: "soft",
        color: "gray",
        disabled: isConfirmDisabled,
      }}
      secondaryAction={{
        label: cancelLabel,
        onClick: onCancel,
      }}
    >
      {children}
    </GameDialog>
  );
});

CardSelectionDialog.displayName = "CardSelectionDialog";
