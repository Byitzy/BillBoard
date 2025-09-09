# BillBoard Development - Personal Agent Instructions

## Project Context
- Fork of Byitzy/BillBoard, working on improvements and fixes
- Upstream: https://github.com/Byitzy/BillBoard.git
- Origin: https://github.com/yidy718/billboard.git
- Main development branch: `beta`
- Current feature branch: `feature/approval-workflow-system`

## What's Been Implemented (Based on Current State)

### Core Infrastructure ✅
- ✅ Next.js 14 with TypeScript and App Router
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

## My Development Preferences
1. **Always use TodoWrite** to track complex tasks and show progress
2. **Check existing patterns** before implementing - look at neighboring files
3. **Follow the existing codebase conventions** exactly
4. **Run type checking** after changes: `pnpm typecheck`
5. **Test builds** before considering tasks complete: `pnpm build`
6. **Prefer editing existing files** over creating new ones unless necessary
7. **Keep implementations consistent** with the project's architecture

## Remaining Development Tasks

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
4. **Performance Optimizations**:
   - Database query optimization
   - Caching strategies
   - Bundle size improvements
   
5. **Additional Features**:
   - ICS calendar export
   - Saved search views
   - Bulk import functionality

## Project Status: 95% Complete ✅

The BillBoard project is feature-complete for MVP with all core functionality implemented:
- ✅ Multi-tenant architecture with proper RLS
- ✅ Complete approval workflow system  
- ✅ File uploads and notifications
- ✅ Audit logging and reporting
- ✅ Production deployment ready

Only minor enhancements remain for full feature parity with specifications.

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