-- ============================================================================
-- Seed Data: Entity Types, Trackers, Tracker Fields, Entity Type Trackers
-- ============================================================================

-- --------------------------------------------------------------------------
-- Entity Types (8)
-- --------------------------------------------------------------------------
INSERT INTO public.entity_types (code, name, description, icon, is_system) VALUES
  ('person', 'Person', 'A human being', 'user', TRUE),
  ('location', 'Location', 'A physical place or area', 'map-pin', TRUE),
  ('plant', 'Plant', 'A botanical organism', 'leaf', TRUE),
  ('animal', 'Animal', 'A non-human animal', 'paw-print', TRUE),
  ('project', 'Project', 'A planned undertaking', 'folder', TRUE),
  ('equipment', 'Equipment', 'Tools and machinery', 'wrench', TRUE),
  ('supply', 'Supply', 'Consumable materials', 'package', TRUE),
  ('process', 'Process', 'A repeatable workflow', 'workflow', TRUE);

-- --------------------------------------------------------------------------
-- Trackers (18)
-- --------------------------------------------------------------------------
INSERT INTO public.trackers (code, name, description, icon, is_system) VALUES
  ('behavior', 'Behavior', 'Track behavioral observations', 'activity', TRUE),
  ('diet', 'Diet', 'Track food and nutrition intake', 'utensils', TRUE),
  ('sleep', 'Sleep', 'Track sleep patterns and quality', 'moon', TRUE),
  ('health', 'Health', 'Track health status and symptoms', 'heart-pulse', TRUE),
  ('mood', 'Mood', 'Track emotional state and energy', 'smile', TRUE),
  ('soil', 'Soil', 'Track soil conditions and nutrients', 'mountain', TRUE),
  ('growth', 'Growth', 'Track growth measurements', 'trending-up', TRUE),
  ('harvest', 'Harvest', 'Track harvest yields', 'wheat', TRUE),
  ('weather', 'Weather', 'Track weather conditions', 'cloud-sun', TRUE),
  ('conditions', 'Conditions', 'Track environmental conditions', 'thermometer', TRUE),
  ('status', 'Status', 'Track project or task status', 'circle-dot', TRUE),
  ('milestones', 'Milestones', 'Track project milestones', 'flag', TRUE),
  ('maintenance', 'Maintenance', 'Track maintenance activities', 'settings', TRUE),
  ('condition', 'Condition', 'Track equipment or item condition', 'shield-check', TRUE),
  ('inventory', 'Inventory', 'Track inventory levels', 'boxes', TRUE),
  ('usage', 'Usage', 'Track resource usage', 'bar-chart', TRUE),
  ('execution', 'Execution', 'Track process execution', 'play', TRUE),
  ('quality', 'Quality', 'Track quality metrics', 'badge-check', TRUE);

-- --------------------------------------------------------------------------
-- Tracker Fields
-- --------------------------------------------------------------------------

-- behavior fields
INSERT INTO public.tracker_fields (tracker_id, code, name, field_type, options, is_required, position)
SELECT t.id, f.code, f.name, f.field_type, f.options, f.is_required, f.position
FROM public.trackers t
CROSS JOIN (VALUES
  ('type', 'Type', 'multi_select', '[{"value":"hitting","label":"Hitting"},{"value":"screaming","label":"Screaming"},{"value":"throwing","label":"Throwing"},{"value":"biting","label":"Biting"},{"value":"kicking","label":"Kicking"},{"value":"running_away","label":"Running Away"},{"value":"other","label":"Other"}]'::jsonb, FALSE, 0),
  ('intensity', 'Intensity', 'single_select', '[{"value":"mild","label":"Mild"},{"value":"moderate","label":"Moderate"},{"value":"severe","label":"Severe"}]'::jsonb, FALSE, 1),
  ('duration_minutes', 'Duration (minutes)', 'number', NULL::jsonb, FALSE, 2),
  ('triggers', 'Triggers', 'textarea', NULL::jsonb, FALSE, 3),
  ('notes', 'Notes', 'textarea', NULL::jsonb, FALSE, 4)
) AS f(code, name, field_type, options, is_required, position)
WHERE t.code = 'behavior';

