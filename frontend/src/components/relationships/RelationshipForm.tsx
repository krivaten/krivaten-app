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
import { useEntities } from "@/hooks/useEntities";
import type { RelationshipCreate } from "@/types/relationship";

const COMMON_TYPES = [
  { value: "located_in", label: "Located In" },
  { value: "part_of", label: "Part Of" },
  { value: "parent_of", label: "Parent Of" },
  { value: "manages", label: "Manages" },
  { value: "uses", label: "Uses" },
  { value: "produces", label: "Produces" },
  { value: "owns", label: "Owns" },
  { value: "depends_on", label: "Depends On" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (rel: RelationshipCreate) => Promise<unknown>;
  sourceEntityId: string;
  sourceEntityName: string;
}

export function RelationshipForm({ open, onOpenChange, onSubmit, sourceEntityId, sourceEntityName }: Props) {
  const { entities } = useEntities();
  const [targetId, setTargetId] = useState("");
  const [type, setType] = useState("");
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(false);

  const targetOptions = entities
    .filter((e) => e.id !== sourceEntityId)
    .map((e) => ({
      value: e.id,
      label: e.name,
      description: e.entity_type?.name,
    }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!targetId || !type) return;

    setLoading(true);
    try {
      await onSubmit({
        source_id: sourceEntityId,
        target_id: targetId,
        type,
        label: label.trim() || undefined,
      });
      toast.success("Connection created!");
      setTargetId("");
      setType("");
      setLabel("");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create connection");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Connection</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>From</Label>
            <Input value={sourceEntityName} disabled />
          </div>
          <div className="space-y-2">
            <Label>Relationship Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue placeholder="Select type..." />
              </SelectTrigger>
              <SelectContent>
                {COMMON_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>To</Label>
            <Combobox
              options={targetOptions}
              value={targetId}
              onValueChange={setTargetId}
              placeholder="Select target entity..."
              searchPlaceholder="Search entities..."
              emptyMessage="No entities found."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rel-label">Label (optional)</Label>
            <Input
              id="rel-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. primary, backup"
            />
          </div>
          <Button type="submit" disabled={loading || !targetId || !type} className="w-full">
            {loading ? "Creating..." : "Create Connection"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
