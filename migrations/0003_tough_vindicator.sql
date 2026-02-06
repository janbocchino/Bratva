DROP VIEW `ledger_summary_entries`;--> statement-breakpoint
CREATE VIEW `ledger_summary_entries` AS 
	SELECT
		user_id,
		asset_id,
		CAST(SUM(CASE WHEN dr_cr = 'cr' THEN amount ELSE -amount END) AS TEXT) AS balance
	FROM ledger_entries
	GROUP BY user_id, asset_id
;