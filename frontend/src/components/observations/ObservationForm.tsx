import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { useEntityTrackers } from "@/hooks/useEntityTrackers";
import { useTracker } from "@/hooks/useTrackers";
import { TrackerFieldInput } from "./TrackerFieldInput";
import type { Observation, ObservationCreate } from "@/types/observation";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (observation: ObservationCreate) => Promise<Observation>;
  defaultEntityId?: string;
}

export function ObservationForm({ open, onOpenChange, onSubmit, defaultEntityId }: Props) {
  const { entities } = useEntities();
  const [entityId, setEntityId] = useState(defaultEntityId ?? "");
  const [trackerId, setTrackerId] = useState("");
  const [fieldValues, setFieldValues] = useState<Record<string, unknown>>({});
  const [notes, setNotes] = useState("");
  const [observedAt, setObservedAt] = useState("");
  const [loading, setLoading] = useState(false);

  const { enabledTrackers } = useEntityTrackers(entityId);
  const { tracker: selectedTracker } = useTracker(trackerId);

  // Reset tracker when entity changes
  useEffect(() => {
    setTrackerId("");
    setFieldValues({});
  }, [entityId]);

  // Reset field values when tracker changes
  useEffect(() => {
    setFieldValues({});
  }, [trackerId]);

  const entityOptions = entities.map((e) => ({
    value: e.id,
    label: e.name,
    description: e.entity_type?.name,
  }));

  const sortedFields = (selectedTracker?.fields ?? []).sort(
    (a, b) => a.position - b.position,
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!entityId || !trackerId) return;

    // Validate required fields
    const missingRequired = sortedFields
      .filter((f) => f.is_required)
      .filter((f) => {
        const val = fieldValues[f.code];
        return val === undefined || val === null || val === "";
      });

    if (missingRequired.length > 0) {
      toast.error(`Missing required fields: ${missingRequired.map((f) => f.name).join(", ")}`);
      return;
    }

    setLoading(true);
    try {
      // Clean field values - remove empty/undefined entries
      const cleanValues: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(fieldValues)) {
        if (val !== undefined && val !== null && val !== "") {
          cleanValues[key] = val;
        }
      }

      await onSubmit({
        entity_id: entityId,
        tracker_id: trackerId,
        field_values: cleanValues,
        notes: notes.trim() || undefined,
        observed_at: observedAt || undefined,
      });
      toast.success("Observation logged!");
      setFieldValues({});
      setNotes("");
      setObservedAt("");
      setTrackerId("");
      if (!defaultEntityId) setEntityId("");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to log observation");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log Observation</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Entity</Label>
            <Combobox
              options={entityOptions}
              value={entityId}
              onValueChange={setEntityId}
              placeholder="Select entity..."
              searchPlaceholder="Search entities..."
              emptyMessage="No entities found."
              disabled={!!defaultEntityId}
            />
          </div>

          {entityId && (
            <div className="space-y-2">
              <Label>Tracker</Label>
              <Select value={trackerId} onValueChange={setTrackerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select tracker..." />
                </SelectTrigger>
                <SelectContent>
                  {enabledTrackers.map((et) => (
                    <SelectItem key={et.tracker.id} value={et.tracker.id}>
                      {et.tracker.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedTracker && sortedFields.length > 0 && (
            <div className="space-y-3 rounded-lg border p-3">
              {sortedFields.map((field) => (
                <TrackerFieldInput
                  key={field.id}
                  field={field}
                  value={fieldValues[field.code]}
                  onChange={(val) =>
                    setFieldValues((prev) => ({ ...prev, [field.code]: val }))
                  }
                />
              ))}
            </div>
          )}

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observed-at">Date & Time (optional)</Label>
            <Input
              id="observed-at"
              type="datetime-local"
              value={observedAt}
              onChange={(e) => setObservedAt(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to use the current time.
            </p>
          </div>

          <Button
            type="submit"
            disabled={loading || !entityId || !trackerId}
            className="w-full"
          >
            {loading ? "Logging..." : "Log Observation"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
