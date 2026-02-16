import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { State } from "@/lib/state";
import type { Observation } from "@/types/observation";

const TYPE_COLORS: Record<string, string> = {
  person: "bg-blue-100 text-blue-800",
  location: "bg-green-100 text-green-800",
  plant: "bg-emerald-100 text-emerald-800",
  animal: "bg-amber-100 text-amber-800",
  project: "bg-purple-100 text-purple-800",
  equipment: "bg-slate-100 text-slate-800",
  supply: "bg-orange-100 text-orange-800",
  process: "bg-pink-100 text-pink-800",
};

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

interface Props {
  observations: Observation[];
  state: State;
  loadingMore?: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

export function Timeline({ observations, state, loadingMore, hasMore, onLoadMore }: Props) {
  if (state === State.INITIAL || state === State.PENDING) {
    return <div className="text-muted-foreground py-8 text-center">Loading observations...</div>;
  }

  if (state === State.NONE) {
    return <div className="text-muted-foreground py-8 text-center">No observations yet.</div>;
  }

  return (
    <div className="space-y-3">
      {observations.map((obs) => (
        <div
          key={obs.id}
          className="flex gap-4 rounded-lg border p-4"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-sm font-medium">
                {obs.entity?.name || "Unknown"}
              </span>
              {obs.entity?.type && (
                <Badge
                  variant="secondary"
                  className={`text-xs ${TYPE_COLORS[obs.entity.type] || ""}`}
                >
                  {obs.entity.type}
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">
                {obs.category}
              </Badge>
              {obs.subcategory && (
                <span className="text-xs text-muted-foreground">/ {obs.subcategory}</span>
              )}
            </div>
            {obs.notes && (
              <p className="text-sm text-muted-foreground truncate">
                {obs.notes.length > 100 ? `${obs.notes.slice(0, 100)}...` : obs.notes}
              </p>
            )}
            {obs.tags && obs.tags.length > 0 && (
              <div className="flex gap-1 mt-1">
                {obs.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div className="text-xs text-muted-foreground whitespace-nowrap">
            {timeAgo(obs.observed_at)}
          </div>
        </div>
      ))}

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
