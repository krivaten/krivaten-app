import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import { toast } from "sonner";
import { useEntities } from "@/hooks/useEntities";
import { useTrackers, useTracker } from "@/hooks/useTrackers";
import { TrackerFieldInput } from "./TrackerFieldInput";
import type { ObservationCreate } from "@/types/observation";

interface BatchRow {
  entityId: string;
  fieldValues: Record<string, unknown>;
}

function emptyRow(): BatchRow {
  return { entityId: "", fieldValues: {} };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  onBatchSubmit: (observations: ObservationCreate[]) => Promise<unknown>;
}

export function BatchObservationForm({ open, onOpenChange, onSuccess, onBatchSubmit }: Props) {
  const { entities } = useEntities();
  const { trackers } = useTrackers();
  const [trackerId, setTrackerId] = useState("");
  const [observedAt, setObservedAt] = useState("");
  const [rows, setRows] = useState<BatchRow[]>([emptyRow()]);
  const [loading, setLoading] = useState(false);

  const { tracker: selectedTracker } = useTracker(trackerId);

  // Reset rows when tracker changes
  useEffect(() => {
    setRows([emptyRow()]);
  }, [trackerId]);

  const entityOptions = entities.map((e) => ({
    value: e.id,
    label: e.name,
    description: e.entity_type?.name,
  }));

  const sortedFields = (selectedTracker?.fields ?? []).sort(
    (a, b) => a.position - b.position,
  );

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  function updateRowEntity(index: number, entityId: string) {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, entityId } : row)),
    );
  }

  function updateRowField(index: number, fieldCode: string, value: unknown) {
    setRows((prev) =>
      prev.map((row, i) =>
        i === index
          ? { ...row, fieldValues: { ...row.fieldValues, [fieldCode]: value } }
          : row,
      ),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validRows = rows.filter((r) => r.entityId);
    if (validRows.length === 0) {
      toast.error("Add at least one complete row");
      return;
    }

    setLoading(true);
    try {
      const observations: ObservationCreate[] = validRows.map((row) => {
        const cleanValues: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(row.fieldValues)) {
          if (val !== undefined && val !== null && val !== "") {
            cleanValues[key] = val;
          }
        }
        return {
          entity_id: row.entityId,
          tracker_id: trackerId,
          field_values: cleanValues,
          observed_at: observedAt || undefined,
        };
      });

      await onBatchSubmit(observations);
      toast.success(
        `${observations.length} observation${observations.length !== 1 ? "s" : ""} logged!`,
      );
      setRows([emptyRow()]);
      setObservedAt("");
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to log observations",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Batch Log Observations</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Tracker (applies to all rows)</Label>
            <Select value={trackerId} onValueChange={setTrackerId}>
              <SelectTrigger>
                <SelectValue placeholder="Select tracker..." />
              </SelectTrigger>
              <SelectContent>
                {trackers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {trackerId && (
            <div className="space-y-2">
              <Label htmlFor="batch-observed-at">Date & Time for all rows (optional)</Label>
              <Input
                id="batch-observed-at"
                type="datetime-local"
                value={observedAt}
                onChange={(e) => setObservedAt(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to use the current time. Applies to all rows.
              </p>
            </div>
          )}

          {trackerId && (
            <div className="space-y-4">
              {rows.map((row, i) => (
                <div key={i} className="rounded-lg border p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">
                      Row {i + 1}
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => removeRow(i)}
                      disabled={rows.length === 1}
                    >
                      Remove
                    </Button>
                  </div>
                  <Combobox
                    options={entityOptions}
                    value={row.entityId}
                    onValueChange={(v) => updateRowEntity(i, v)}
                    placeholder="Entity..."
                    searchPlaceholder="Search..."
                    emptyMessage="None found."
                  />
                  {sortedFields.map((field) => (
                    <TrackerFieldInput
                      key={field.id}
                      field={field}
                      value={row.fieldValues[field.code]}
                      onChange={(val) => updateRowField(i, field.code, val)}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}

          {trackerId && (
            <Button type="button" variant="outline" size="sm" onClick={addRow}>
              Add Row
            </Button>
          )}

          <Button
            type="submit"
            disabled={
              loading || !trackerId || rows.every((r) => !r.entityId)
            }
            className="w-full"
          >
            {loading
              ? "Logging..."
              : `Submit ${rows.filter((r) => r.entityId).length} Observation${rows.filter((r) => r.entityId).length !== 1 ? "s" : ""}`}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