-- diet fields
INSERT INTO public.tracker_fields (tracker_id, code, name, field_type, options, is_required, position)
SELECT t.id, f.code, f.name, f.field_type, f.options, f.is_required, f.position
FROM public.trackers t
CROSS JOIN (VALUES
  ('meal_type', 'Meal Type', 'single_select', '[{"value":"breakfast","label":"Breakfast"},{"value":"lunch","label":"Lunch"},{"value":"dinner","label":"Dinner"},{"value":"snack","label":"Snack"}]'::jsonb, FALSE, 0),
  ('foods', 'Foods', 'textarea', NULL::jsonb, FALSE, 1),
  ('quantity', 'Quantity', 'text', NULL::jsonb, FALSE, 2),
  ('calories', 'Calories', 'number', NULL::jsonb, FALSE, 3),
  ('notes', 'Notes', 'textarea', NULL::jsonb, FALSE, 4)
) AS f(code, name, field_type, options, is_required, position)
WHERE t.code = 'diet';

-- sleep fields
INSERT INTO public.tracker_fields (tracker_id, code, name, field_type, options, is_required, position)
SELECT t.id, f.code, f.name, f.field_type, f.options, f.is_required, f.position
FROM public.trackers t
CROSS JOIN (VALUES
  ('bedtime', 'Bedtime', 'datetime', NULL::jsonb, FALSE, 0),
  ('wake_time', 'Wake Time', 'datetime', NULL::jsonb, FALSE, 1),
  ('quality', 'Quality', 'single_select', '[{"value":"poor","label":"Poor"},{"value":"fair","label":"Fair"},{"value":"good","label":"Good"},{"value":"excellent","label":"Excellent"}]'::jsonb, FALSE, 2),
  ('duration_hours', 'Duration (hours)', 'number', NULL::jsonb, FALSE, 3),
  ('notes', 'Notes', 'textarea', NULL::jsonb, FALSE, 4)
) AS f(code, name, field_type, options, is_required, position)
WHERE t.code = 'sleep';

-- health fields
INSERT INTO public.tracker_fields (tracker_id, code, name, field_type, options, is_required, position)
SELECT t.id, f.code, f.name, f.field_type, f.options, f.is_required, f.position
FROM public.trackers t
CROSS JOIN (VALUES
  ('status', 'Status', 'single_select', '[{"value":"excellent","label":"Excellent"},{"value":"good","label":"Good"},{"value":"fair","label":"Fair"},{"value":"poor","label":"Poor"},{"value":"critical","label":"Critical"}]'::jsonb, FALSE, 0),
  ('symptoms', 'Symptoms', 'multi_select', '[{"value":"fever","label":"Fever"},{"value":"cough","label":"Cough"},{"value":"fatigue","label":"Fatigue"},{"value":"pain","label":"Pain"},{"value":"nausea","label":"Nausea"},{"value":"headache","label":"Headache"},{"value":"other","label":"Other"}]'::jsonb, FALSE, 1),
  ('temperature', 'Temperature', 'number', NULL::jsonb, FALSE, 2),
  ('weight', 'Weight', 'number', NULL::jsonb, FALSE, 3),
  ('notes', 'Notes', 'textarea', NULL::jsonb, FALSE, 4)
) AS f(code, name, field_type, options, is_required, position)
WHERE t.code = 'health';

-- mood fields
INSERT INTO public.tracker_fields (tracker_id, code, name, field_type, options, is_required, position)
SELECT t.id, f.code, f.name, f.field_type, f.options, f.is_required, f.position
FROM public.trackers t
CROSS JOIN (VALUES
  ('mood', 'Mood', 'single_select', '[{"value":"very_low","label":"Very Low"},{"value":"low","label":"Low"},{"value":"neutral","label":"Neutral"},{"value":"good","label":"Good"},{"value":"very_good","label":"Very Good"}]'::jsonb, FALSE, 0),
  ('energy', 'Energy', 'single_select', '[{"value":"very_low","label":"Very Low"},{"value":"low","label":"Low"},{"value":"moderate","label":"Moderate"},{"value":"high","label":"High"},{"value":"very_high","label":"Very High"}]'::jsonb, FALSE, 1),
  ('triggers', 'Triggers', 'textarea', NULL::jsonb, FALSE, 2),
  ('notes', 'Notes', 'textarea', NULL::jsonb, FALSE, 3)
) AS f(code, name, field_type, options, is_required, position)
WHERE t.code = 'mood';

