-- Effective-dated, theatre-scoped item cost prices.
-- Paste into Supabase → SQL Editor → Run.

CREATE TABLE item_cost_history (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  theatre_id    uuid NOT NULL REFERENCES theatre_theatres(id) ON DELETE CASCADE,
  item_key      text NOT NULL,
  cost_price    numeric(10,2) NOT NULL,
  effective_from date NOT NULL,
  created_at    timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX ON item_cost_history (theatre_id, item_key, effective_from);

ALTER TABLE item_cost_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own item_cost_history"
  ON item_cost_history FOR SELECT
  USING (theatre_id IN (SELECT id FROM theatre_theatres WHERE owner_id = auth.uid()));

CREATE POLICY "Users can insert their own item_cost_history"
  ON item_cost_history FOR INSERT
  WITH CHECK (theatre_id IN (SELECT id FROM theatre_theatres WHERE owner_id = auth.uid()));

CREATE POLICY "Users can update their own item_cost_history"
  ON item_cost_history FOR UPDATE
  USING (theatre_id IN (SELECT id FROM theatre_theatres WHERE owner_id = auth.uid()));
