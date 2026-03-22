import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { Observation } from "@/types/observation";

function formatFieldLabel(code: string): string {
  return code
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatFieldValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value ?? "");
}

interface Props {
  observationId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ObservationDetail({ observationId, open, onOpenChange }: Props) {
  const { session, loading: authLoading } = useAuth();

  const { data: observation, isLoading } = useQuery({
    queryKey: queryKeys.observations.detail(observationId!),
    queryFn: () => api.get<Observation>(`/api/v1/observations/${observationId}`),
    enabled: !authLoading && !!session && !!observationId,
  });

  const entries = Object.entries(observation?.field_values ?? {});

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Observation Details</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Loading...</p>
        ) : observation ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium">{observation.entity?.name || "Unknown"}</span>
              {observation.metric && (
                <Badge variant="outline">{observation.metric.name}</Badge>
              )}
            </div>

            <div className="text-sm text-muted-foreground">
              {new Date(observation.observed_at).toLocaleString()}
            </div>

            {entries.length > 0 && (
              <div className="rounded-lg border p-3 space-y-2">
                {entries.map(([key, val]) => (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{formatFieldLabel(key)}</span>
                    <span className="font-medium">{formatFieldValue(val)}</span>
                  </div>
                ))}
              </div>
            )}

            {observation.notes && (
              <div className="text-sm">
                <span className="text-muted-foreground">Notes: </span>
                <span className="italic">{observation.notes}</span>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Recorded {new Date(observation.created_at).toLocaleString()}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Observation not found.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
