# BillBoard Testing & Issues Tracking

## 🎉 **NEW: Smart Bill Approval Workflow**

### ✅ **Intelligent Bill State Management**

- **Status**: IMPLEMENTED - Ready for Testing
- **What was done**: Complete overhaul of bill approval workflow with smart one-time vs recurring bill handling
- **Key Features**:
  - One-time bills go directly to pending approval (no scheduling delay)
  - Recurring bills can auto-approve based on user preference
  - Due date-based processing instead of confusing submission dates
  - Admin dashboard with manual processing capability

### **Test Cases for New Workflow**

#### Test 1: One-Time Bill Creation

1. Go to `/bills` and create a new bill
2. Leave "Recurring" unchecked
3. Set a due date
4. Submit the bill
5. **Expected**: Bill immediately appears in `/approvals` page as pending approval

#### Test 2: Recurring Bill with Manual Approval

1. Create a new bill with "Recurring" checked
2. Set frequency (e.g., monthly) and start date
3. Leave "Auto-approve when due" unchecked
4. Submit the bill
5. Go to admin dashboard and click "Process Pending Bills"
6. **Expected**: Bills with due dates today/past appear in `/approvals` for manual approval

#### Test 3: Recurring Bill with Auto-Approval

1. Create a new bill with "Recurring" checked
2. Set frequency and start date
3. Check "Auto-approve when due"
4. Submit the bill
5. Go to admin dashboard and click "Process Pending Bills"
6. **Expected**: Bills with due dates today/past are automatically approved

#### Test 4: Admin Dashboard Processing

1. Go to `/dashboard/admin`
2. Note the "Pending Approvals" count
3. Click "Process Pending Bills" button
4. **Expected**: Count updates and success message shows processed bills breakdown

#### Test 5: Approval Workflow

1. Ensure you have bills in pending approval state
2. Go to `/approvals` page
3. Try approving, holding, and rejecting bills
4. **Expected**: No 404 errors, smooth approval process with state updates

### **Database Migration Required**

- New `auto_approve` column added to `bills` table
- Run migration: `supabase/migrations/20241209000001_add_auto_approve_to_bills.sql`

## 🔧 **Previous Issues Fixed & Ready for Testing**

### ✅ **Performance Improvements**

- **Status**: FIXED - Needs Testing
- **What was done**: Added Next.js webpack optimizations and package import optimizations
- **Test**: Check if initial page loads are faster, especially first visit to `/bills` and `/calendar`
- **Expected**: Load times should be noticeably faster than before

### ✅ **Authentication Issues**

- **Status**: FIXED - Needs Testing
- **What was done**: Fixed 401 Unauthorized error when inviting users in manage organization
- **Test**:
  1. Go to Organization Settings
  2. Try to invite a new user with email and role
  3. Check console for errors