-- soil fields
INSERT INTO public.tracker_fields (tracker_id, code, name, field_type, options, is_required, position)
SELECT t.id, f.code, f.name, f.field_type, f.options, f.is_required, f.position
FROM public.trackers t
CROSS JOIN (VALUES
  ('ph', 'pH', 'number', NULL::jsonb, FALSE, 0),
  ('moisture_percent', 'Moisture (%)', 'number', NULL::jsonb, FALSE, 1),
  ('nitrogen', 'Nitrogen', 'number', NULL::jsonb, FALSE, 2),
  ('phosphorus', 'Phosphorus', 'number', NULL::jsonb, FALSE, 3),
  ('potassium', 'Potassium', 'number', NULL::jsonb, FALSE, 4),
  ('notes', 'Notes', 'textarea', NULL::jsonb, FALSE, 5)
) AS f(code, name, field_type, options, is_required, position)
WHERE t.code = 'soil';

-- growth fields
INSERT INTO public.tracker_fields (tracker_id, code, name, field_type, options, is_required, position)
SELECT t.id, f.code, f.name, f.field_type, f.options, f.is_required, f.position
FROM public.trackers t
CROSS JOIN (VALUES
  ('height_cm', 'Height (cm)', 'number', NULL::jsonb, FALSE, 0),
  ('width_cm', 'Width (cm)', 'number', NULL::jsonb, FALSE, 1),
  ('leaf_count', 'Leaf Count', 'number', NULL::jsonb, FALSE, 2),
  ('stage', 'Stage', 'single_select', '[{"value":"seedling","label":"Seedling"},{"value":"vegetative","label":"Vegetative"},{"value":"flowering","label":"Flowering"},{"value":"fruiting","label":"Fruiting"},{"value":"mature","label":"Mature"},{"value":"dormant","label":"Dormant"}]'::jsonb, FALSE, 3),
  ('notes', 'Notes', 'textarea', NULL::jsonb, FALSE, 4)
) AS f(code, name, field_type, options, is_required, position)
WHERE t.code = 'growth';

-- harvest fields
INSERT INTO public.tracker_fields (tracker_id, code, name, field_type, options, is_required, position)
SELECT t.id, f.code, f.name, f.field_type, f.options, f.is_required, f.position
FROM public.trackers t
CROSS JOIN (VALUES
  ('quantity', 'Quantity', 'number', NULL::jsonb, FALSE, 0),
  ('unit', 'Unit', 'single_select', '[{"value":"kg","label":"kg"},{"value":"lb","label":"lb"},{"value":"count","label":"Count"},{"value":"liters","label":"Liters"},{"value":"bushels","label":"Bushels"}]'::jsonb, FALSE, 1),
  ('quality_rating', 'Quality Rating', 'single_select', '[{"value":"poor","label":"Poor"},{"value":"fair","label":"Fair"},{"value":"good","label":"Good"},{"value":"excellent","label":"Excellent"}]'::jsonb, FALSE, 2),
  ('notes', 'Notes', 'textarea', NULL::jsonb, FALSE, 3)
) AS f(code, name, field_type, options, is_required, position)
WHERE t.code = 'harvest';

-- weather fields
INSERT INTO public.tracker_fields (tracker_id, code, name, field_type, options, is_required, position)
SELECT t.id, f.code, f.name, f.field_type, f.options, f.is_required, f.position
FROM public.trackers t
CROSS JOIN (VALUES
  ('temperature_c', 'Temperature (°C)', 'number', NULL::jsonb, FALSE, 0),
  ('humidity_percent', 'Humidity (%)', 'number', NULL::jsonb, FALSE, 1),
  ('wind_speed_kmh', 'Wind Speed (km/h)', 'number', NULL::jsonb, FALSE, 2),
  ('sky', 'Sky', 'single_select', '[{"value":"sunny","label":"Sunny"},{"value":"cloudy","label":"Cloudy"},{"value":"partly_cloudy","label":"Partly Cloudy"},{"value":"rainy","label":"Rainy"},{"value":"stormy","label":"Stormy"},{"value":"snowy","label":"Snowy"},{"value":"foggy","label":"Foggy"}]'::jsonb, FALSE, 3),
  ('precipitation_mm', 'Precipitation (mm)', 'number', NULL::jsonb, FALSE, 4),
  ('notes', 'Notes', 'textarea', NULL::jsonb, FALSE, 5)
) AS f(code, name, field_type, options, is_required, position)
WHERE t.code = 'weather';

