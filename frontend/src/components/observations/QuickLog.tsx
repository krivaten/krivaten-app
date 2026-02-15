import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useEntities } from "@/hooks/useEntities";
import type { Observation, ObservationCreate } from "@/types/observation";

const CATEGORIES = [
  "feeding",
  "sleep",
  "behavior",
  "health",
  "note",
  "soil",
  "planting",
  "harvest",
  "inventory",
  "maintenance",
];

interface Props {
  onSubmit: (observation: ObservationCreate) => Promise<Observation>;
}

export function QuickLog({ onSubmit }: Props) {
  const { entities } = useEntities();
  const [entityId, setEntityId] = useState("");
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!entityId || !category) return;

    setLoading(true);
    try {
      await onSubmit({
        entity_id: entityId,
        category,
        notes: notes || undefined,
      });
      toast.success("Observation logged!");
      setNotes("");
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
            <Select value={entityId} onValueChange={setEntityId}>
              <SelectTrigger>
                <SelectValue placeholder="Entity..." />
              </SelectTrigger>
              <SelectContent>
                {entities.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Category..." />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)..."
            rows={2}
          />
          <Button
            type="submit"
            size="sm"
            disabled={loading || !entityId || !category}
            className="w-full"
          >
            {loading ? "Logging..." : "Log"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
