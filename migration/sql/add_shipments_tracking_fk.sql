DELETE FROM shipments
WHERE tracking_id IS NOT NULL
  AND tracking_id NOT IN (SELECT id FROM trackings);

ALTER TABLE shipments
DROP CONSTRAINT IF EXISTS shipments_tracking_id_fkey;
ALTER TABLE shipments
ADD CONSTRAINT shipments_tracking_id_fkey
  FOREIGN KEY (tracking_id)
  REFERENCES trackings(id)
  ON DELETE CASCADE;
