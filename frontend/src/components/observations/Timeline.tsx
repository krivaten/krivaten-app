import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { State } from "@/lib/state";
import type { Observation } from "@/types/observation";

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;

  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return new Date(dateStr).toLocaleDateString();
}

function formatFieldValue(key: string, value: unknown): string {
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  return String(value ?? "");
}

function formatFieldLabel(code: string): string {
  return code
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

interface Props {
  observations: Observation[];
  state: State;
  loadingMore?: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onDelete?: (id: string) => Promise<void>;
  currentUserId?: string;
}

export function Timeline({ observations, state, loadingMore, hasMore, onLoadMore, onDelete, currentUserId }: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!onDelete || !confirm("Delete this observation? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      await onDelete(id);
    } finally {
      setDeletingId(null);
    }
  }

  if (state === State.INITIAL || state === State.PENDING) {
    return <div className="text-muted-foreground py-8 text-center">Loading observations...</div>;
  }

  if (state === State.NONE) {
    return <div className="text-muted-foreground py-8 text-center">No observations yet.</div>;
  }

  return (
    <div className="space-y-3">
      {observations.map((obs) => {
        const isOwn = currentUserId && obs.observer_id === currentUserId;
        const entries = Object.entries(obs.field_values ?? {});

        return (
          <div
            key={obs.id}
            className="flex gap-4 rounded-lg border p-4"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-sm font-medium">
                  {obs.entity?.name || "Unknown"}
                </span>
                {obs.tracker && (
                  <Badge variant="outline" className="text-xs">
                    {obs.tracker.name}
                  </Badge>
                )}
                {isOwn && (
                  <span className="text-xs text-muted-foreground">by you</span>
                )}
              </div>
              {entries.length > 0 && (
                <div className="text-sm text-muted-foreground space-y-0.5">
                  {entries.map(([key, val]) => (
                    <div key={key}>
                      <span className="font-medium">{formatFieldLabel(key)}:</span>{" "}
                      {formatFieldValue(key, val)}
                    </div>
                  ))}
                </div>
              )}
              {obs.notes && (
                <p className="text-sm text-muted-foreground mt-1 italic">
                  {obs.notes}
                </p>
              )}
            </div>
            <div className="flex items-start gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {timeAgo(obs.observed_at)}
              </span>
              {onDelete && (
                <Button
                  variant="ghost"
                  size="xs"
                  className="text-xs text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(obs.id)}
                  disabled={deletingId === obs.id}
                >
                  {deletingId === obs.id ? "..." : "Delete"}
                </Button>
              )}
            </div>
          </div>
        );
      })}

      {hasMore && (
        <div className="text-center pt-2">
          <Button variant="outline" size="sm" onClick={onLoadMore} disabled={loadingMore}>
            {loadingMore ? "Loading..." : "Load More"}
          </Button>
        </div>
      )}
    </div>
  );
}
