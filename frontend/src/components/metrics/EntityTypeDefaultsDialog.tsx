import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useMetrics } from "@/hooks/useMetrics";
import { useEntityTypeMetrics } from "@/hooks/useEntityTypeMetrics";
import { State } from "@/lib/state";

interface Props {
  entityTypeId: string;
  entityTypeName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EntityTypeDefaultsDialog({ entityTypeId, entityTypeName, open, onOpenChange }: Props) {
  const { metrics } = useMetrics();
  const { associations, state, updateAssociations } = useEntityTypeMetrics(entityTypeId);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // System default metric IDs (cannot be unchecked)
  const systemDefaultIds = new Set(
    associations.filter((a) => a.is_system_default).map((a) => a.metric.id),
  );

  // Non-system associations (tenant-managed)
  const tenantAssociationIds = new Set(
    associations.filter((a) => !a.is_system_default).map((a) => a.metric.id),
  );

  // Initialize selected IDs when associations load
  useEffect(() => {
    if (open) {
      setSelectedIds(new Set(tenantAssociationIds));
    }
  }, [open, state]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleMetric(metricId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(metricId)) {
        next.delete(metricId);
      } else {
        next.add(metricId);
      }
      return next;
    });
  }

  async function handleSave() {
    setLoading(true);
    try {
      const metricList = Array.from(selectedIds).map((id, i) => ({
        metric_id: id,
        position: i,
      }));
      await updateAssociations(metricList);
      toast.success("Defaults updated!");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update defaults");
    } finally {
      setLoading(false);
    }
  }

  // All metrics, excluding system defaults (those are shown separately)
  const availableMetrics = metrics.filter((t) => !systemDefaultIds.has(t.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage {entityTypeName} Defaults</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Choose which metrics are defaults for all {entityTypeName.toLowerCase()} entities.
          System defaults cannot be removed.
        </p>

        {state === State.PENDING && (
          <div className="text-muted-foreground py-4 text-center text-sm">Loading...</div>
        )}

        <div className="space-y-2 mt-2">
          {/* System defaults (read-only) */}
          {associations
            .filter((a) => a.is_system_default)
            .map((a) => (
              <div key={a.metric.id} className="flex items-center gap-2 py-1.5 opacity-60">
                <Checkbox checked disabled />
                <Label className="text-sm">{a.metric.name}</Label>
                <Badge variant="secondary" className="text-xs">System</Badge>
              </div>
            ))}

          {/* Available metrics (checkable) */}
          {availableMetrics.map((metric) => (
            <div key={metric.id} className="flex items-center gap-2 py-1.5">
              <Checkbox
                id={`default-${metric.id}`}
                checked={selectedIds.has(metric.id)}
                onCheckedChange={() => toggleMetric(metric.id)}
              />
              <Label htmlFor={`default-${metric.id}`} className="text-sm cursor-pointer">
                {metric.name}
              </Label>
              {metric.is_system ? (
                <Badge variant="secondary" className="text-xs">System</Badge>
              ) : (
                <Badge variant="outline" className="text-xs">Custom</Badge>
              )}
            </div>
          ))}

          {availableMetrics.length === 0 && associations.length > 0 && (
            <p className="text-sm text-muted-foreground">
              No additional metrics available. Create a custom metric first.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save Defaults"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
