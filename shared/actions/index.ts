/**
 * Actions Module
 *
 * Central export for the action system.
 * Import this module to access the action registry and types.
 */

// Types
export * from "./input-types";
export * from "./action-params";
export * from "./action-registry";

// Core action registration (auto-registers on import)
export { registerCoreActions } from "./core-actions";
