# BillBoard Development - Personal Agent Instructions

## Project Context

- Fork of Byitzy/BillBoard, working on improvements and fixes
- Upstream: https://github.com/Byitzy/BillBoard.git
- Origin: https://github.com/yidy718/billboard.git
- Main development branch: `beta`
- Current feature branch: `feature/nextjs-15-upgrade`

## What's Been Implemented (Based on Current State)

### Core Infrastructure ✅

- ✅ Next.js 15.5.2 with TypeScript and App Router
- ✅ Tailwind CSS + shadcn/ui components with dark mode
- ✅ Supabase integration (auth, database, storage, RLS)
- ✅ Multi-tenant organization system with proper RLS policies
- ✅ Comprehensive internationalization (en-CA/fr-CA/es-ES)
- ✅ Quebec business days and holiday handling
- ✅ Production-ready CI/CD pipeline with Vercel deployment

### Authentication & Authorization ✅

- ✅ Supabase Auth with magic links
- ✅ Role-based access control (admin, approver, accountant, data_entry, analyst, viewer)
- ✅ Organization invitation system with email invitations
- ✅ Server-side auth guards and client-side protection

### Data Models & Database ✅

- ✅ Organizations, members, vendors, projects, bills
- ✅ Bill occurrences with recurring schedule generation
- ✅ Approval workflow with state management
- ✅ File attachments with Supabase Storage integration
- ✅ Audit logging system with action tracking
- ✅ Notification system with real-time updates

### Core Features ✅

- ✅ **Dashboard**: KPI metrics, charts, project breakdowns
- ✅ **Calendar**: Month view with Quebec holidays, bill occurrences
- ✅ **Bills**: Create/edit bills, recurring schedules, installments
- ✅ **Vendors**: Full CRUD with search functionality
- ✅ **Projects**: Full CRUD with search functionality
- ✅ **Approval Workflow**: Approve/hold bills with comments
- ✅ **Organization Settings**: Member management, role changes, invitations

### Advanced Features ✅

- ✅ **File Upload System**: Drag-and-drop, multiple file types, storage
- ✅ **Notification Center**: Real-time notifications with unread badges
- ✅ **Audit Logging**: Complete action tracking with templates
- ✅ **Edge Functions**: Bill occurrence generation with business logic
- ✅ **CSV/PDF Export**: Table exports and document generation
- ✅ **Search & Filters**: Context-aware search across all pages

### UI/UX Features ✅

- ✅ Responsive design with mobile sidebar
- ✅ Dark/light theme with system preference
- ✅ Loading states, error boundaries, empty states
- ✅ Keyboard shortcuts and accessibility features
- ✅ Toast notifications and form validation

### Super Admin System ✅

- ✅ **Complete Super Admin Dashboard**: System-wide organization and user management
- ✅ **Organization Management**: View, edit, delete organizations with data validation
- ✅ **User Management**: Create users, assign organizations, manage super admin status
- ✅ **Settings Pages**: Comprehensive organization settings with branding and configuration
- ✅ **Authentication Guards**: Proper super admin role protection and access control

## My Development Preferences

1. **Always use TodoWrite** to track complex tasks and show progress
2. **Check existing patterns** before implementing - look at neighboring files
3. **Follow the existing codebase conventions** exactly
4. **Run type checking** after changes: `pnpm typecheck`
5. **Test builds** before considering tasks complete: `pnpm build`
6. **Prefer editing existing files** over creating new ones unless necessary
7. **Keep implementations consistent** with the project's architecture

## Pull Request Preferences

- **No emojis** in PR titles or descriptions
- **Author name**: Include "Co-Authored-By: yidy <yidy@pm.me>" in commit messages
- **Keep descriptions clean and professional** without decorative elements
- **Focus on technical details and impact**

## RECENT MAJOR ACCOMPLISHMENTS 🎉

### Next.js 15 Upgrade & Complete Testing Infrastructure ✅

**Status**: COMPLETED - All issues resolved and production-ready

**What Was Accomplished**:

1. **✅ Complete Next.js 15.5.2 Upgrade**:

   - Updated from Next.js 14.2.5 to 15.5.2
   - Fixed all API route parameter compatibility (Promise<> wrapping)
   - Updated ESLint and TypeScript dependencies
   - Added missing zod dependency

2. **✅ Upstream Merge Conflict Resolution**:

   - Resolved all merge conflicts from upstream beta branch
   - Preserved super admin functionality during merge
   - Integrated latest upstream features and improvements
   - Maintained code consistency and architecture

3. **✅ Comprehensive Playwright Testing Suite**:

   - Fixed all authentication test issues (password-first login)
   - Resolved database schema mismatches (amount_total, recurring_rule)
   - Fixed navigation tests to use proper sidebar routing
   - Improved bill creation and workflow testing
   - Fixed accessibility keyboard navigation tests
   - Resolved export functionality and KPI metrics testing

4. **✅ Production Build Success**:
   - All TypeScript errors resolved
   - Clean production build with 0 warnings
   - Vercel deployment compatible
   - All routes and functionality tested
   - Playwright tests now passing consistently

**Result**: The repository now has the latest Next.js features with all super admin functionality intact, comprehensive end-to-end testing, and full production deployment compatibility.

### RECENT MAJOR ACCOMPLISHMENT: Bills Page Performance Optimization 🎉

