import { useState, useEffect } from "react";
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
import type { Relationship, RelationshipCreate } from "@/types/relationship";

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
  relationship?: Relationship;
}

export function RelationshipForm({ open, onOpenChange, onSubmit, sourceEntityId, sourceEntityName, relationship }: Props) {
  const { entities } = useEntities();
  const [targetId, setTargetId] = useState("");
  const [type, setType] = useState("");
  const [label, setLabel] = useState("");
  const [weight, setWeight] = useState<string>("");
  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const isEdit = !!relationship;

  useEffect(() => {
    if (open && relationship) {
      setTargetId(relationship.target_id);
      setType(relationship.type);
      setLabel(relationship.label || "");
      setWeight(relationship.weight !== undefined && relationship.weight !== 1 ? String(relationship.weight) : "");
      setValidFrom(relationship.valid_from ? relationship.valid_from.slice(0, 16) : "");
      setValidTo(relationship.valid_to ? relationship.valid_to.slice(0, 16) : "");
      setShowAdvanced(!!(
        (relationship.weight !== undefined && relationship.weight !== 1) ||
        relationship.valid_from ||
        relationship.valid_to
      ));
    } else if (open && !relationship) {
      setTargetId("");
      setType("");
      setLabel("");
      setWeight("");
      setValidFrom("");
      setValidTo("");
      setShowAdvanced(false);
    }
  }, [open, relationship]);

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
        weight: weight ? Number(weight) : undefined,
        valid_from: validFrom || undefined,
        valid_to: validTo || undefined,
      });
      toast.success(isEdit ? "Connection updated!" : "Connection created!");
      if (!isEdit) {
        setTargetId("");
        setType("");
        setLabel("");
        setWeight("");
        setValidFrom("");
        setValidTo("");
        setShowAdvanced(false);
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to ${isEdit ? "update" : "create"} connection`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Connection" : "Add Connection"}</DialogTitle>
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
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? "Hide advanced options" : "Show advanced options"}
          </Button>
          {showAdvanced && (
            <div className="space-y-4 rounded-lg border p-3">
              <div className="space-y-2">
                <Label htmlFor="rel-weight">Weight (optional)</Label>
                <Input
                  id="rel-weight"
                  type="number"
                  step="0.1"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="1.0 (default)"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="rel-valid-from">Valid From</Label>
                  <Input
                    id="rel-valid-from"
                    type="datetime-local"
                    value={validFrom}
                    onChange={(e) => setValidFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rel-valid-to">Valid Until</Label>
                  <Input
                    id="rel-valid-to"
                    type="datetime-local"
                    value={validTo}
                    onChange={(e) => setValidTo(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
          <Button type="submit" disabled={loading || !targetId || !type} className="w-full">
            {loading ? (isEdit ? "Saving..." : "Creating...") : (isEdit ? "Save Changes" : "Create Connection")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
