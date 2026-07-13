-- Scrub legacy application event payloads that duplicated private user text.
-- Current code stores raw notes in applications.notes and raw reminder messages
-- in application_reminders.message. Timeline event_data keeps metadata only.

UPDATE application_events
SET event_data = '{"has_notes":true,"legacy_event":true}'
WHERE event_type = 'note_added';

UPDATE application_events
SET event_data = '{"has_message":true,"legacy_event":true}'
WHERE event_type = 'reminder_set';