-- conditions fields
INSERT INTO public.tracker_fields (tracker_id, code, name, field_type, options, is_required, position)
SELECT t.id, f.code, f.name, f.field_type, f.options, f.is_required, f.position
FROM public.trackers t
CROSS JOIN (VALUES
  ('temperature_c', 'Temperature (°C)', 'number', NULL::jsonb, FALSE, 0),
  ('humidity_percent', 'Humidity (%)', 'number', NULL::jsonb, FALSE, 1),
  ('light_level', 'Light Level', 'single_select', '[{"value":"dark","label":"Dark"},{"value":"low","label":"Low"},{"value":"moderate","label":"Moderate"},{"value":"bright","label":"Bright"},{"value":"very_bright","label":"Very Bright"}]'::jsonb, FALSE, 2),
  ('noise_level', 'Noise Level', 'single_select', '[{"value":"quiet","label":"Quiet"},{"value":"moderate","label":"Moderate"},{"value":"loud","label":"Loud"},{"value":"very_loud","label":"Very Loud"}]'::jsonb, FALSE, 3),
  ('notes', 'Notes', 'textarea', NULL::jsonb, FALSE, 4)
) AS f(code, name, field_type, options, is_required, position)
WHERE t.code = 'conditions';

-- status fields
INSERT INTO public.tracker_fields (tracker_id, code, name, field_type, options, is_required, position)
SELECT t.id, f.code, f.name, f.field_type, f.options, f.is_required, f.position
FROM public.trackers t
CROSS JOIN (VALUES
  ('status', 'Status', 'single_select', '[{"value":"not_started","label":"Not Started"},{"value":"in_progress","label":"In Progress"},{"value":"on_hold","label":"On Hold"},{"value":"completed","label":"Completed"},{"value":"cancelled","label":"Cancelled"}]'::jsonb, FALSE, 0),
  ('progress_percent', 'Progress (%)', 'number', NULL::jsonb, FALSE, 1),
  ('blockers', 'Blockers', 'textarea', NULL::jsonb, FALSE, 2),
  ('notes', 'Notes', 'textarea', NULL::jsonb, FALSE, 3)
) AS f(code, name, field_type, options, is_required, position)
WHERE t.code = 'status';

-- milestones fields
INSERT INTO public.tracker_fields (tracker_id, code, name, field_type, options, is_required, position)
SELECT t.id, f.code, f.name, f.field_type, f.options, f.is_required, f.position
FROM public.trackers t
CROSS JOIN (VALUES
  ('name', 'Name', 'text', NULL::jsonb, TRUE, 0),
  ('target_date', 'Target Date', 'datetime', NULL::jsonb, FALSE, 1),
  ('completed', 'Completed', 'boolean', NULL::jsonb, FALSE, 2),
  ('notes', 'Notes', 'textarea', NULL::jsonb, FALSE, 3)
) AS f(code, name, field_type, options, is_required, position)
WHERE t.code = 'milestones';

-- maintenance fields
INSERT INTO public.tracker_fields (tracker_id, code, name, field_type, options, is_required, position)
SELECT t.id, f.code, f.name, f.field_type, f.options, f.is_required, f.position
FROM public.trackers t
CROSS JOIN (VALUES
  ('maintenance_type', 'Maintenance Type', 'single_select', '[{"value":"preventive","label":"Preventive"},{"value":"corrective","label":"Corrective"},{"value":"inspection","label":"Inspection"},{"value":"calibration","label":"Calibration"}]'::jsonb, FALSE, 0),
  ('description', 'Description', 'textarea', NULL::jsonb, TRUE, 1),
  ('cost', 'Cost', 'number', NULL::jsonb, FALSE, 2),
  ('duration_hours', 'Duration (hours)', 'number', NULL::jsonb, FALSE, 3),
  ('next_due', 'Next Due', 'datetime', NULL::jsonb, FALSE, 4),
  ('notes', 'Notes', 'textarea', NULL::jsonb, FALSE, 5)
) AS f(code, name, field_type, options, is_required, position)
WHERE t.code = 'maintenance';

