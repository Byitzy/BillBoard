// Pseudocode outline for Codex to implement
// - Fetch bill by id
// - If recurring_rule => compute future dates
// - If installments_total => split amount_total across N occurrences
// - For each occurrence: compute due_date; suggested_submission_date = previousBusinessDay(due_date, CA-QC)
// - Upsert into bill_occurrences (sequence, amounts), keep paid ones intact

export {};
