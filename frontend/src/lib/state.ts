/**
 * An enum representing the possible states of UI features
 *
 * These states help design consistent user experiences across different
 * scenarios like loading, empty states, errors, and varying data quantities.
 */
export enum State {
  /**
   * The starting state before any user interaction or data loading.
   * Example: A search page before the user has entered a query.
   */
  INITIAL = "INITIAL",

  /**
   * An asynchronous operation is in progress (loading, saving, etc.).
   * Example: Showing a spinner while fetching search results.
   */
  PENDING = "PENDING",

  /**
   * An asynchronous operation has completed successfully.
   * Note: This typically transitions to NONE, ONE, SOME, or MANY based on results.
   */
  DONE = "DONE",

  /**
   * No data/items are available to display.
   * Example: "No search results found" or empty shopping cart.
   */
  NONE = "NONE",

  /**
   * Exactly one item is present.
   * Example: Single search result or one item in cart.
   */
  ONE = "ONE",

  /**
   * A small number of items are present (typically 2-10).
   * UI consideration: Simple list layout, no pagination needed.
   */
  SOME = "SOME",

  /**
   * A large number of items are present (typically 10+).
   * UI consideration: Requires pagination, virtualization, or load-more patterns.
   */
  MANY = "MANY",

  /**
   * An error has occurred (validation, network, server, etc.).
   * Example: Form validation errors, failed API requests.
   */
  ERROR = "ERROR",

  /**
   * An operation completed successfully with user feedback needed.
   * Example: "Profile saved successfully" confirmation message.
   */
  SUCCESS = "SUCCESS",
}

const MANY_THRESHOLD = 10;

export function getCollectionState(items: unknown[]): State {
  if (items.length === 0) return State.NONE;
  if (items.length === 1) return State.ONE;
  if (items.length < MANY_THRESHOLD) return State.SOME;
  return State.MANY;
}

export function getSingleState(item: unknown | null | undefined): State {
  return item ? State.ONE : State.NONE;
}
