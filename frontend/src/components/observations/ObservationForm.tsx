import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useEntities } from "@/hooks/useEntities";
import { useVocabularies } from "@/hooks/useVocabularies";
import type { Observation, ObservationCreate } from "@/types/observation";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (observation: ObservationCreate) => Promise<Observation>;
  defaultSubjectId?: string;
}

export function ObservationForm({ open, onOpenChange, onSubmit, defaultSubjectId }: Props) {
  const { entities } = useEntities();
  const { vocabularies: variables } = useVocabularies({ type: "variable" });
  const { vocabularies: units } = useVocabularies({ type: "unit" });
  const [subjectId, setSubjectId] = useState(defaultSubjectId ?? "");
  const [variableId, setVariableId] = useState("");
  const [valueType, setValueType] = useState<"numeric" | "text">("numeric");
  const [valueNumeric, setValueNumeric] = useState("");
  const [valueText, setValueText] = useState("");
  const [unitId, setUnitId] = useState("");
  const [observedAt, setObservedAt] = useState(
    new Date().toISOString().slice(0, 16),
  );
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subjectId || !variableId) return;

    setLoading(true);
    try {
      const observation: ObservationCreate = {
        subject_id: subjectId,
        variable_id: variableId,
        observed_at: new Date(observedAt).toISOString(),
      };

      if (valueType === "numeric" && valueNumeric) {
        observation.value_numeric = Number(valueNumeric);
      } else if (valueType === "text" && valueText) {
        observation.value_text = valueText;
      }

      if (unitId) {
        observation.unit_id = unitId;
      }

      await onSubmit(observation);
      toast.success("Observation logged!");
      setVariableId("");
      setValueNumeric("");
      setValueText("");
      setUnitId("");
      setObservedAt(new Date().toISOString().slice(0, 16));
      if (!defaultSubjectId) setSubjectId("");
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
            <Label>Subject</Label>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Select entity..." />
              </SelectTrigger>
              <SelectContent>
                {entities.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name} ({e.entity_type?.name || "Unknown"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Variable</Label>
            <Select value={variableId} onValueChange={setVariableId}>
              <SelectTrigger>
                <SelectValue placeholder="Select variable..." />
              </SelectTrigger>
              <SelectContent>
                {variables.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Value Type</Label>
            <Select value={valueType} onValueChange={(v) => setValueType(v as "numeric" | "text")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="numeric">Number</SelectItem>
                <SelectItem value="text">Text</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {valueType === "numeric" ? (
            <div className="space-y-2">
              <Label htmlFor="obs-value-numeric">Value</Label>
              <Input
                id="obs-value-numeric"
                type="number"
                step="any"
                value={valueNumeric}
                onChange={(e) => setValueNumeric(e.target.value)}
                placeholder="e.g. 22.5"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="obs-value-text">Value</Label>
              <Input
                id="obs-value-text"
                value={valueText}
                onChange={(e) => setValueText(e.target.value)}
                placeholder="e.g. Healthy, Good condition"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label>Unit (optional)</Label>
            <Select value={unitId} onValueChange={setUnitId}>
              <SelectTrigger>
                <SelectValue placeholder="Select unit..." />
              </SelectTrigger>
              <SelectContent>
                {units.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="obs-observed-at">Observed At</Label>
            <Input
              id="obs-observed-at"
              type="datetime-local"
              value={observedAt}
              onChange={(e) => setObservedAt(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={loading || !subjectId || !variableId} className="w-full">
            {loading ? "Logging..." : "Log Observation"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
