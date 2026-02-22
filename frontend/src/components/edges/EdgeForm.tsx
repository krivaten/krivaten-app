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
import { useVocabularies } from "@/hooks/useVocabularies";

interface EdgeFormData {
  source_id: string;
  target_id: string;
  edge_type: string;
  label?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (edge: EdgeFormData) => Promise<unknown>;
  sourceEntityId: string;
  sourceEntityName: string;
}

export function EdgeForm({ open, onOpenChange, onSubmit, sourceEntityId, sourceEntityName }: Props) {
  const { entities } = useEntities();
  const { vocabularies: edgeTypes } = useVocabularies({ type: "edge_type" });
  const [targetId, setTargetId] = useState("");
  const [edgeTypeCode, setEdgeTypeCode] = useState("");
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
    if (!targetId || !edgeTypeCode) return;

    setLoading(true);
    try {
      await onSubmit({
        source_id: sourceEntityId,
        target_id: targetId,
        edge_type: edgeTypeCode,
        label: label.trim() || undefined,
      });
      toast.success("Connection created!");
      setTargetId("");
      setEdgeTypeCode("");
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
            <Label>Edge Type</Label>
            <Select value={edgeTypeCode} onValueChange={setEdgeTypeCode}>
              <SelectTrigger>
                <SelectValue placeholder="Select type..." />
              </SelectTrigger>
              <SelectContent>
                {edgeTypes.map((t) => (
                  <SelectItem key={t.id} value={t.code}>
                    {t.name}
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
            <Label htmlFor="edge-label">Label (optional)</Label>
            <Input
              id="edge-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. primary, backup"
            />
          </div>
          <Button type="submit" disabled={loading || !targetId || !edgeTypeCode} className="w-full">
            {loading ? "Creating..." : "Create Connection"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
