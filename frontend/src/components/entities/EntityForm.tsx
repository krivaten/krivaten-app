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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { Entity, EntityCreate, EntityType } from "@/types/entity";
import {
  ENTITY_PROPERTY_FIELDS,
  type PropertyFieldDef,
} from "@/config/entityPropertyFields";

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

function PropertyField({
  field,
  value,
  onChange,
}: {
  field: PropertyFieldDef;
  value: unknown;
  onChange: (val: unknown) => void;
}) {
  switch (field.type) {
    case "text":
      return (
        <div className="space-y-2">
          <Label>{field.label}</Label>
          <Input
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.label}
          />
        </div>
      );
    case "number":
      return (
        <div className="space-y-2">
          <Label>{field.label}</Label>
          <Input
            type="number"
            value={value !== undefined && value !== null ? String(value) : ""}
            onChange={(e) =>
              onChange(e.target.value === "" ? undefined : Number(e.target.value))
            }
            placeholder={field.label}
          />
        </div>
      );
    case "date":
      return (
        <div className="space-y-2">
          <Label>{field.label}</Label>
          <Input
            type="date"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );
    case "checkbox":
      return (
        <div className="flex items-center gap-2">
          <Checkbox
            id={`prop-${field.key}`}
            checked={(value as boolean) ?? false}
            onCheckedChange={(checked) => onChange(checked === true)}
          />
          <Label htmlFor={`prop-${field.key}`}>{field.label}</Label>
        </div>
      );
    case "select":
      return (
        <div className="space-y-2">
          <Label>{field.label}</Label>
          <Select
            value={(value as string) ?? ""}
            onValueChange={(v) => onChange(v)}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Select ${field.label.toLowerCase()}...`} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
  }
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (entity: EntityCreate) => Promise<Entity>;
  initialType?: EntityType;
}

export function EntityForm({ open, onOpenChange, onSubmit, initialType }: Props) {
  const [name, setName] = useState("");
  const [type, setType] = useState<EntityType | "">(initialType ?? "");
  const [properties, setProperties] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(false);

  function handleTypeChange(newType: EntityType) {
    setType(newType);
    setProperties({});
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !type) return;

    setLoading(true);
    try {
      const cleanedProps: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(properties)) {
        if (val !== undefined && val !== null && val !== "") {
          cleanedProps[key] = val;
        }
      }

      await onSubmit({
        type,
        name: name.trim(),
        properties: Object.keys(cleanedProps).length > 0 ? cleanedProps : undefined,
      });
      toast.success("Entity created!");
      setName("");
      setType(initialType ?? "");
      setProperties({});
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create entity");
    } finally {
      setLoading(false);
    }
  }

  const fieldDefs = type ? ENTITY_PROPERTY_FIELDS[type] : [];

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
            <Select
              value={type}
              onValueChange={(v) => handleTypeChange(v as EntityType)}
            >
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
          {fieldDefs.length > 0 && (
            <div className="space-y-3">
              {fieldDefs.map((field) => (
                <PropertyField
                  key={field.key}
                  field={field}
                  value={properties[field.key]}
                  onChange={(val) =>
                    setProperties((prev) => ({ ...prev, [field.key]: val }))
                  }
                />
              ))}
            </div>
          )}
          <Button type="submit" disabled={loading || !name.trim() || !type} className="w-full">
            {loading ? "Creating..." : "Create Entity"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
