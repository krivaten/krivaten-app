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
import { toast } from "sonner";
import { useVocabularies } from "@/hooks/useVocabularies";
import type { Entity, EntityCreate } from "@/types/entity";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (entity: EntityCreate) => Promise<Entity>;
  initialTypeCode?: string;
  entity?: Entity;
}

export function EntityForm({ open, onOpenChange, onSubmit, initialTypeCode, entity }: Props) {
  const { vocabularies: entityTypes } = useVocabularies({ type: "entity_type" });
  const [name, setName] = useState("");
  const [typeId, setTypeId] = useState("");
  const [description, setDescription] = useState("");
  const [taxonomyPath, setTaxonomyPath] = useState("");
  const [attrEntries, setAttrEntries] = useState<{ key: string; value: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const isEdit = !!entity;

  // Pre-populate form when editing
  useEffect(() => {
    if (open && entity) {
      setName(entity.name);
      setTypeId(entity.entity_type_id || "");
      setDescription(entity.description || "");
      setTaxonomyPath(entity.taxonomy_path || "");
      const attrs = entity.attributes;
      if (attrs && Object.keys(attrs).length > 0) {
        setAttrEntries(
          Object.entries(attrs).map(([key, value]) => ({ key, value: String(value) })),
        );
      } else {
        setAttrEntries([]);
      }
    } else if (open && !entity) {
      setName("");
      setTypeId("");
      setDescription("");
      setTaxonomyPath("");
      setAttrEntries([]);
    }
  }, [open, entity]);

  // Resolve initialTypeCode to an id when entity types load
  const resolvedInitialId = initialTypeCode
    ? entityTypes.find((v) => v.code === initialTypeCode)?.id || ""
    : "";

  const selectedTypeId = typeId || resolvedInitialId;

  function addAttrEntry() {
    setAttrEntries((prev) => [...prev, { key: "", value: "" }]);
  }

  function removeAttrEntry(index: number) {
    setAttrEntries((prev) => prev.filter((_, i) => i !== index));
  }

  function updateAttrEntry(index: number, field: "key" | "value", val: string) {
    setAttrEntries((prev) =>
      prev.map((entry, i) => (i === index ? { ...entry, [field]: val } : entry)),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !selectedTypeId) return;

    setLoading(true);
    try {
      const attributes: Record<string, unknown> = {};
      for (const entry of attrEntries) {
        if (entry.key.trim()) {
          attributes[entry.key.trim()] = entry.value;
        }
      }

      await onSubmit({
        entity_type_id: selectedTypeId,
        name: name.trim(),
        description: description.trim() || undefined,
        taxonomy_path: taxonomyPath.trim() || undefined,
        attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
      });
      toast.success(isEdit ? "Entity updated!" : "Entity created!");
      if (!isEdit) {
        setName("");
        setTypeId("");
        setDescription("");
        setTaxonomyPath("");
        setAttrEntries([]);
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to ${isEdit ? "update" : "create"} entity`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Entity" : "Add Entity"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="entity-name">Name</Label>
            <Input
              id="entity-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Front Garden, Tomato Plant #3"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={selectedTypeId}
              onValueChange={(v) => setTypeId(v)}
              disabled={isEdit}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type..." />
              </SelectTrigger>
              <SelectContent>
                {entityTypes.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="entity-description">Description (optional)</Label>
            <Input
              id="entity-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="entity-taxonomy">Taxonomy Path (optional)</Label>
            <Input
              id="entity-taxonomy"
              value={taxonomyPath}
              onChange={(e) => setTaxonomyPath(e.target.value)}
              placeholder="e.g. biology.botany.flowering"
            />
          </div>
          {attrEntries.length > 0 && (
            <div className="space-y-2">
              <Label>Attributes</Label>
              {attrEntries.map((entry, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={entry.key}
                    onChange={(e) => updateAttrEntry(i, "key", e.target.value)}
                    placeholder="Key"
                    className="flex-1"
                  />
                  <Input
                    value={entry.value}
                    onChange={(e) => updateAttrEntry(i, "value", e.target.value)}
                    placeholder="Value"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAttrEntry(i)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
          <Button type="button" variant="outline" size="sm" onClick={addAttrEntry}>
            Add Attribute
          </Button>
          <Button type="submit" disabled={loading || !name.trim() || !selectedTypeId} className="w-full">
            {loading ? (isEdit ? "Saving..." : "Creating...") : (isEdit ? "Save Changes" : "Create Entity")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
