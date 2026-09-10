-- The application uses normalized email as the authenticated principal.
ALTER TABLE spring_session ALTER COLUMN principal_name TYPE VARCHAR(320);
