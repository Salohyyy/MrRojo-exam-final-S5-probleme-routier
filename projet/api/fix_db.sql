ALTER TABLE report_syncs ADD COLUMN IF NOT EXISTS sent_to_firebase BOOLEAN DEFAULT FALSE;

INSERT INTO problem_types (id, name) VALUES (5, 'Lavaka');