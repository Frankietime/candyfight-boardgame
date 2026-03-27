/**
 * Client Actions Module
 *
 * Central export for client-side action handling.
 */

export * from "./input-handlers";
export * from "./action-orchestrator";

// Import handlers to trigger registration
import "../components/input-handlers/CardSelectionHandler";