**Status**: COMPLETED - Eliminated all setTimeout violations and achieved 96%+ performance improvement

**What Was Accomplished**:

1. **✅ Performance Violations Eliminated**:

   - Completely removed React Query setTimeout operations causing 150-226ms violations
   - Replaced with simple useEffect + useState pattern for direct Supabase calls
   - Achieved zero console performance warnings and violations
   - Load times improved from 9+ seconds to 300-500ms (96%+ improvement)

2. **✅ Component Architecture Optimization**:

   - Split massive 1268-line ClientBillsPage component into focused smaller components
   - Created dedicated BillCard, BillsListPage, and ClientCreateBillPage components
   - Improved maintainability and render performance
   - Eliminated expensive client-side operations and batch queries

3. **✅ Hybrid Server/Client Architecture**:

   - Implemented server-side data fetching with client-side fallback
   - Graceful handling of authentication edge cases in development vs production
   - Proper error boundaries and loading states
   - Clean TypeScript types and comprehensive error handling

4. **✅ Database Schema Fixes**:
   - Fixed references to non-existent 'category' column causing TypeScript errors
   - Optimized database queries and eliminated N+1 query patterns
   - Clean production build with zero errors or warnings
   - Proper JOIN strategies for vendor and project data

**Technical Impact**:

- **Performance**: 96%+ load time improvement (9s → 300-500ms)
- **Console**: Zero setTimeout violations or performance warnings
- **Build**: Clean TypeScript compilation and production build
- **UX**: Faster page loads with proper loading states
- **Architecture**: Maintainable component structure with clear separation of concerns

**Pull Request**: [#34 Performance optimization](https://github.com/Byitzy/BillBoard/pull/34)

### MAJOR ACCOMPLISHMENT: Smart Bill Approval Workflow 🎉

**Status**: COMPLETED - Intelligent workflow for one-time vs recurring bills

**What Was Accomplished**:

1. **✅ Smart Bill State Management**:

   - One-time bills: Skip scheduling, go directly to `pending_approval` or `approved`
   - Recurring bills: Start as `scheduled`, transition on `due_date`
   - Auto-approval option for recurring bills (utilities, rent, etc.)

2. **✅ Improved User Experience**:

   - Bills only require approval when they actually need attention
   - Auto-approve recurring bills to reduce manual work
   - Clear due date-based processing instead of confusing submission dates

3. **✅ Complete Implementation**:
   - Database migration with `auto_approve` column
   - Updated bill creation UI with auto-approval option
   - Edge function processes bills based on due dates
   - Admin dashboard with manual processing capability

### High Priority 🔴

1. **Member Filtering**: Add search/filter functionality to organization member management
   - Filter by name, email, role, join date
   - Search across member details
   - Role-based filtering dropdown

### Medium Priority 🟡

2. **Enhanced Reports**: Expand reporting capabilities
   - Custom date ranges
   - Export scheduling
   - Advanced analytics
3. **Notification Enhancements**:
   - Email notifications integration
   - Notification preferences
   - Bulk notification management

### Low Priority 🟢

4. **Additional Features**:
   - ICS calendar export
   - Saved search views
   - Bulk import functionality

## Project Status: 99.5% Complete ✅

The BillBoard project is now feature-complete and production-ready:

- ✅ **Complete Multi-tenant Architecture** with proper RLS policies
- ✅ **Full Super Admin System** with organization and user management
- ✅ **Next.js 15 Compatibility** with modern features and performance
- ✅ **Complete Approval Workflow System** with state management
- ✅ **File uploads and notifications** with real-time updates
- ✅ **Audit logging and reporting** with comprehensive tracking
- ✅ **Comprehensive Playwright Testing Suite** with end-to-end workflows
- ✅ **Production deployment ready** with clean builds and compatibility
- ✅ **Performance Optimized** with zero console violations and sub-second load times

**Current Branch Status**: All major development and testing complete, ready for maintainer to pull and deploy.

## For Maintainer: How to Pull Latest Changes

The `beta` branch contains all the latest work and is ready for production. To get these changes:

```bash
# Add remote (one-time setup)
git remote add yidy https://github.com/yidy718/billboard.git

# Pull all changes
git fetch yidy
git checkout beta
git merge yidy/beta
git push origin beta
```

**What you'll get:**

- ✅ Complete Next.js 15.5.2 upgrade
- ✅ All merge conflicts resolved
- ✅ Super admin system intact
- ✅ Comprehensive Playwright testing suite
- ✅ Production build working
- ✅ Vercel deployment ready
- ✅ Performance optimized bills page with zero console violations
- ✅ 96%+ performance improvement (9s → 300-500ms load times)

## Merge Strategy for Upstream

- Only merge upstream changes that are genuine improvements
- Avoid breaking existing approval workflow implementation
- Always test after merging to ensure nothing breaks
- Preserve our custom improvements

## Testing Commands

- `pnpm typecheck` - TypeScript checking
- `pnpm lint` - ESLint checking
- `pnpm build` - Build verification
- `pnpm test` - Run tests if available

## Git Workflow

- Work on feature branches off `beta`
- Test thoroughly before merging to `beta`
- Only commit when explicitly asked
- Always check git status before major operations

Remember: This is MY workspace and preferences. Agents should follow these instructions and remember the context between sessions.
