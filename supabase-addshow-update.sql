ALTER TABLE theatre_shows
  ADD COLUMN IF NOT EXISTS show_date date,
  ADD COLUMN IF NOT EXISTS box_tickets integer default 0,
  ADD COLUMN IF NOT EXISTS gold_tickets integer default 0,
  ADD COLUMN IF NOT EXISTS silver_tickets integer default 0;

ALTER TABLE theatre_theatres
  ADD COLUMN IF NOT EXISTS capacity integer;

UPDATE theatre_theatres SET capacity = 714 WHERE name = 'Sandhya';
UPDATE theatre_theatres SET capacity = 524 WHERE name = 'Manasa';
