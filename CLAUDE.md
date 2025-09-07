# BillBoard Development - Personal Agent Instructions

## Project Context
- Fork of Byitzy/BillBoard, working on improvements and fixes
- Upstream: https://github.com/Byitzy/BillBoard.git
- Origin: https://github.com/yidy718/billboard.git
- Main development branch: `beta`
- Current feature branch: `feature/approval-workflow-system`

## What's Been Implemented (Based on Current State)
- ✅ Basic project structure with Next.js 14, TypeScript, Tailwind
- ✅ Supabase integration and auth setup
- ✅ Multi-tenant organization system with RLS
- ✅ Core data models: organizations, members, vendors, projects, bills
- ✅ Approval workflow system (feature branch)
- ✅ Organization invite system with email invitations
- ✅ UI components with shadcn/ui and dark mode
- ✅ Dashboard with KPI metrics
- ✅ Calendar view with bill occurrences
- ✅ Bill management and forms
- ✅ Vendor management
- ✅ Project management
- ✅ CSV/PDF export functionality
- ✅ Internationalization setup (en-CA/fr-CA)
- ✅ Quebec business days handling

## My Development Preferences
1. **Always use TodoWrite** to track complex tasks and show progress
2. **Check existing patterns** before implementing - look at neighboring files
3. **Follow the existing codebase conventions** exactly
4. **Run type checking** after changes: `pnpm typecheck`
5. **Test builds** before considering tasks complete: `pnpm build`
6. **Prefer editing existing files** over creating new ones unless necessary
7. **Keep implementations consistent** with the project's architecture

## Current Priority Areas
1. Complete the approval workflow system on current branch
2. Resolve any merge conflicts with upstream improvements
3. Ensure all TypeScript errors are fixed
4. Maintain compatibility with existing features

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