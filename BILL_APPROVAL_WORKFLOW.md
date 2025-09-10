# Bill Approval Workflow Documentation

## Overview

The BillBoard application uses an intelligent approval workflow that handles one-time and recurring bills differently to optimize user experience and reduce manual overhead.

## Core Concepts

### Bill States

Bills and their occurrences flow through these states:

- **`scheduled`**: Future recurring bill occurrences waiting for their due date
- **`pending_approval`**: Bills requiring manual approval
- **`approved`**: Bills approved and ready for payment
- **`on_hold`**: Bills temporarily suspended
- **`paid`**: Bills that have been paid
- **`canceled`**: Bills that were rejected or canceled

### Bill Types

1. **One-Time Bills**: Single payment bills with specific due dates
2. **Recurring Bills**: Repeating bills (weekly, monthly, quarterly, yearly)

## Workflow Logic

### One-Time Bills

```
Bill Creation → pending_approval OR approved
                (based on user selection)
```

- **No scheduling needed** - bills require immediate attention
- Go directly to final state when created
- User selects initial state: `pending_approval` (default) or `approved`
- Bill occurrence created immediately

### Recurring Bills

```
Bill Creation → scheduled → (on due_date) → pending_approval OR approved
                                          (based on auto_approve setting)
```

- Start as `scheduled` for future occurrences
- Daily processing checks `due_date` against current date
- Transition behavior depends on `auto_approve` setting:
  - **Auto-approve ON**: → `approved` (for utilities, rent, etc.)
  - **Auto-approve OFF**: → `pending_approval` (requires manual review)

## User Interface

### Bill Creation Form

**One-Time Bills:**

- Set due date
- Choose initial status: "Pending Approval" or "Approved"
- No auto-approval option (not applicable)

**Recurring Bills:**

- Set start date, frequency, optional end date
- Checkbox: "Auto-approve when due"
  - **Checked**: Bills auto-approve on due date
  - **Unchecked**: Bills require manual approval on due date

### Admin Dashboard

- **"Process Pending Bills"** button: Manually trigger due date processing
- **Pending Approvals Count**: Shows actual bills needing approval
- Real-time updates when bills are processed

### Approvals Page

- Shows bills in `pending_approval` state
- Approval actions: Approve, Hold, Reject
- Quick approval panel for immediate action
- Full approval history and notes

## Processing Logic

### Daily Automation (Edge Function)

The `process_pending_bills` edge function runs daily:

```javascript
// Find scheduled bills where due_date <= today
const billsToProcess = await supabase
  .from('bill_occurrences')
  .select('*, bills(auto_approve)')
  .eq('state', 'scheduled')
  .lte('due_date', today);

// Process based on auto_approve setting
billsToProcess.forEach((bill) => {
  if (bill.bills.auto_approve) {
    updateState(bill.id, 'approved'); // Auto-approve
  } else {
    updateState(bill.id, 'pending_approval'); // Manual approval needed
  }
});
```

### Manual Processing

Admins can manually trigger processing via:

- Admin dashboard button
- API endpoint: `POST /api/admin/process-bills`

## Database Schema

### Bills Table

```sql
CREATE TABLE bills (
  -- ... existing columns ...
  auto_approve boolean DEFAULT false,  -- New: Auto-approve recurring bills
  -- ... other columns ...
);
```

### Bill Occurrences Table

```sql
CREATE TABLE bill_occurrences (
  -- ... existing columns ...
  due_date date NOT NULL,              -- When bill is due (triggers processing)
  state occ_state NOT NULL,            -- Current state of the occurrence
  -- ... other columns ...
);
```

## API Endpoints

### Process Bills

- **POST** `/api/admin/process-bills`
- **Auth**: Admin only
- **Purpose**: Manually process scheduled bills based on due dates
- **Response**: Count of auto-approved vs pending approval bills

### Approvals

- **GET** `/api/approvals?billOccurrenceId={id}`
- **POST** `/api/approvals`
- **Purpose**: Fetch and create approval decisions
- **States**: approved, hold, rejected

## Edge Functions

### process_pending_bills

- **Trigger**: Daily cron job (recommended)
- **Manual**: Can be called via API
- **Logic**: Process scheduled bills based on due_date
- **Output**: Auto-approved and pending approval counts

### generate_occurrences

- **Trigger**: When recurring bills are created/updated
- **Logic**: Generate future occurrences in `scheduled` state
- **Uses**: Bill recurring rules (frequency, interval, dates)

## User Workflows

### Creating a Utility Bill (Auto-approve)

1. Create bill with recurring schedule
2. Check "Auto-approve when due"
3. Bills automatically approve on due dates
4. No manual intervention required

### Creating Project Expenses (Manual approval)

1. Create bill with recurring schedule
2. Leave "Auto-approve when due" unchecked
3. Bills appear in approvals queue on due dates
4. Approvers review and approve manually

### One-Time Invoice

1. Create non-recurring bill
2. Set due date
3. Bill immediately appears in approvals (or approved if selected)
4. No scheduling delay

## Benefits

1. **Reduced Manual Work**: Auto-approve routine recurring bills
2. **Immediate Attention**: One-time bills don't wait in scheduling
3. **Clear Due Dates**: Processing based on actual due dates, not submission dates
4. **Flexible Control**: Per-bill approval requirements
5. **No Confusion**: Bills only appear when they actually need attention

## Troubleshooting

### Bills Not Appearing in Approvals

- Check if bills are in `scheduled` state (need processing first)
- Run manual processing via admin dashboard
- Verify due dates are today or earlier

### Auto-Approval Not Working

- Verify `auto_approve` is set to `true` in bills table
- Check that bills are being processed (scheduled → approved)
- Confirm edge function is running or manually trigger processing

### 404 Errors on Approval

- Ensure bills are in `pending_approval` state before approval
- Check bill occurrence exists and belongs to user's organization
- Verify user has approval permissions (admin/approver roles)