-- condition fields
INSERT INTO public.tracker_fields (tracker_id, code, name, field_type, options, is_required, position)
SELECT t.id, f.code, f.name, f.field_type, f.options, f.is_required, f.position
FROM public.trackers t
CROSS JOIN (VALUES
  ('condition', 'Condition', 'single_select', '[{"value":"new","label":"New"},{"value":"good","label":"Good"},{"value":"fair","label":"Fair"},{"value":"worn","label":"Worn"},{"value":"damaged","label":"Damaged"},{"value":"broken","label":"Broken"}]'::jsonb, FALSE, 0),
  ('operational', 'Operational', 'boolean', NULL::jsonb, FALSE, 1),
  ('notes', 'Notes', 'textarea', NULL::jsonb, FALSE, 2)
) AS f(code, name, field_type, options, is_required, position)
WHERE t.code = 'condition';

-- inventory fields
INSERT INTO public.tracker_fields (tracker_id, code, name, field_type, options, is_required, position)
SELECT t.id, f.code, f.name, f.field_type, f.options, f.is_required, f.position
FROM public.trackers t
CROSS JOIN (VALUES
  ('quantity', 'Quantity', 'number', NULL::jsonb, TRUE, 0),
  ('unit', 'Unit', 'text', NULL::jsonb, FALSE, 1),
  ('location', 'Location', 'text', NULL::jsonb, FALSE, 2),
  ('reorder_level', 'Reorder Level', 'number', NULL::jsonb, FALSE, 3),
  ('notes', 'Notes', 'textarea', NULL::jsonb, FALSE, 4)
) AS f(code, name, field_type, options, is_required, position)
WHERE t.code = 'inventory';

-- usage fields
INSERT INTO public.tracker_fields (tracker_id, code, name, field_type, options, is_required, position)
SELECT t.id, f.code, f.name, f.field_type, f.options, f.is_required, f.position
FROM public.trackers t
CROSS JOIN (VALUES
  ('quantity_used', 'Quantity Used', 'number', NULL::jsonb, TRUE, 0),
  ('unit', 'Unit', 'text', NULL::jsonb, FALSE, 1),
  ('purpose', 'Purpose', 'textarea', NULL::jsonb, FALSE, 2),
  ('notes', 'Notes', 'textarea', NULL::jsonb, FALSE, 3)
) AS f(code, name, field_type, options, is_required, position)
WHERE t.code = 'usage';

-- execution fields
INSERT INTO public.tracker_fields (tracker_id, code, name, field_type, options, is_required, position)
SELECT t.id, f.code, f.name, f.field_type, f.options, f.is_required, f.position
FROM public.trackers t
CROSS JOIN (VALUES
  ('status', 'Status', 'single_select', '[{"value":"started","label":"Started"},{"value":"running","label":"Running"},{"value":"paused","label":"Paused"},{"value":"completed","label":"Completed"},{"value":"failed","label":"Failed"}]'::jsonb, FALSE, 0),
  ('duration_minutes', 'Duration (minutes)', 'number', NULL::jsonb, FALSE, 1),
  ('inputs', 'Inputs', 'textarea', NULL::jsonb, FALSE, 2),
  ('outputs', 'Outputs', 'textarea', NULL::jsonb, FALSE, 3),
  ('notes', 'Notes', 'textarea', NULL::jsonb, FALSE, 4)
) AS f(code, name, field_type, options, is_required, position)
WHERE t.code = 'execution';

-- quality fields
INSERT INTO public.tracker_fields (tracker_id, code, name, field_type, options, is_required, position)
SELECT t.id, f.code, f.name, f.field_type, f.options, f.is_required, f.position
FROM public.trackers t
CROSS JOIN (VALUES
  ('rating', 'Rating', 'single_select', '[{"value":"reject","label":"Reject"},{"value":"below_standard","label":"Below Standard"},{"value":"acceptable","label":"Acceptable"},{"value":"good","label":"Good"},{"value":"excellent","label":"Excellent"}]'::jsonb, FALSE, 0),
  ('defects_found', 'Defects Found', 'number', NULL::jsonb, FALSE, 1),
  ('items_inspected', 'Items Inspected', 'number', NULL::jsonb, FALSE, 2),
  ('pass_rate_percent', 'Pass Rate (%)', 'number', NULL::jsonb, FALSE, 3),
  ('notes', 'Notes', 'textarea', NULL::jsonb, FALSE, 4)
) AS f(code, name, field_type, options, is_required, position)
WHERE t.code = 'quality';

