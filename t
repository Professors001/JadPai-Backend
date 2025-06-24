SELECT
  enrollments.id,
  enrollments.user_id,
  enrollments.event_id,
  enrollments.evidence_img_path,
  enrollments.name,
  enrollments.email,
  enrollments.phone,
  enrollments.status,
  enrollments.enroll_date,
  enrollments.update_timestamp,
  events.id AS events_id,
  events.name AS events_name,
  events.description AS events_description,
  events.max_cap AS events_max_cap,
  events.creator_id AS events_creator_id
FROM
  enrollments
INNER JOIN
  events ON enrollments.event_id = events.id
WHERE
  enrollments.user_id = 1;