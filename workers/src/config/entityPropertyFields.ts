export const ALLOWED_PROPERTY_KEYS: Record<string, string[]> = {
  person: ["date_of_birth", "allergies", "medical_notes"],
  location: ["area_sqft", "indoor", "sun_exposure", "soil_type", "zone"],
  plant: [
    "variety",
    "date_planted",
    "sun_requirement",
    "water_frequency",
    "perennial",
  ],
  animal: ["species", "breed", "date_of_birth", "weight", "fixed", "microchipped"],
  project: ["status", "start_date", "target_date", "priority"],
  equipment: ["brand", "model", "purchase_date", "serial_number", "condition"],
  supply: ["quantity", "unit", "reorder_threshold", "location"],
  process: ["frequency", "duration_minutes", "last_performed", "assigned_to"],
};

export function validatePropertyKeys(
  type: string,
  properties: Record<string, unknown>,
): string[] {
  const allowed = ALLOWED_PROPERTY_KEYS[type];
  if (!allowed) return [];
  const keys = Object.keys(properties);
  return keys.filter((k) => !allowed.includes(k));
}