-- --------------------------------------------------------------------------
-- Entity Type -> Tracker Mappings
-- --------------------------------------------------------------------------

-- person -> behavior, diet, sleep, health, mood
INSERT INTO public.entity_type_trackers (entity_type_id, tracker_id, position)
SELECT et.id, t.id, m.position
FROM (VALUES
  ('person', 'behavior', 0),
  ('person', 'diet', 1),
  ('person', 'sleep', 2),
  ('person', 'health', 3),
  ('person', 'mood', 4)
) AS m(entity_type_code, tracker_code, position)
JOIN public.entity_types et ON et.code = m.entity_type_code
JOIN public.trackers t ON t.code = m.tracker_code;

-- plant -> soil, health, growth, harvest
INSERT INTO public.entity_type_trackers (entity_type_id, tracker_id, position)
SELECT et.id, t.id, m.position
FROM (VALUES
  ('plant', 'soil', 0),
  ('plant', 'health', 1),
  ('plant', 'growth', 2),
  ('plant', 'harvest', 3)
) AS m(entity_type_code, tracker_code, position)
JOIN public.entity_types et ON et.code = m.entity_type_code
JOIN public.trackers t ON t.code = m.tracker_code;

-- animal -> health, diet, behavior, growth
INSERT INTO public.entity_type_trackers (entity_type_id, tracker_id, position)
SELECT et.id, t.id, m.position
FROM (VALUES
  ('animal', 'health', 0),
  ('animal', 'diet', 1),
  ('animal', 'behavior', 2),
  ('animal', 'growth', 3)
) AS m(entity_type_code, tracker_code, position)
JOIN public.entity_types et ON et.code = m.entity_type_code
JOIN public.trackers t ON t.code = m.tracker_code;

-- location -> weather, conditions
INSERT INTO public.entity_type_trackers (entity_type_id, tracker_id, position)
SELECT et.id, t.id, m.position
FROM (VALUES
  ('location', 'weather', 0),
  ('location', 'conditions', 1)
) AS m(entity_type_code, tracker_code, position)
JOIN public.entity_types et ON et.code = m.entity_type_code
JOIN public.trackers t ON t.code = m.tracker_code;

-- project -> status, milestones
INSERT INTO public.entity_type_trackers (entity_type_id, tracker_id, position)
SELECT et.id, t.id, m.position
FROM (VALUES
  ('project', 'status', 0),
  ('project', 'milestones', 1)
) AS m(entity_type_code, tracker_code, position)
JOIN public.entity_types et ON et.code = m.entity_type_code
JOIN public.trackers t ON t.code = m.tracker_code;

-- equipment -> maintenance, condition
INSERT INTO public.entity_type_trackers (entity_type_id, tracker_id, position)
SELECT et.id, t.id, m.position
FROM (VALUES
  ('equipment', 'maintenance', 0),
  ('equipment', 'condition', 1)
) AS m(entity_type_code, tracker_code, position)
JOIN public.entity_types et ON et.code = m.entity_type_code
JOIN public.trackers t ON t.code = m.tracker_code;

-- supply -> inventory, usage
INSERT INTO public.entity_type_trackers (entity_type_id, tracker_id, position)
SELECT et.id, t.id, m.position
FROM (VALUES
  ('supply', 'inventory', 0),
  ('supply', 'usage', 1)
) AS m(entity_type_code, tracker_code, position)
JOIN public.entity_types et ON et.code = m.entity_type_code
JOIN public.trackers t ON t.code = m.tracker_code;

-- process -> execution, quality
INSERT INTO public.entity_type_trackers (entity_type_id, tracker_id, position)
SELECT et.id, t.id, m.position
FROM (VALUES
  ('process', 'execution', 0),
  ('process', 'quality', 1)
) AS m(entity_type_code, tracker_code, position)
JOIN public.entity_types et ON et.code = m.entity_type_code
JOIN public.trackers t ON t.code = m.tracker_code;
