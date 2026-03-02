import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { toast } from "sonner";
import { useEntities } from "@/hooks/useEntities";
import { useEntityTrackers } from "@/hooks/useEntityTrackers";
import { useTracker } from "@/hooks/useTrackers";
import { TrackerFieldInput } from "./TrackerFieldInput";
import type { Observation, ObservationCreate } from "@/types/observation";

interface Props {
  onSubmit: (observation: ObservationCreate) => Promise<Observation>;
}

export function QuickLog({ onSubmit }: Props) {
  const { entities } = useEntities();
  const [entityId, setEntityId] = useState("");
  const [trackerId, setTrackerId] = useState("");
  const [fieldValues, setFieldValues] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(false);

  const { enabledTrackers } = useEntityTrackers(entityId);
  const { tracker: selectedTracker } = useTracker(trackerId);

  useEffect(() => {
    setTrackerId("");
    setFieldValues({});
  }, [entityId]);

  useEffect(() => {
    setFieldValues({});
  }, [trackerId]);

  const entityOptions = entities.map((e) => ({
    value: e.id,
    label: e.name,
    description: e.entity_type?.name,
  }));

  // Show only required fields for quick log
  const requiredFields = (selectedTracker?.fields ?? [])
    .filter((f) => f.is_required)
    .sort((a, b) => a.position - b.position);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!entityId || !trackerId) return;

    setLoading(true);
    try {
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
      });
      toast.success("Observation logged!");
      setFieldValues({});
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to log observation");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Quick Log</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Combobox
              options={entityOptions}
              value={entityId}
              onValueChange={setEntityId}
              placeholder="Entity..."
              searchPlaceholder="Search entities..."
              emptyMessage="No entities found."
            />
            <Select value={trackerId} onValueChange={setTrackerId}>
              <SelectTrigger>
                <SelectValue placeholder="Tracker..." />
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

          {requiredFields.length > 0 && (
            <div className="space-y-2">
              {requiredFields.map((field) => (
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

          <Button
            type="submit"
            size="sm"
            disabled={loading || !entityId || !trackerId}
            className="w-full"
          >
            {loading ? "Logging..." : "Log"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
