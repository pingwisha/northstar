-- Which weekdays the person studies on, as bits: 1 = Monday, 2 = Tuesday, ... 64 = Sunday. 127 = every day.
ALTER TABLE goals ADD COLUMN study_days INTEGER NOT NULL DEFAULT 127;
