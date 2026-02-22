import type { UseQueryResult } from "@tanstack/react-query";
import { State, getCollectionState, getSingleState } from "./state";

export function getQueryCollectionState<T>(
  query: Pick<UseQueryResult<T[]>, "status" | "data">,
): State {
  if (query.status === "pending") return State.PENDING;
  if (query.status === "error") return State.ERROR;
  return getCollectionState(query.data ?? []);
}

export function getQuerySingleState<T>(
  query: Pick<UseQueryResult<T | null>, "status" | "data">,
): State {
  if (query.status === "pending") return State.PENDING;
  if (query.status === "error") return State.ERROR;
  return getSingleState(query.data);
}

export function getQueryPaginatedState<T>(
  query: Pick<UseQueryResult<{ data: T[]; count: number }>, "status" | "data">,
): State {
  if (query.status === "pending") return State.PENDING;
  if (query.status === "error") return State.ERROR;
  return getCollectionState(query.data?.data ?? []);
}
