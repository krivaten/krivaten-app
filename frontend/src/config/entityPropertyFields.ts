import type { EntityType } from "@/types/entity";

export interface PropertyFieldDef {
  key: string;
  label: string;
  type: "text" | "number" | "date" | "checkbox" | "select";
  options?: { value: string; label: string }[];
}

export const ENTITY_PROPERTY_FIELDS: Record<EntityType, PropertyFieldDef[]> = {
  person: [
    { key: "date_of_birth", label: "Date of Birth", type: "date" },
    { key: "allergies", label: "Allergies", type: "text" },
    { key: "medical_notes", label: "Medical Notes", type: "text" },
  ],
  location: [
    { key: "area_sqft", label: "Area (sq ft)", type: "number" },
    { key: "indoor", label: "Indoor", type: "checkbox" },
    {
      key: "sun_exposure",
      label: "Sun Exposure",
      type: "select",
      options: [
        { value: "full_sun", label: "Full Sun" },
        { value: "partial_shade", label: "Partial Shade" },
        { value: "full_shade", label: "Full Shade" },
      ],
    },
    {
      key: "soil_type",
      label: "Soil Type",
      type: "select",
      options: [
        { value: "clay", label: "Clay" },
        { value: "sandy", label: "Sandy" },
        { value: "loam", label: "Loam" },
        { value: "rocky", label: "Rocky" },
      ],
    },
    { key: "zone", label: "Zone", type: "text" },
  ],
  plant: [
    { key: "variety", label: "Variety", type: "text" },
    { key: "date_planted", label: "Date Planted", type: "date" },
    {
      key: "sun_requirement",
      label: "Sun Requirement",
      type: "select",
      options: [
        { value: "full_sun", label: "Full Sun" },
        { value: "partial_shade", label: "Partial Shade" },
        { value: "full_shade", label: "Full Shade" },
      ],
    },
    {
      key: "water_frequency",
      label: "Water Frequency",
      type: "select",
      options: [
        { value: "daily", label: "Daily" },
        { value: "every_other_day", label: "Every Other Day" },
        { value: "weekly", label: "Weekly" },
        { value: "biweekly", label: "Biweekly" },
      ],
    },
    { key: "perennial", label: "Perennial", type: "checkbox" },
  ],
  animal: [
    { key: "species", label: "Species", type: "text" },
    { key: "breed", label: "Breed", type: "text" },
    { key: "date_of_birth", label: "Date of Birth", type: "date" },
    { key: "weight", label: "Weight", type: "number" },
    { key: "fixed", label: "Fixed", type: "checkbox" },
    { key: "microchipped", label: "Microchipped", type: "checkbox" },
  ],
  project: [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "planning", label: "Planning" },
        { value: "active", label: "Active" },
        { value: "paused", label: "Paused" },
        { value: "completed", label: "Completed" },
      ],
    },
    { key: "start_date", label: "Start Date", type: "date" },
    { key: "target_date", label: "Target Date", type: "date" },
    {
      key: "priority",
      label: "Priority",
      type: "select",
      options: [
        { value: "low", label: "Low" },
        { value: "medium", label: "Medium" },
        { value: "high", label: "High" },
      ],
    },
  ],
  equipment: [
    { key: "brand", label: "Brand", type: "text" },
    { key: "model", label: "Model", type: "text" },
    { key: "purchase_date", label: "Purchase Date", type: "date" },
    { key: "serial_number", label: "Serial Number", type: "text" },
    {
      key: "condition",
      label: "Condition",
      type: "select",
      options: [
        { value: "new", label: "New" },
        { value: "good", label: "Good" },
        { value: "fair", label: "Fair" },
        { value: "poor", label: "Poor" },
      ],
    },
  ],
  supply: [
    { key: "quantity", label: "Quantity", type: "number" },
    {
      key: "unit",
      label: "Unit",
      type: "select",
      options: [
        { value: "count", label: "Count" },
        { value: "lbs", label: "Lbs" },
        { value: "oz", label: "Oz" },
        { value: "gallons", label: "Gallons" },
        { value: "liters", label: "Liters" },
        { value: "bags", label: "Bags" },
        { value: "boxes", label: "Boxes" },
      ],
    },
    { key: "reorder_threshold", label: "Reorder Threshold", type: "number" },
    { key: "location", label: "Location", type: "text" },
  ],
  process: [
    {
      key: "frequency",
      label: "Frequency",
      type: "select",
      options: [
        { value: "daily", label: "Daily" },
        { value: "weekly", label: "Weekly" },
        { value: "biweekly", label: "Biweekly" },
        { value: "monthly", label: "Monthly" },
        { value: "quarterly", label: "Quarterly" },
        { value: "yearly", label: "Yearly" },
        { value: "as_needed", label: "As Needed" },
      ],
    },
    { key: "duration_minutes", label: "Duration (minutes)", type: "number" },
    { key: "last_performed", label: "Last Performed", type: "date" },
    { key: "assigned_to", label: "Assigned To", type: "text" },
  ],
};

export function formatPropertyValue(
  field: PropertyFieldDef,
  value: unknown,
): string {
  if (value === undefined || value === null || value === "") return "";

  if (field.type === "checkbox") {
    return value ? "Yes" : "No";
  }

  if (field.type === "select" && field.options) {
    const option = field.options.find((o) => o.value === value);
    return option ? option.label : String(value);
  }

  return String(value);
}
