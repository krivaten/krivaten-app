import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  onSubmit: (observation: ObservationCreate) => Promise<Observation>;
}

export function QuickLog({ onSubmit }: Props) {
  const { entities } = useEntities();
  const { vocabularies: variables } = useVocabularies({ type: "variable" });
  const [subjectId, setSubjectId] = useState("");
  const [variableId, setVariableId] = useState("");
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subjectId || !variableId) return;

    setLoading(true);
    try {
      const observation: ObservationCreate = {
        subject_id: subjectId,
        variable_id: variableId,
      };

      const numValue = Number(value);
      if (value && !isNaN(numValue)) {
        observation.value_numeric = numValue;
      } else if (value) {
        observation.value_text = value;
      }

      await onSubmit(observation);
      toast.success("Observation logged!");
      setValue("");
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
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Subject..." />
              </SelectTrigger>
              <SelectContent>
                {entities.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={variableId} onValueChange={setVariableId}>
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
          </div>
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Value (number or text)..."
          />
          <Button
            type="submit"
            size="sm"
            disabled={loading || !subjectId || !variableId}
            className="w-full"
          >
            {loading ? "Logging..." : "Log"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
