import { useState } from "react";
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

interface Props {
  entityId: string;
  currentMetricIds: Set<string>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (metricIds: string[]) => Promise<void>;
}

export function AddMetricToEntityDialog({ currentMetricIds, open, onOpenChange, onAdd }: Props) {
  const { metrics } = useMetrics();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const availableMetrics = metrics.filter((t) => !currentMetricIds.has(t.id));

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

  async function handleAdd() {
    if (selectedIds.size === 0) return;
    setLoading(true);
    try {
      await onAdd(Array.from(selectedIds));
      toast.success("Metrics added!");
      setSelectedIds(new Set());
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add metrics");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Metric</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Select metrics to enable for this entity.
        </p>

        <div className="space-y-2 mt-2">
          {availableMetrics.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              All available metrics are already added to this entity.
            </p>
          ) : (
            availableMetrics.map((metric) => (
              <div key={metric.id} className="flex items-center gap-2 py-1.5">
                <Checkbox
                  id={`add-metric-${metric.id}`}
                  checked={selectedIds.has(metric.id)}
                  onCheckedChange={() => toggleMetric(metric.id)}
                />
                <Label htmlFor={`add-metric-${metric.id}`} className="text-sm cursor-pointer flex-1">
                  {metric.name}
                </Label>
                {metric.is_system ? (
                  <Badge variant="secondary" className="text-xs">System</Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">Custom</Badge>
                )}
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={loading || selectedIds.size === 0}>
            {loading ? "Adding..." : "Add Selected"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
