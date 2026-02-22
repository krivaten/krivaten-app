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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useVocabularies } from "@/hooks/useVocabularies";
import type { Observation, ObservationCreate } from "@/types/observation";

type ValueType = "numeric" | "text" | "boolean" | "json";

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
  const { vocabularies: qualityFlags } = useVocabularies({ type: "quality_flag" });
  const { vocabularies: methods } = useVocabularies({ type: "method" });
  const [subjectId, setSubjectId] = useState(defaultSubjectId ?? "");
  const [variableId, setVariableId] = useState("");
  const [valueType, setValueType] = useState<ValueType>("numeric");
  const [valueNumeric, setValueNumeric] = useState("");
  const [valueText, setValueText] = useState("");
  const [valueBoolean, setValueBoolean] = useState(false);
  const [valueJson, setValueJson] = useState("");
  const [unitId, setUnitId] = useState("");
  const [qualityFlag, setQualityFlag] = useState("");
  const [methodId, setMethodId] = useState("");
  const [observedAt, setObservedAt] = useState(
    new Date().toISOString().slice(0, 16),
  );
  const [loading, setLoading] = useState(false);

  const entityOptions = entities.map((e) => ({
    value: e.id,
    label: e.name,
    description: e.entity_type?.name,
  }));

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
      } else if (valueType === "boolean") {
        observation.value_boolean = valueBoolean;
      } else if (valueType === "json" && valueJson) {
        try {
          observation.value_json = JSON.parse(valueJson);
        } catch {
          toast.error("Invalid JSON value");
          setLoading(false);
          return;
        }
      }

      if (unitId) observation.unit_id = unitId;
      if (qualityFlag) observation.quality_flag = qualityFlag;
      if (methodId) observation.method_id = methodId;

      await onSubmit(observation);
      toast.success("Observation logged!");
      setVariableId("");
      setValueNumeric("");
      setValueText("");
      setValueBoolean(false);
      setValueJson("");
      setUnitId("");
      setQualityFlag("");
      setMethodId("");
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
            <Combobox
              options={entityOptions}
              value={subjectId}
              onValueChange={setSubjectId}
              placeholder="Select entity..."
              searchPlaceholder="Search entities..."
              emptyMessage="No entities found."
              disabled={!!defaultSubjectId}
            />
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
            <Select value={valueType} onValueChange={(v) => setValueType(v as ValueType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="numeric">Number</SelectItem>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="boolean">Boolean</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {valueType === "numeric" && (
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
          )}
          {valueType === "text" && (
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
          {valueType === "boolean" && (
            <div className="flex items-center gap-2 py-2">
              <Checkbox
                id="obs-value-boolean"
                checked={valueBoolean}
                onCheckedChange={(checked) => setValueBoolean(checked === true)}
              />
              <Label htmlFor="obs-value-boolean">Value is true</Label>
            </div>
          )}
          {valueType === "json" && (
            <div className="space-y-2">
              <Label htmlFor="obs-value-json">JSON Value</Label>
              <Textarea
                id="obs-value-json"
                value={valueJson}
                onChange={(e) => setValueJson(e.target.value)}
                placeholder='{"key": "value"}'
                rows={4}
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
          {qualityFlags.length > 0 && (
            <div className="space-y-2">
              <Label>Quality Flag (optional)</Label>
              <Select value={qualityFlag} onValueChange={setQualityFlag}>
                <SelectTrigger>
                  <SelectValue placeholder="Select quality flag..." />
                </SelectTrigger>
                <SelectContent>
                  {qualityFlags.map((qf) => (
                    <SelectItem key={qf.id} value={qf.code}>
                      {qf.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {methods.length > 0 && (
            <div className="space-y-2">
              <Label>Method (optional)</Label>
              <Select value={methodId} onValueChange={setMethodId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select method..." />
                </SelectTrigger>
                <SelectContent>
                  {methods.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
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
