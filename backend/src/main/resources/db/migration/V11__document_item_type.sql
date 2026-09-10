ALTER TABLE items DROP CONSTRAINT items_type_check;
ALTER TABLE items ADD CONSTRAINT items_type_check CHECK (type IN ('FILE', 'IMAGE', 'VIDEO', 'DOCUMENT', 'AUDIO', 'ARCHIVE', 'LINK', 'NOTE'));
