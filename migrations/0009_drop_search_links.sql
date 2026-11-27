-- Materials the site added itself as a web search on a task title were useless.
-- Dropping them lets the goals page ask the AI for real pages again (only the planned ones, never the person's own).
DELETE FROM materials WHERE own = 0 AND url LIKE 'https://www.google.com/search?q=%';
