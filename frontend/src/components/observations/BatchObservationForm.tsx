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
import { Combobox } from "@/components/ui/combobox";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useEntities } from "@/hooks/useEntities";
import { useVocabularies } from "@/hooks/useVocabularies";
import type { ObservationCreate } from "@/types/observation";

interface BatchRow {
  subjectId: string;
  variableId: string;
  value: string;
  unitId: string;
}

function emptyRow(): BatchRow {
  return { subjectId: "", variableId: "", value: "", unitId: "" };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function BatchObservationForm({ open, onOpenChange, onSuccess }: Props) {
  const { entities } = useEntities();
  const { vocabularies: variables } = useVocabularies({ type: "variable" });
  const { vocabularies: units } = useVocabularies({ type: "unit" });
  const [rows, setRows] = useState<BatchRow[]>([emptyRow()]);
  const [loading, setLoading] = useState(false);

  const entityOptions = entities.map((e) => ({
    value: e.id,
    label: e.name,
    description: e.entity_type?.name,
  }));

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  function updateRow(index: number, field: keyof BatchRow, value: string) {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validRows = rows.filter((r) => r.subjectId && r.variableId);
    if (validRows.length === 0) {
      toast.error("Add at least one complete row");
      return;
    }

    setLoading(true);
    try {
      const observations: ObservationCreate[] = validRows.map((row) => {
        const obs: ObservationCreate = {
          subject_id: row.subjectId,
          variable_id: row.variableId,
        };

        const numValue = Number(row.value);
        if (row.value && !isNaN(numValue)) {
          obs.value_numeric = numValue;
        } else if (row.value) {
          obs.value_text = row.value;
        }

        if (row.unitId) obs.unit_id = row.unitId;

        return obs;
      });

      await api.post("/api/v1/observations/batch", { observations });
      toast.success(`${observations.length} observation${observations.length !== 1 ? "s" : ""} logged!`);
      setRows([emptyRow()]);
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to log observations");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Batch Log Observations</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            {rows.map((row, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-2 items-end">
                {i === 0 && (
                  <>
                    <Label className="col-span-1 text-xs">Subject</Label>
                    <Label className="col-span-1 text-xs">Variable</Label>
                    <Label className="col-span-1 text-xs">Value</Label>
                    <span />
                    <span />
                  </>
                )}
                <Combobox
                  options={entityOptions}
                  value={row.subjectId}
                  onValueChange={(v) => updateRow(i, "subjectId", v)}
                  placeholder="Entity..."
                  searchPlaceholder="Search..."
                  emptyMessage="None found."
                />
                <Select value={row.variableId} onValueChange={(v) => updateRow(i, "variableId", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Variable..." />
                  </SelectTrigger>
                  <SelectContent>
                    {variables.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={row.value}
                  onChange={(e) => updateRow(i, "value", e.target.value)}
                  placeholder="Value..."
                />
                <Select value={row.unitId} onValueChange={(v) => updateRow(i, "unitId", v)}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue placeholder="Unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            ))}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addRow}>
            Add Row
          </Button>
          <Button
            type="submit"
            disabled={loading || rows.every((r) => !r.subjectId || !r.variableId)}
            className="w-full"
          >
            {loading ? "Logging..." : `Submit ${rows.filter((r) => r.subjectId && r.variableId).length} Observation${rows.filter((r) => r.subjectId && r.variableId).length !== 1 ? "s" : ""}`}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
