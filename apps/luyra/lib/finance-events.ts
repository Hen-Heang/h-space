/** Cross-component signal for "a transaction was created/edited/deleted
 * somewhere" so client-fetched views (overview, list) know to refetch without
 * a shared store. Fine-grained payloads aren't needed — every listener just
 * reloads its own data. */
const TRANSACTION_CHANGED_EVENT = "luyra:transaction-changed";

export function emitTransactionChanged(): void {
  window.dispatchEvent(new Event(TRANSACTION_CHANGED_EVENT));
}

export function onTransactionChanged(handler: () => void): () => void {
  window.addEventListener(TRANSACTION_CHANGED_EVENT, handler);
  return () => window.removeEventListener(TRANSACTION_CHANGED_EVENT, handler);
}
