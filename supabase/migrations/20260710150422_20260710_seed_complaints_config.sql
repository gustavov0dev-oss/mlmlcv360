/*
# Seed complaints_book_enabled config row
Adds the key 'complaints_book_enabled' = 'true' to system_config so the frontend can read it.
*/
INSERT INTO system_config (key, value)
VALUES ('complaints_book_enabled', 'true')
ON CONFLICT (key) DO NOTHING;