- **Expected**: Should work without 401 errors (note: actual email won't be sent as database table needs setup)

### ✅ **UX Improvements**

- **Status**: FIXED - Needs Testing
- **What was done**: Added click-outside-to-close functionality for + New dropdown button
- **Test**:
  1. Click the "+ New" button in top navigation
  2. Click anywhere outside the dropdown
- **Expected**: Dropdown should close when clicking outside

### ✅ **Dashboard Cleanup**

- **Status**: FIXED - Needs Testing
- **What was done**: Removed redundant first-row cards from all dashboards, kept only clickable action cards
- **Test**: Visit all dashboard types:
  - `/dashboard/admin`
  - `/dashboard/accountant`
  - `/dashboard/approver`
  - `/dashboard/analyst`
  - `/dashboard/viewer`
- **Expected**: Should only see clickable action cards, no redundant stat cards at top

### ✅ **Data Loading Issues**

- **Status**: FIXED - Needs Testing
- **What was done**: Fixed critical caching problems preventing fresh data loads
- **Test**:
  1. Add a bill via the bills form
  2. Navigate away and back to `/bills`
  3. Check if the new bill appears immediately
  4. Same test for `/approvals` and `/settings/organization`
- **Expected**: Data should appear immediately without needing to add another item

### ✅ **Improved Empty States**

- **Status**: FIXED - Needs Testing
- **What was done**: Enhanced empty state messaging with helpful guidance
- **Test**:
  1. Visit `/bills` with no bills in database
  2. Visit `/approvals` with no bill occurrences
- **Expected**: Should see helpful empty states with guidance and call-to-action buttons

---

## ✅ **Additional Features Added**

### ✅ **Enhanced Upcoming Occurrences Table**

- **Status**: FIXED - Needs Testing
- **What was done**: Added vendor and project columns to dashboard table
- **Test**: Visit any dashboard and check "Upcoming Occurrences" table
- **Expected**: Should show Vendor, Project, Due, Amount, State columns (5 total)

### ✅ **Clickable Bill Occurrences**

- **Status**: FIXED - Needs Testing
- **What was done**: Made bill occurrence rows clickable to navigate to bill details
- **Test**:
  1. Visit dashboard with bill occurrences
  2. Click on any row in "Upcoming Occurrences" table
- **Expected**: Should navigate to bill details page, rows should have hover effect

### ✅ **Updated Monthly Totals Description**

- **Status**: FIXED - Needs Testing
- **What was done**: Changed description from "Last 6 months" to "Past 3 and next 6 months"
- **Test**: Check "Monthly Totals" section on dashboard
- **Expected**: Should show "Past 3 and next 6 months" as subtitle

---

## 🐛 **Known Issues Requiring Database Schema Updates**

### ⚠️ **User Invitations**

- **Issue**: `org_invites` table doesn't exist in database schema
- **Impact**: Invitation functionality returns mock data
- **Fix Required**: Database migration to create proper invites table
- **Current Status**: Temporarily fixed to prevent TypeScript errors

---

## 📋 **Testing Checklist**

### Before Testing

- [ ] Make sure dev server is running (`pnpm run dev`)
- [ ] Clear browser cache if needed
- [ ] Test in both light and dark modes

### Core Functionality Tests

- [ ] **Performance**: Page loads feel faster
- [ ] **Authentication**: Organization invites don't show 401 errors
- [ ] **Navigation**: + New dropdown closes when clicking outside
- [ ] **Dashboard**: Only action cards visible, no redundant stat cards
- [ ] **Data Loading**: Bills/approvals/members show immediately after changes
- [ ] **Empty States**: Helpful messaging when no data exists

### UI/UX Tests

- [ ] **Responsive**: Test on different screen sizes
- [ ] **Accessibility**: Keyboard navigation works
- [ ] **Dark Mode**: All improvements work in dark theme
- [ ] **Forms**: Bill creation and other forms work correctly

---

## 🚨 **Current Critical Issues (In Progress)**

### ❌ **Bill Approval 403 Forbidden Error**

- **Status**: DEBUGGING - In Progress
- **Issue**: Getting 403 Forbidden when trying to approve bills (POST /rest/v1/approvals)
- **Impact**: Cannot approve bills through the UI
- **Test**:
  1. Go to `/approvals` page
  2. Try to approve any bill
  3. Check console for "403 (Forbidden)" error
- **Next Steps**: Debug authentication in useApprovals hook

### ❌ **Invisible KPI Cards on Admin Dashboard**

- **Status**: PARTIALLY FIXED - Needs Verification
- **Issue**: Today, This Week, Next 2 Weeks cards are invisible but clickable
- **What was done**: Removed framer-motion animations causing invisibility
- **Test**:
  1. Go to `/dashboard/admin`
  2. Check if KPI metric cards are visible
- **Expected**: Should see all four KPI cards clearly

### ❌ **Member Invitations Not Working**

- **Status**: IDENTIFIED - Needs Database Schema Fix
- **Issue**: Invitations appear to work but members are not actually added
- **Root Cause**: Missing `org_invites` table in database schema, using mock data
- **Impact**: Cannot actually invite new organization members
- **Test**:
  1. Go to `/settings/organization`
  2. Try inviting a member
  3. Check if they appear in members list
- **Fix Required**: Implement real org_invites database table

### ❌ **Bill States Confusion**

- **Status**: NEEDS REVIEW - Workflow Analysis Required
- **Issue**: New bills default to "scheduled" but user wants "pending_approval"
- **Current States**: scheduled, pending_approval, approved, on_hold, paid
- **Desired Workflow**: New bills → pending_approval → approved → paid
- **Test**: Create a new bill and check its initial state
- **Action Required**: Review bill occurrence generation logic

### ❌ **Bill Approvals Page Showing Zeros**

- **Status**: NEEDS INVESTIGATION
- **Issue**: Bill Approvals page shows "0" for all metrics
- **Possible Cause**: Related to bill state workflow or data refresh issues
- **Test**:
  1. Go to `/approvals`
  2. Check if any pending approvals show up
- **Note**: User mentioned old bills showed up after approving one, suggesting refresh issue

---

## 🔍 **How to Test Each Issue**

### 1. Performance Testing

```
1. Open browser developer tools (F12)
2. Go to Network tab
3. Navigate to /bills or /calendar
4. Check load times in Network tab
5. Compare to previous experience
```

### 2. Authentication Testing

```
1. Navigate to /settings/organization
2. Fill out the invite form with test email
3. Click "Send Invite"
4. Check browser console (F12) for any 401 errors
```

### 3. Dropdown Testing

```
1. Click "+ New" button in top navigation
2. Try clicking outside the dropdown
3. Verify dropdown closes
4. Try pressing Escape key
5. Verify dropdown closes
```

### 4. Data Loading Testing

```
1. Create a test bill via /bills form
2. Navigate to /dashboard then back to /bills
3. Verify bill appears immediately
4. Try same with approvals and organization members
```

---

## 📝 **Reporting Issues**

If you find any issues during testing:

1. Note which browser and version
2. Describe exact steps to reproduce
3. Include any console errors (F12 → Console)
4. Screenshot if UI-related

---

_Last Updated: 2025-01-10_
