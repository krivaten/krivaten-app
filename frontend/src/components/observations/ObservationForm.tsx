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
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (observation: ObservationCreate) => Promise<Observation>;
  defaultEntityId?: string;
}

export function ObservationForm({ open, onOpenChange, onSubmit, defaultEntityId }: Props) {
  const { entities } = useEntities();
  const [entityId, setEntityId] = useState(defaultEntityId ?? "");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [observedAt, setObservedAt] = useState(
    new Date().toISOString().slice(0, 16),
  );
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");
  const [data, setData] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!entityId || !category) return;

    setLoading(true);
    try {
      let parsedData: Record<string, unknown> = {};
      if (data.trim()) {
        parsedData = JSON.parse(data);
      }

      await onSubmit({
        entity_id: entityId,
        category,
        subcategory: subcategory || undefined,
        observed_at: new Date(observedAt).toISOString(),
        notes: notes || undefined,
        tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
        data: Object.keys(parsedData).length > 0 ? parsedData : undefined,
      });
      toast.success("Observation logged!");
      setCategory("");
      setSubcategory("");
      setObservedAt(new Date().toISOString().slice(0, 16));
      setNotes("");
      setTags("");
      setData("");
      if (!defaultEntityId) setEntityId("");
      onOpenChange(false);
    } catch (err) {
      if (err instanceof SyntaxError) {
        toast.error("Invalid JSON in data field");
      } else {
        toast.error(err instanceof Error ? err.message : "Failed to log observation");
      }
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
            <Select value={entityId} onValueChange={setEntityId}>
              <SelectTrigger>
                <SelectValue placeholder="Select entity..." />
              </SelectTrigger>
              <SelectContent>
                {entities.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name} ({e.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select category..." />
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
          <div className="space-y-2">
            <Label htmlFor="obs-subcategory">Subcategory (optional)</Label>
            <Input
              id="obs-subcategory"
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
              placeholder="e.g. breakfast, weekly check"
            />
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
          <div className="space-y-2">
            <Label htmlFor="obs-notes">Notes</Label>
            <Textarea
              id="obs-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What did you observe?"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="obs-tags">Tags (comma-separated)</Label>
            <Input
              id="obs-tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. urgent, follow-up, seasonal"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="obs-data">Data (JSON, optional)</Label>
            <Textarea
              id="obs-data"
              value={data}
              onChange={(e) => setData(e.target.value)}
              placeholder='{"temperature": 72, "humidity": "high"}'
              rows={2}
            />
          </div>
          <Button type="submit" disabled={loading || !entityId || !category} className="w-full">
            {loading ? "Logging..." : "Log Observation"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
