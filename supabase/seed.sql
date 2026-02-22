-- Entity types (the original 8)
INSERT INTO public.vocabularies (tenant_id, vocabulary_type, code, name, description, is_system) VALUES
  (NULL, 'entity_type', 'person', 'Person', 'A human being', TRUE),
  (NULL, 'entity_type', 'location', 'Location', 'A physical place or area', TRUE),
  (NULL, 'entity_type', 'plant', 'Plant', 'A botanical organism', TRUE),
  (NULL, 'entity_type', 'animal', 'Animal', 'A non-human animal', TRUE),
  (NULL, 'entity_type', 'project', 'Project', 'A planned undertaking', TRUE),
  (NULL, 'entity_type', 'equipment', 'Equipment', 'Tools and machinery', TRUE),
  (NULL, 'entity_type', 'supply', 'Supply', 'Consumable materials', TRUE),
  (NULL, 'entity_type', 'process', 'Process', 'A repeatable workflow', TRUE);

-- Common variables
INSERT INTO public.vocabularies (tenant_id, vocabulary_type, code, name, description, is_system) VALUES
  (NULL, 'variable', 'temperature', 'Temperature', 'Thermal measurement', TRUE),
  (NULL, 'variable', 'humidity', 'Humidity', 'Moisture level', TRUE),
  (NULL, 'variable', 'weight', 'Weight', 'Mass measurement', TRUE),
  (NULL, 'variable', 'height', 'Height', 'Vertical measurement', TRUE),
  (NULL, 'variable', 'mood', 'Mood', 'Emotional state', TRUE),
  (NULL, 'variable', 'health_status', 'Health Status', 'General health assessment', TRUE),
  (NULL, 'variable', 'note', 'Note', 'Free-form text observation', TRUE),
  (NULL, 'variable', 'quantity', 'Quantity', 'Count or amount', TRUE),
  (NULL, 'variable', 'condition', 'Condition', 'State or quality assessment', TRUE),
  (NULL, 'variable', 'soil_ph', 'Soil pH', 'Soil acidity/alkalinity', TRUE);

-- Common units
INSERT INTO public.vocabularies (tenant_id, vocabulary_type, code, name, description, is_system) VALUES
  (NULL, 'unit', 'celsius', 'Celsius', 'Degrees Celsius', TRUE),
  (NULL, 'unit', 'fahrenheit', 'Fahrenheit', 'Degrees Fahrenheit', TRUE),
  (NULL, 'unit', 'kg', 'Kilogram', 'Mass in kilograms', TRUE),
  (NULL, 'unit', 'lb', 'Pound', 'Mass in pounds', TRUE),
  (NULL, 'unit', 'cm', 'Centimeter', 'Length in centimeters', TRUE),
  (NULL, 'unit', 'in', 'Inch', 'Length in inches', TRUE),
  (NULL, 'unit', 'percent', 'Percent', 'Percentage value', TRUE),
  (NULL, 'unit', 'count', 'Count', 'Discrete count', TRUE),
  (NULL, 'unit', 'liter', 'Liter', 'Volume in liters', TRUE),
  (NULL, 'unit', 'gallon', 'Gallon', 'Volume in gallons', TRUE);

-- Common edge types
INSERT INTO public.vocabularies (tenant_id, vocabulary_type, code, name, description, is_system) VALUES
  (NULL, 'edge_type', 'located_in', 'Located In', 'Physically located within another', TRUE),
  (NULL, 'edge_type', 'part_of', 'Part Of', 'Component of another', TRUE),
  (NULL, 'edge_type', 'parent_of', 'Parent Of', 'Biological or hierarchical parent', TRUE),
  (NULL, 'edge_type', 'manages', 'Manages', 'Responsible for another', TRUE),
  (NULL, 'edge_type', 'uses', 'Uses', 'Makes use of another', TRUE),
  (NULL, 'edge_type', 'produces', 'Produces', 'Creates or yields another', TRUE);

-- Quality flags
INSERT INTO public.vocabularies (tenant_id, vocabulary_type, code, name, description, is_system) VALUES
  (NULL, 'quality_flag', 'verified', 'Verified', 'Data has been verified', TRUE),
  (NULL, 'quality_flag', 'estimated', 'Estimated', 'Value is an estimate', TRUE),
  (NULL, 'quality_flag', 'suspect', 'Suspect', 'Data quality is questionable', TRUE);

-- Methods
INSERT INTO public.vocabularies (tenant_id, vocabulary_type, code, name, description, is_system) VALUES
  (NULL, 'method', 'visual', 'Visual Inspection', 'Observed visually', TRUE),
  (NULL, 'method', 'instrument', 'Instrument Reading', 'Measured with an instrument', TRUE),
  (NULL, 'method', 'self_report', 'Self Report', 'Reported by the subject', TRUE);
