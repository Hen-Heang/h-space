// Minimal, single-purpose feature-flag helper — env-driven, no runtime
// toggle/admin override. Add another `isXEnabled()` export here if a second
// flag is ever needed; don't generalize into a registry until there's a
// second real case.

/**
 * Money Flow integration preview card (see docs/money-flow-integration.md).
 * Off by default — this repo has no token-exchange/encryption
 * infrastructure yet, so the card only ever shows mocked example data, and
 * even that stays hidden unless explicitly opted into.
 */
export const isMoneyFlowIntegrationEnabled = (): boolean =>
  process.env.NEXT_PUBLIC_FEATURE_MONEY_FLOW === "true"

/**
 * The Integrations settings section (/settings/integrations) and its Google
 * Calendar card. Off by default until Plan ships.
 *
 * The card's whole value proposition is showing your real calendar beside
 * Hengo tasks — but Tasks and Calendar live in the Plan section, and V2's
 * five-item nav had no entry for it. Asking for third-party calendar access
 * to populate a page with no front door is a bad trade, so the section is
 * hidden rather than removed. Plan now has a nav entry (the hub nav's Goals
 * tab and desktop sidebar section, 2026-10-22), so turning this on is now an
 * open product decision rather than blocked.
 *
 * Hiding never strands an existing connection: the page still renders for a
 * learner who is already connected, so "Disconnect" is always reachable.
 */
export const isCalendarIntegrationsEnabled = (): boolean =>
  process.env.NEXT_PUBLIC_FEATURE_INTEGRATIONS === "true"
