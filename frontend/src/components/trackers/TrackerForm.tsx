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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { Tracker, TrackerCreate, TrackerFieldCreate, FieldType } from "@/types/tracker";

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "Boolean" },
  { value: "single_select", label: "Single Select" },
  { value: "multi_select", label: "Multi Select" },
  { value: "textarea", label: "Textarea" },
  { value: "datetime", label: "Date/Time" },
];

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: TrackerCreate) => Promise<unknown>;
  tracker?: Tracker;
}

function emptyField(position: number): TrackerFieldCreate {
  return { code: "", name: "", field_type: "text", is_required: false, position, options: null };
}

export function TrackerForm({ open, onOpenChange, onSubmit, tracker }: Props) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<TrackerFieldCreate[]>([]);
  const [loading, setLoading] = useState(false);

  const isEdit = !!tracker;

  useEffect(() => {
    if (open && tracker) {
      setName(tracker.name);
      setCode(tracker.code);
      setDescription(tracker.description || "");
      setFields(
        (tracker.fields || []).map((f) => ({
          id: f.id,
          code: f.code,
          name: f.name,
          field_type: f.field_type,
          options: f.options,
          is_required: f.is_required,
          position: f.position,
        })),
      );
    } else if (open && !tracker) {
      setName("");
      setCode("");
      setDescription("");
      setFields([]);
    }
  }, [open, tracker]);

  function handleNameChange(value: string) {
    setName(value);
    if (!isEdit) {
      setCode(slugify(value));
    }
  }

  function addField() {
    setFields((prev) => [...prev, emptyField(prev.length)]);
  }

  function removeField(index: number) {
    setFields((prev) => prev.filter((_, i) => i !== index).map((f, i) => ({ ...f, position: i })));
  }

  function updateField(index: number, updates: Partial<TrackerFieldCreate>) {
    setFields((prev) =>
      prev.map((f, i) => (i === index ? { ...f, ...updates } : f)),
    );
  }

  function moveField(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= fields.length) return;
    setFields((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((f, i) => ({ ...f, position: i }));
    });
  }

  function handleFieldNameChange(index: number, value: string) {
    const updates: Partial<TrackerFieldCreate> = { name: value };
    const field = fields[index];
    if (!field.id) {
      updates.code = slugify(value);
    }
    updateField(index, updates);
  }

  function addOption(fieldIndex: number) {
    const field = fields[fieldIndex];
    const opts = field.options || [];
    updateField(fieldIndex, { options: [...opts, { value: "", label: "" }] });
  }

  function removeOption(fieldIndex: number, optIndex: number) {
    const field = fields[fieldIndex];
    const opts = (field.options || []).filter((_, i) => i !== optIndex);
    updateField(fieldIndex, { options: opts });
  }

  function updateOption(fieldIndex: number, optIndex: number, key: "value" | "label", val: string) {
    const field = fields[fieldIndex];
    const opts = (field.options || []).map((o, i) =>
      i === optIndex ? { ...o, [key]: val } : o,
    );
    updateField(fieldIndex, { options: opts });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;

    setLoading(true);
    try {
      await onSubmit({
        name: name.trim(),
        code: code.trim(),
        description: description.trim() || undefined,
        fields,
      });
      toast.success(isEdit ? "Tracker updated!" : "Tracker created!");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to ${isEdit ? "update" : "create"} tracker`);
    } finally {
      setLoading(false);
    }
  }

  const needsOptions = (type: FieldType) => type === "single_select" || type === "multi_select";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Tracker" : "Create Tracker"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Metadata */}
          <div className="space-y-2">
            <Label htmlFor="tracker-name">Name</Label>
            <Input
              id="tracker-name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Plant Growth"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tracker-code">Code</Label>
            <Input
              id="tracker-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="auto-generated from name"
              disabled={isEdit}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tracker-desc">Description (optional)</Label>
            <Textarea
              id="tracker-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this tracker measure?"
              rows={2}
            />
          </div>

          {/* Fields */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Fields</Label>
              <Button type="button" variant="outline" size="sm" onClick={addField}>
                Add Field
              </Button>
            </div>

            {fields.length === 0 && (
              <p className="text-sm text-muted-foreground">No fields yet. Add fields to define what this tracker captures.</p>
            )}

            {fields.map((field, i) => (
              <div key={i} className="rounded-md border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Field {i + 1}</span>
                  <div className="flex gap-1">
                    <Button type="button" variant="ghost" size="sm" onClick={() => moveField(i, -1)} disabled={i === 0}>
                      &uarr;
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => moveField(i, 1)} disabled={i === fields.length - 1}>
                      &darr;
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeField(i)}>
                      Remove
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Name</Label>
                    <Input
                      value={field.name}
                      onChange={(e) => handleFieldNameChange(i, e.target.value)}
                      placeholder="Field name"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Code</Label>
                    <Input
                      value={field.code}
                      onChange={(e) => updateField(i, { code: e.target.value })}
                      placeholder="field_code"
                      disabled={!!field.id}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Type</Label>
                    <Select
                      value={field.field_type}
                      onValueChange={(v) => updateField(i, { field_type: v as FieldType })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FIELD_TYPES.map((ft) => (
                          <SelectItem key={ft.value} value={ft.value}>
                            {ft.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end gap-2 pb-1">
                    <Checkbox
                      id={`field-required-${i}`}
                      checked={field.is_required}
                      onCheckedChange={(checked) => updateField(i, { is_required: !!checked })}
                    />
                    <Label htmlFor={`field-required-${i}`} className="text-xs">Required</Label>
                  </div>
                </div>

                {/* Options editor for select types */}
                {needsOptions(field.field_type) && (
                  <div className="space-y-2 pl-2 border-l-2 border-muted">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Options</Label>
                      <Button type="button" variant="ghost" size="sm" onClick={() => addOption(i)}>
                        Add Option
                      </Button>
                    </div>
                    {(field.options || []).map((opt, oi) => (
                      <div key={oi} className="flex gap-2 items-center">
                        <Input
                          value={opt.value}
                          onChange={(e) => updateOption(i, oi, "value", e.target.value)}
                          placeholder="value"
                          className="flex-1"
                        />
                        <Input
                          value={opt.label}
                          onChange={(e) => updateOption(i, oi, "label", e.target.value)}
                          placeholder="label"
                          className="flex-1"
                        />
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeOption(i, oi)}>
                          &times;
                        </Button>
                      </div>
                    ))}
                    {(field.options || []).length === 0 && (
                      <p className="text-xs text-muted-foreground">Add at least one option for select fields.</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <Button type="submit" disabled={loading || !name.trim() || !code.trim()} className="w-full">
            {loading ? (isEdit ? "Saving..." : "Creating...") : (isEdit ? "Save Changes" : "Create Tracker")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
