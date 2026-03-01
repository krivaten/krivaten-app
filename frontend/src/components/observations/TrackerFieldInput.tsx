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
import type { TrackerField } from "@/types/tracker";

interface Props {
  field: TrackerField;
  value: unknown;
  onChange: (value: unknown) => void;
}

export function TrackerFieldInput({ field, value, onChange }: Props) {
  const label = `${field.name}${field.is_required ? " *" : ""}`;

  switch (field.field_type) {
    case "text":
      return (
        <div className="space-y-2">
          <Label>{label}</Label>
          <Input
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.name}
          />
        </div>
      );

    case "number":
      return (
        <div className="space-y-2">
          <Label>{label}</Label>
          <Input
            type="number"
            step="any"
            value={value !== undefined && value !== null ? String(value) : ""}
            onChange={(e) =>
              onChange(e.target.value ? Number(e.target.value) : undefined)
            }
            placeholder={field.name}
          />
        </div>
      );

    case "boolean":
      return (
        <div className="flex items-center gap-2 py-2">
          <Checkbox
            id={`field-${field.code}`}
            checked={(value as boolean) ?? false}
            onCheckedChange={(checked) => onChange(checked === true)}
          />
          <Label htmlFor={`field-${field.code}`}>{label}</Label>
        </div>
      );

    case "single_select":
      return (
        <div className="space-y-2">
          <Label>{label}</Label>
          <Select
            value={(value as string) ?? ""}
            onValueChange={onChange}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Select ${field.name.toLowerCase()}...`} />
            </SelectTrigger>
            <SelectContent>
              {(field.options ?? []).map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );

    case "multi_select": {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="space-y-2">
          <Label>{label}</Label>
          <div className="flex flex-wrap gap-3">
            {(field.options ?? []).map((opt) => (
              <div key={opt.value} className="flex items-center gap-1.5">
                <Checkbox
                  id={`field-${field.code}-${opt.value}`}
                  checked={selected.includes(opt.value)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      onChange([...selected, opt.value]);
                    } else {
                      onChange(selected.filter((v) => v !== opt.value));
                    }
                  }}
                />
                <Label
                  htmlFor={`field-${field.code}-${opt.value}`}
                  className="text-sm font-normal"
                >
                  {opt.label}
                </Label>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case "textarea":
      return (
        <div className="space-y-2">
          <Label>{label}</Label>
          <Textarea
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.name}
            rows={3}
          />
        </div>
      );

    case "datetime":
      return (
        <div className="space-y-2">
          <Label>{label}</Label>
          <Input
            type="datetime-local"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );

    default:
      return null;
  }
}
