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
import type { Entity, EntityCreate, EntityType } from "@/types/entity";

const ENTITY_TYPES: { value: EntityType; label: string }[] = [
  { value: "person", label: "Person" },
  { value: "location", label: "Location" },
  { value: "plant", label: "Plant" },
  { value: "animal", label: "Animal" },
  { value: "project", label: "Project" },
  { value: "equipment", label: "Equipment" },
  { value: "supply", label: "Supply" },
  { value: "process", label: "Process" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (entity: EntityCreate) => Promise<Entity>;
  initialType?: EntityType;
}

export function EntityForm({ open, onOpenChange, onSubmit, initialType }: Props) {
  const [name, setName] = useState("");
  const [type, setType] = useState<EntityType | "">(initialType ?? "");
  const [properties, setProperties] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !type) return;

    setLoading(true);
    try {
      let parsedProps: Record<string, unknown> = {};
      if (properties.trim()) {
        parsedProps = JSON.parse(properties);
      }

      await onSubmit({
        type,
        name: name.trim(),
        properties: parsedProps,
      });
      toast.success("Entity created!");
      setName("");
      setType(initialType ?? "");
      setProperties("");
      onOpenChange(false);
    } catch (err) {
      if (err instanceof SyntaxError) {
        toast.error("Invalid JSON in properties field");
      } else {
        toast.error(err instanceof Error ? err.message : "Failed to create entity");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Entity</DialogTitle>
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
            <Select value={type} onValueChange={(v) => setType(v as EntityType)}>
              <SelectTrigger>
                <SelectValue placeholder="Select type..." />
              </SelectTrigger>
              <SelectContent>
                {ENTITY_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="entity-properties">Properties (JSON, optional)</Label>
            <Textarea
              id="entity-properties"
              value={properties}
              onChange={(e) => setProperties(e.target.value)}
              placeholder='{"variety": "Roma", "planted": "2026-03-01"}'
              rows={3}
            />
          </div>
          <Button type="submit" disabled={loading || !name.trim() || !type} className="w-full">
            {loading ? "Creating..." : "Create Entity"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
