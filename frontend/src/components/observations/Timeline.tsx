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

function formatValue(obs: Observation): string {
  if (obs.value_numeric !== null && obs.value_numeric !== undefined) {
    const unitName = obs.unit?.name;
    return unitName ? `${obs.value_numeric} ${unitName}` : String(obs.value_numeric);
  }
  if (obs.value_text) return obs.value_text;
  if (obs.value_boolean !== null && obs.value_boolean !== undefined) {
    return obs.value_boolean ? "Yes" : "No";
  }
  return "";
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
      {observations.map((obs) => {
        const displayValue = formatValue(obs);
        return (
          <div
            key={obs.id}
            className="flex gap-4 rounded-lg border p-4"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-sm font-medium">
                  {obs.subject?.name || "Unknown"}
                </span>
                {obs.variable && (
                  <Badge variant="outline" className="text-xs">
                    {obs.variable.name}
                  </Badge>
                )}
              </div>
              {displayValue && (
                <p className="text-sm text-muted-foreground">
                  {displayValue}
                </p>
              )}
            </div>
            <div className="text-xs text-muted-foreground whitespace-nowrap">
              {timeAgo(obs.observed_at)}
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
