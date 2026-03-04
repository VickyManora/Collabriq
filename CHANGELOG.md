# Collabriq — Complete Application Changelog

**Date:** 2026-03-04
**Platform:** Angular 21 + Supabase (Auth + Postgres)
**Total Commits:** 4 committed + 1 set of uncommitted changes
**Total Files:** 90+ source files

---

## Table of Contents

1. [Commit 1: Initial Project Scaffold (Phase 1–4)](#commit-1-initial-project-scaffold)
2. [Commit 2: Global Toast Notification System](#commit-2-global-toast-notification-system)
3. [Commit 3: Search and Pagination for All List Views](#commit-3-search-and-pagination-for-all-list-views)
4. [Commit 4: Admin User Detail Page](#commit-4-admin-user-detail-page)
5. [Uncommitted: Account Deactivation Feature](#uncommitted-account-deactivation-feature)

---

## Commit 1: Initial Project Scaffold

**Hash:** `c299e42`
**Message:** `feat: initial project with auto-expiring requirements`
**Files:** 90+ new files
**Scope:** Full MVP — auth, business flow, creator flow, admin flow, DB schema

This is the foundation commit containing the entire Collabriq application.

---

### 1.1 Project Configuration

#### `angular.json`
- Angular CLI project named `collabriq`
- SCSS as the default style preprocessor
- All schematics configured with `skipTests: true` (no test scaffolding)
- Production budgets: 500kB initial warning, 1MB error; 4kB per-component style warning, 8kB error
- Build uses `@angular/build:application` builder
- `inlineStyleLanguage: scss` for inline component styles

#### `package.json`
- **Dependencies:** Angular 21.2.0 (`@angular/core`, `common`, `compiler`, `forms`, `platform-browser`, `router`), `@supabase/supabase-js ^2.98.0`, `rxjs ~7.8.0`, `tslib ^2.3.0`
- **Dev dependencies:** `@angular/build ^21.2.0`, `@angular/cli ^21.2.0`, `@angular/compiler-cli ^21.2.0`, `prettier ^3.8.1`, `typescript ~5.9.2`
- Scripts: `start` (ng serve), `build` (ng build), `watch`, `test`

#### `tsconfig.json` + `tsconfig.app.json`
- Strict TypeScript: `strict: true`, `noImplicitOverride`, `noPropertyAccessFromIndexSignature`, `noImplicitReturns`, `noFallthroughCasesInSwitch`
- Angular strict templates enabled: `strictTemplates: true`, `strictInjectionParameters: true`, `strictInputAccessModifiers: true`
- Target: ES2022, module: preserve

#### `.editorconfig`
- UTF-8, 2-space indent, single quotes for TypeScript

#### `.prettierrc`
- `printWidth: 100`, `singleQuote: true`
- HTML files use Angular parser

---

### 1.2 Global Styles

#### `src/styles.scss`
- Imports `_reset` and `_typography` partials

#### `src/styles/_reset.scss`
- CSS reset: `box-sizing: border-box`, zero margins/padding on all elements
- Normalizes `img`, `svg`, `input`, `button`, `textarea`, `select`, `a`, `ul/ol`
- Removes default button background/border, sets cursor to pointer

#### `src/styles/_typography.scss`
- Sets `body` font-family to `$font-family` (Inter + system fallbacks), base 1rem, `$gray-900` color, `$gray-50` background
- Heading sizes: h1=1.5rem, h2=1.25rem, h3=1.125rem, h4=1rem (scales up at `$breakpoint-md`)

#### `src/styles/_variables.scss`
- **Colors:** `$primary: #6366f1` (indigo), `$primary-dark: #4f46e5`, `$success: #22c55e`, `$warning: #f59e0b`, `$danger: #ef4444`, full gray scale ($gray-50 through $gray-900)
- **Layout:** `$sidebar-width: 260px`, `$header-height: 64px`
- **Breakpoints (mobile-first):** `$breakpoint-sm: 640px`, `$breakpoint-md: 768px`, `$breakpoint-lg: 1024px`
- **Shadows:** `$shadow-sm`, `$shadow`, `$shadow-md`
- **Radii:** `$radius-sm: 6px`, `$radius: 8px`, `$radius-lg: 12px`

#### `src/styles/_mixins.scss`
- `respond-to($breakpoint)`: Mobile-first media query mixin
- `card`: White bg, border, border-radius, 1.5rem padding
- `btn-base`: Inline-flex, centered, 0.625rem/1.25rem padding, radius-sm, 0.875rem font, cursor:pointer, disabled opacity 0.5
- `btn-primary`: Extends btn-base, `$primary` bg, white text, darkens on hover
- `btn-outline`: Extends btn-base, white bg, gray-700 text, gray-300 border, gray-50 on hover
- `input-base`: Full width, 0.625rem/0.875rem padding, gray-300 border, radius-sm, focus ring with primary color

---

### 1.3 Application Bootstrap

#### `src/main.ts`
- Bootstraps `App` component with `appConfig`

#### `src/app/app.ts`
- Root component: `App` (not `AppComponent` — Angular 21 convention)
- Imports `RouterOutlet`, template: `<router-outlet />`

#### `src/app/app.config.ts`
- Provides `provideBrowserGlobalErrorListeners()` and `provideRouter(routes)`

#### `src/app/app.routes.ts`
- **Public routes:** `/auth/*` — lazy-loaded `AUTH_ROUTES`
- **Protected shell:** All other routes wrapped in `Shell` layout, guarded by `authGuard`
  - `/pending-approval` — `PendingApproval` component
  - `/dashboard` — guarded by `approvalGuard`, loads `Dashboard`
  - `/profile` — guarded by `approvalGuard`, loads `ProfileEdit`
  - `/business/*` — guarded by `approvalGuard` + `roleGuard` (role: 'business'), lazy `BUSINESS_ROUTES`
  - `/creator/*` — guarded by `approvalGuard` + `roleGuard` (role: 'creator'), lazy `CREATOR_ROUTES`
  - `/admin/*` — guarded by `approvalGuard` + `roleGuard` (role: 'admin'), lazy `ADMIN_ROUTES`
  - `''` redirects to `dashboard`
- **Wildcard:** `**` redirects to `auth/login`

#### `src/environments/environment.ts`
- Contains `supabaseUrl` and `supabaseAnonKey` placeholders pointing to the Supabase project instance

---

### 1.4 Core Models

#### `src/app/core/models/user.model.ts`
- `UserRole`: `'creator' | 'business' | 'admin'`
- `ApprovalStatus`: `'pending' | 'approved' | 'rejected'`
- `Profile` interface: `id`, `role`, `approval_status`, `email`, `full_name`, `phone`, `bio`, `city`, `business_name`, `business_category`, `instagram_handle`, `portfolio_url`, `is_deleted`, `deleted_at`, `created_at`, `updated_at`

#### `src/app/core/models/requirement.model.ts`
- `RequirementStatus`: 6 states — `'draft' | 'pending_approval' | 'open' | 'partially_filled' | 'closed' | 'cancelled'`
- `Requirement` interface: `id`, `business_id`, `title`, `description`, `category`, `creator_slots`, `filled_slots`, `status`, `compensation_details`, `opened_at`, `closes_at`, `created_at`, `updated_at`

#### `src/app/core/models/application.model.ts`
- `ApplicationStatus`: `'applied' | 'accepted' | 'rejected' | 'withdrawn'`
- `Application` interface: `id`, `requirement_id`, `creator_id`, `status`, `pitch`, `created_at`, `updated_at`

#### `src/app/core/models/deal.model.ts`
- `DealStatus`: `'active' | 'creator_marked_done' | 'completed' | 'cancelled'`
- `Deal` interface: `id`, `requirement_id`, `application_id`, `business_id`, `creator_id`, `status`, `creator_marked_done`, `business_marked_done`, `completed_at`, `created_at`, `updated_at`

#### `src/app/core/models/rating.model.ts`
- `Rating` interface: `id`, `deal_id`, `rater_id`, `ratee_id`, `stars` (1–5), `created_at`

#### `src/app/core/models/notification.model.ts`
- `NotificationType`: 6 types — `'user_approved' | 'requirement_approved' | 'application_received' | 'application_accepted' | 'application_rejected' | 'deal_completed'`
- `Notification` interface: `id`, `user_id`, `type`, `message`, `is_read`, `created_at`

---

### 1.5 Core Guards

#### `src/app/core/guards/auth.guard.ts`
- Functional `CanActivateFn` guard
- Waits for `auth.loading()` to become false (polls every 50ms)
- Returns `true` if `auth.isAuthenticated()`, otherwise redirects to `/auth/login`

#### `src/app/core/guards/approval.guard.ts`
- Functional guard checking `auth.isApproved()`
- If not approved, redirects to `/pending-approval`

#### `src/app/core/guards/role.guard.ts`
- Reads `route.data['role']` to get the required role
- Allows access if user's role matches OR user is `admin`
- Otherwise redirects to `/dashboard`

---

### 1.6 Core Services

#### `src/app/core/services/supabase.service.ts`
- Singleton service wrapping `createClient(environment.supabaseUrl, environment.supabaseAnonKey)`
- Exposes `readonly client: SupabaseClient`

#### `src/app/core/services/auth.service.ts`
- **Signals:** `sessionSignal`, `profileSignal`, `loadingSignal`
- **Computed:** `isAuthenticated`, `userRole`, `isApproved`
- **initAuthListener():** Gets initial session, loads profile, sets loading to false. Subscribes to `onAuthStateChange` for session changes.
- **loadProfile(userId):** Fetches profile from `profiles` table filtered by `is_deleted = false`
- **signUp(email, password, metadata):** Calls `supabase.auth.signUp` with user metadata (full_name, role, business_name/instagram_handle)
- **signIn(email, password):** Calls `supabase.auth.signInWithPassword`
- **signOut():** Signs out and navigates to `/auth/login`
- **refreshProfile():** Reloads the profile from the database

#### `src/app/core/services/requirement.service.ts` (Business service)
- **Types:** `BusinessDealWithDetails` (Deal + requirement title + creator details)
- **getMyRequirements():** Fetches all requirements for the logged-in business
- **getRequirement(id):** Single requirement by ID
- **createRequirement(data):** Inserts new requirement with `status: 'draft'`
- **updateRequirement(id, data):** Partial update on a requirement
- **submitForApproval(id):** Sets status to `'pending_approval'`
- **cancelRequirement(id):** Sets status to `'cancelled'`
- **getApplicationsForRequirement(id):** Fetches applications with creator profile info (name, email, phone, instagram, portfolio)
- **acceptApplication(id):** Sets application status to `'accepted'` (DB trigger auto-creates deal and increments filled_slots)
- **rejectApplication(id):** Sets application status to `'rejected'`
- **getMyRequirementCounts():** Returns `{ active, total }` counts for the business dashboard
- **getMyDealCount():** Count of active/creator_marked_done deals
- **getMyDeals():** All business deals with creator details
- **markDealDone(id):** Sets `business_marked_done: true` (DB trigger may complete the deal)
- **getMyRatingForDeal(dealId):** Check if business already rated
- **rateCreator(dealId, rateeId, stars):** Insert a rating
- **getCreatorAverageRating(creatorId):** Returns `{ avg, count }` for a creator

#### `src/app/core/services/creator.service.ts`
- **Types:** `RequirementWithBusiness`, `ApplicationWithRequirement`, `DealWithDetails`
- **getOpenRequirements():** Fetches requirements with status `open` or `partially_filled`, joined with business name
- **getRequirement(id):** Single requirement for viewing
- **getMyApplicationForRequirement(requirementId):** Checks if creator already applied
- **applyToRequirement(requirementId, pitch):** Inserts application with `status: 'applied'`
- **getMyApplications():** All creator's applications with requirement title/status/category
- **withdrawApplication(id):** Sets status to `'withdrawn'`
- **getMyDeals():** All creator deals with business contact details
- **markDealDone(id):** Sets `creator_marked_done: true` and `status: 'creator_marked_done'`
- **rateBusiness(dealId, rateeId, stars):** Insert a rating for the business
- **getMyRatingForDeal(dealId):** Check if already rated
- **getCreatorDashboardCounts():** Returns `{ openRequirements, pendingApplications, activeDeals }`

#### `src/app/core/services/admin.service.ts`
- **Types:** `ProfileWithRole`, `RequirementWithBusiness`, `DealWithDetails`
- **getPendingUsers():** Profiles where `approval_status = 'pending'` and `is_deleted = false`
- **getAllUsers():** All profiles (initially filtered by `is_deleted = false`, later changed — see Commit 5)
- **approveUser(id):** Sets `approval_status: 'approved'`
- **rejectUser(id):** Sets `approval_status: 'rejected'`
- **getPendingRequirements():** Requirements with `status: 'pending_approval'`, joined with business name
- **getAllRequirements():** All requirements with business name
- **approveRequirement(id):** Sets status to `'open'` and `opened_at` to now
- **rejectRequirement(id):** Sets status to `'cancelled'`
- **getAllDeals():** All deals with requirement title, business name, creator name
- **cancelDeal(id):** Sets deal status to `'cancelled'`
- **getDashboardCounts():** Returns `{ pendingUsers, pendingRequirements, activeDeals }` using head-only count queries

#### `src/app/core/services/notification.service.ts`
- **Signal-based state:** `notificationsSignal`, `unreadCount` computed
- **fetchNotifications():** Fetches last 30 notifications for the logged-in user, ordered by `created_at` desc
- **markAsRead(id):** Optimistic update + Supabase update
- **markAllAsRead():** Batch optimistic update + Supabase update on all unread IDs

---

### 1.7 Shared Components & Pipes

#### `src/app/shared/pipes/closes-in.pipe.ts`
- Pure pipe `closesIn` transforming a `closes_at` timestamp to human-readable text
- Returns: `'Expired'` if past, `'Closes today'` if <24h, `'Closes tomorrow'` if <48h, `'Closes in N days'` otherwise

---

### 1.8 Layout Components

#### `src/app/layout/shell/shell.ts` + `shell.html` + `shell.scss`
- **Shell** layout component wrapping all authenticated routes
- Contains: `<app-header>`, `<app-sidebar>`, overlay div, `<main>` with `<router-outlet />`
- Sidebar toggle via `sidebarOpen` signal, toggled by header's `menuToggle` event
- Main content: top margin = header height, left margin = sidebar width at `$breakpoint-lg`
- Overlay: semi-transparent black backdrop when sidebar is open on mobile, click closes sidebar

#### `src/app/layout/header/header.ts` + `header.html` + `header.scss`
- **Header** component: fixed top bar with logo, user name, profile link, notification bell, logout button
- Hamburger menu button (hidden on desktop) emits `menuToggle` event
- **Notification dropdown:**
  - Bell icon with red badge showing unread count (max "9+")
  - Click toggles dropdown, fetches fresh notifications on open
  - Dropdown lists notifications with message and timestamp
  - Unread items highlighted with left border and subtle primary background
  - "Mark all read" button in dropdown header
  - Click on notification marks it as read
  - Document click listener closes dropdown when clicking outside
- Profile icon links to `/profile` via `routerLink`

#### `src/app/layout/sidebar/sidebar.ts` + `sidebar.html` + `sidebar.scss`
- **Sidebar** component: fixed left panel, slides in/out on mobile, always visible on desktop
- Uses `input(false)` for `isOpen` state
- **Dynamic navigation items** based on `auth.userRole()`:
  - **Business:** Dashboard, My Requirements, My Deals
  - **Creator:** Dashboard, Browse Requirements, My Applications, My Deals
  - **Admin:** Dashboard, User Approvals, Requirement Approvals, Deals
- Active link highlighted with `routerLinkActive` directive and primary color

---

### 1.9 Auth Feature

#### `src/app/features/auth/auth.routes.ts`
- `/login` → `Login` component
- `/signup` → `Signup` component
- `''` redirects to `login`

#### `src/app/features/auth/login/login.ts` + `login.html` + `login.scss`
- Simple login form: email + password fields
- Error display above form
- Submit calls `auth.signIn()`, on success navigates to `/dashboard`
- Loading state disables button and shows "Signing in..."
- Link to signup page at bottom

#### `src/app/features/auth/signup/signup.ts` + `signup.html` + `signup.scss`
- **Role toggle:** Creator/Business segmented control at top of form
- Common fields: Full Name, Email, Password (min 6 chars)
- **Conditional fields:** Business Name (for business role) OR Instagram Handle (for creator role)
- Submit calls `auth.signUp()` with metadata, on success navigates to `/pending-approval`
- Role toggle styled with pill background, active state has white bg with shadow

#### `src/app/features/auth/pending-approval/pending-approval.ts` + `pending-approval.html` + `pending-approval.scss`
- Shows clock icon (SVG), "Pending Approval" heading, explanation message
- Displays user's name and role
- "Check Status" button: calls `auth.refreshProfile()`, if approved navigates to `/dashboard`
- "Logout" button: calls `auth.signOut()`

---

### 1.10 Dashboard Feature

#### `src/app/features/dashboard/dashboard.ts` + `dashboard.html` + `dashboard.scss`
- Welcome message with user's name
- **Role-based stat cards** in responsive grid (1 col → 2 col → 3 col):
  - **Business:** "Your Requirements" (active count), "Active Deals" (deal count)
  - **Creator:** "Available Requirements" (open count), "Your Applications" (pending count), "Active Deals" (deal count)
  - **Admin:** "Pending Users" (count), "Pending Requirements" (count), "Active Deals" (count)
- Each stat card: uppercase gray label, large bold number, subtle description
- Counts fetched via respective service `getDashboardCounts()`/`getMyRequirementCounts()`/`getCreatorDashboardCounts()`

---

### 1.11 Profile Edit Feature

#### `src/app/features/profile-edit/profile-edit.ts` + `profile-edit.html` + `profile-edit.scss`
- Read-only fields: Email, Role, Status
- Editable fields: Full Name*, Phone, City, Bio (textarea), Portfolio URL, Instagram Handle
- **Business-only fields:** Business Name*, Business Category
- Form validation: Full Name required; Business Name required for business role
- Save: Updates profile via Supabase, refreshes auth profile signal
- Cancel: Navigates back to dashboard
- Max width 720px, card layout with field rows

---

### 1.12 Business Feature (Phase 2)

#### `src/app/features/business/business.routes.ts`
- `/requirements` → `RequirementList`
- `/requirements/new` → `RequirementForm`
- `/requirements/:id/edit` → `RequirementForm` (edit mode)
- `/requirements/:id` → `RequirementDetail`
- `/deals` → `BusinessDeals`
- `''` redirects to `requirements`

#### Requirement List (`requirement-list/`)
- Tab filters: All, Draft, Pending, Open, Closed, Cancelled
- Card grid showing title, status badge, category, slots, compensation, date
- "+ New Requirement" button navigates to form
- Click on card navigates to detail page

#### Requirement Form (`requirement-form/`)
- Dual-mode: Create and Edit (detects `:id` route param)
- Fields: Title*, Description* (textarea), Category (select: Food Review, Reel, Photoshoot, Blog Post, Social Media Post, Other), Creator Slots (1–10 number input), Compensation Details (textarea)
- Edit mode: Loads existing requirement, only allows editing `draft` requirements
- Save creates/updates requirement, navigates to detail page
- "Submit for Approval" button on edit mode sets status to `pending_approval`

#### Requirement Detail (`requirement-detail/`)
- Displays all requirement info: title, status badge, description, category, slots, compensation, dates
- **Action buttons** based on status:
  - Draft: "Edit" + "Submit for Approval" + "Cancel"
  - Pending: "Cancel"
  - Open/Partially Filled: "Cancel"
- **Applications section:** Shows all applicants with name, email, phone, instagram, portfolio, pitch text, applied date
  - Accept/Reject buttons on each `applied` application
  - Accepted applications show green badge, rejected show red
- ClosesIn pipe shows countdown for `closes_at`

#### Business Deals (`business-deals/`)
- Tab filters: All, Active, Completed, Cancelled
- Deal cards showing: requirement title, status badge, creator name/email/phone, start date
- **Actions:**
  - "Mark as Done" button for active deals (business side of dual confirmation)
  - Rating form for completed deals: 5-star selector + submit
  - "Your rating" display for already-rated deals
- Contact details (email, phone, instagram, portfolio) shown for each creator

---

### 1.13 Creator Feature (Phase 3)

#### `src/app/features/creator/creator.routes.ts`
- `/browse` → `BrowseRequirements`
- `/browse/:id` → `RequirementView`
- `/applications` → `MyApplications`
- `/deals` → `MyDeals`
- `''` redirects to `browse`

#### Browse Requirements (`browse-requirements/`)
- Category tab filters: All, Food Review, Reel, Photoshoot, Blog Post, Social Media Post, Other
- Card grid: title, category badge, business name, compensation, slots available, closes in countdown
- Click navigates to requirement view

#### Requirement View (`requirement-view/`)
- Full requirement details: title, category, business name, description, slots, compensation, dates
- **Application section:**
  - If not applied: Shows pitch textarea + "Apply" button
  - If already applied: Shows application status badge, pitch, applied date
  - If accepted: Shows congratulations message with link to deals
  - If status is `applied`: "Withdraw Application" button with confirmation dialog

#### My Applications (`my-applications/`)
- Tab filters: All, Applied, Accepted, Rejected, Withdrawn
- Cards: requirement title, status badge, category, pitch preview (truncated to 100 chars), applied date
- "Withdraw" button on applied applications
- Click navigates to requirement view

#### My Deals (`my-deals/`)
- Tab filters: All, Active, Completed, Cancelled
- Deal cards: requirement title, status badge, business name/email/phone, start date
- **Actions:**
  - "Mark as Done" button for active deals (creator side)
  - Waiting message when `creator_marked_done` but business hasn't confirmed
  - Rating form for completed deals: 5-star selector
  - "Your rating" display for already-rated deals

---

### 1.14 Admin Feature (Phase 4)

#### `src/app/features/admin/admin.routes.ts`
- `/users` → `UserApprovals`
- `/requirements` → `RequirementApprovals`
- `/deals` → `DealMonitor`
- `''` redirects to `users`

#### User Approvals (`user-approvals/`)
- Tab filters: Pending, All Users
- User cards: name, status badge (Pending/Approved/Rejected), email, role badge (creator=purple, business=blue, admin=gray), city, business name/instagram, registered date
- Approve/Reject action buttons on pending users

#### Requirement Approvals (`requirement-approvals/`)
- Tab filters: Pending, All
- Requirement cards: title, status badge, business name, category, slots, compensation, description preview, date
- Approve/Reject action buttons on pending requirements

#### Deal Monitor (`deal-monitor/`)
- Tab filters: All, Active, Completed, Cancelled
- Deal cards: requirement title, status badge, business name, creator name, dates, dual-confirmation status checkmarks
- "Cancel Deal" button on active/creator_marked_done deals

---

### 1.15 Database Schema (`supabase/schema.sql`)

#### Enums
- `user_role`: creator, business, admin
- `approval_status`: pending, approved, rejected
- `requirement_status`: draft, pending_approval, open, partially_filled, closed, cancelled
- `application_status`: applied, accepted, rejected, withdrawn
- `deal_status`: active, creator_marked_done, completed, cancelled

#### Tables
- **profiles:** Links to `auth.users(id)` with CASCADE delete. Includes `is_deleted` and `deleted_at` for soft-delete. Default city = 'Pune'.
- **requirements:** FK to profiles. `creator_slots` CHECK 1–10, `filled_slots` default 0. `opened_at` and `closes_at` for auto-expiration.
- **applications:** FK to requirements and profiles. UNIQUE constraint on `(requirement_id, creator_id)` — one application per creator per requirement.
- **deals:** FK to requirements, applications, and profiles (both business and creator). Dual-confirmation flags: `creator_marked_done`, `business_marked_done`.
- **ratings:** FK to deals and profiles. `stars` CHECK 1–5. UNIQUE on `(deal_id, rater_id)`.

#### Indexes
- Partial indexes on profiles: `idx_profiles_role` and `idx_profiles_approval` with `WHERE is_deleted = FALSE`
- Requirement indexes: by business_id, by status, and `closes_at` for open/partially_filled
- Application indexes: by requirement_id, creator_id, status
- Deal indexes: by business_id, creator_id, status
- Rating index: by ratee_id

#### Triggers & Business Logic
1. **`set_updated_at()`:** Utility trigger to auto-update `updated_at` on row changes (applied to profiles, applications, deals)
2. **`handle_new_user()`:** After INSERT on `auth.users`, auto-creates a profile row with email, name, role from `raw_user_meta_data`
3. **`handle_requirement_status_change()`:** Before UPDATE on requirements:
   - Sets `opened_at` and `closes_at` (now + 15 days) when status changes to 'open'
   - Auto-transitions to `partially_filled` when `filled_slots > 0 && < creator_slots`
   - Auto-transitions to `closed` when `filled_slots >= creator_slots`
4. **`check_active_requirement_limit()`:** Enforces max 3 active requirements per business (pending_approval + open + partially_filled)
5. **`handle_application_accepted()`:** When application status changes to 'accepted':
   - Increments `filled_slots` on the requirement
   - Auto-creates a deal row linking requirement, application, business, and creator
6. **`handle_deal_completion()`:** Before UPDATE on deals:
   - When `creator_marked_done` flips to true → sets status to `creator_marked_done`
   - When both `creator_marked_done` and `business_marked_done` are true → sets status to `completed` and `completed_at = now()`

#### Helper Functions
- **`get_my_role()`:** Returns the role of the current auth user (filtered by `is_deleted = FALSE`). Used in RLS policies.
- **`is_approved()`:** Returns true if current user's `approval_status = 'approved'` (filtered by `is_deleted = FALSE`). Used in RLS policies.
- **`get_contact_details(target_user_id)`:** Returns email/phone only if the caller has an active/completed deal with the target user. Checks `is_deleted = FALSE`.

#### Row Level Security (RLS)
All 5 tables have RLS enabled. Key policies:

**Profiles:**
- Anyone can read non-deleted profiles (`is_deleted = FALSE`)
- Users can update their own profile
- Admins can update any profile

**Requirements:**
- Approved users can read open/partially_filled requirements
- Business reads own requirements (any status)
- Admins read all
- Business can create (must be approved, role = business)
- Business can update own; admins can update any

**Applications:**
- Creator reads own applications
- Business reads applications to their own requirements
- Admins read all
- Creator can apply (must be approved, role = creator)
- Creator can update own; business can update applications to own requirements

**Deals:**
- Both parties (business + creator) can read and update
- Admins read all and can update

**Ratings:**
- Anyone can read
- Only deal parties can rate on completed deals

---

## Commit 2: Global Toast Notification System

**Hash:** `7c69f68`
**Message:** `feat: add global toast notification system`
**Files changed:** 25 (3 new + 22 modified)

### New Files

#### `src/app/core/services/toast.service.ts`
- Injectable singleton with signal-based state
- `Toast` interface: `{ id: number, type: 'success' | 'error', message: string }`
- `_toasts` signal holds active toasts array
- `success(message)`: Creates toast with 3-second auto-dismiss
- `error(message)`: Creates toast with 5-second auto-dismiss
- `dismiss(id)`: Removes a toast by ID
- Auto-incrementing `nextId` counter

#### `src/app/shared/toast/toast.ts` + `toast.html` + `toast.scss`
- **Toast** component injecting `ToastService`
- Template iterates `toast.toasts()`, renders each with type-based class
- Each toast has message text and dismiss "x" button
- **Styling:**
  - Fixed position: top-right, below header (top = $header-height + 12px)
  - Max width 360px, responsive width
  - Success: green background (#dcfce7), dark green text (#166534)
  - Error: red background (#fee2e2), dark red text (#991b1b)
  - `toast-slide-in` animation: slides from right with opacity fade (0.25s ease-out)

#### `src/app/shared/confirm-dialog/confirm-dialog.ts` + `confirm-dialog.html` + `confirm-dialog.scss`
- **ConfirmDialog** reusable modal component
- Inputs: `message` (default "Are you sure?"), `visible` (boolean)
- Outputs: `confirmed`, `cancelled`
- Template: Full-screen overlay with centered white card
- Backdrop click or Cancel button emits `cancelled`
- Confirm button: red (`$danger`) background
- Z-index: 1000 (above everything)

### Modified Files — Toast Integration

Every component that performs async actions was updated to:
1. Import `ToastService`
2. Show `toast.success()` on successful operations
3. Show `toast.error()` on failed operations

**Components updated with toast notifications:**
- `deal-monitor.ts` — cancel deal success/error
- `requirement-approvals.ts` — approve/reject requirement success/error
- `user-approvals.ts` — approve/reject user success/error
- `business-deals.ts` — mark done, rate creator success/error
- `requirement-detail.ts` — submit for approval, cancel, accept/reject application success/error
- `requirement-form.ts` — create/update requirement success/error
- `requirement-list.ts` — (service import for consistency)
- `browse-requirements.ts` — load error
- `my-applications.ts` — withdraw success/error
- `my-deals.ts` — mark done, rate business success/error
- `requirement-view.ts` — apply, withdraw success/error
- `profile-edit.ts` — save profile success/error

### Modified Files — Confirm Dialog Integration

Destructive actions now require confirmation via `ConfirmDialog`:
- `requirement-view.ts` — Withdraw application confirmation
- `profile-edit.html` — Removed 4 lines of inline error display that were replaced by toast

### Shell Update

#### `src/app/layout/shell/shell.ts` + `shell.html`
- Added `Toast` to imports
- Added `<app-toast />` at the end of shell template (renders toasts globally)

---

## Commit 3: Search and Pagination for All List Views

**Hash:** `79c18c9`
**Message:** `feat: add search and pagination to all list views`
**Files changed:** 19 (3 new + 16 modified)

### New Shared Component

#### `src/app/shared/pagination/pagination.ts` + `pagination.html` + `pagination.scss`
- **Pagination** component with Angular signal-based inputs
- Inputs: `currentPage` (required), `totalItems` (required), `pageSize` (default 10)
- Output: `pageChange` emitting new page number
- Computed: `totalPages`, `hasPrev`, `hasNext`
- Template: "Prev" button, "Page X of Y" text, "Next" button — only rendered when `totalPages > 1`
- Styled with `btn-outline` mixin, centered flex layout

### Pattern Applied to All List Views

Every list view received the same 3 enhancements:

**A. Search Input** — Added at top of each list:
```html
<input type="text" placeholder="Search by ..." [ngModel]="searchQuery()" (ngModelChange)="onSearch($event)" />
```

**B. Pagination** — Added at bottom of each list:
```html
<app-pagination [currentPage]="currentPage()" [totalItems]="filtered().length" [pageSize]="pageSize" (pageChange)="currentPage.set($event)" />
```

**C. `paged` computed signal** — Slices the `filtered` array by current page:
```typescript
paged = computed(() => {
  const start = (this.currentPage() - 1) * this.pageSize;
  return this.filtered().slice(start, start + this.pageSize);
});
```

**D. Template updated** — `@for` loops changed from iterating `filtered()` to `paged()`.

**E. Search logic** — `filtered` computed updated to include text search on relevant fields.

### Views Updated (8 list views)

| View | Search Fields | Page Size |
|------|--------------|-----------|
| **User Approvals** | name, email, business name | 10 |
| **Requirement Approvals** | title, category | 10 |
| **Deal Monitor** | creator name, business name | 10 |
| **Business Deals** | creator name | 10 |
| **Requirement Detail** (applications sub-list) | applicant name, email | 10 |
| **Browse Requirements** | title, category | 10 |
| **My Applications** | requirement title, category | 10 |
| **My Deals** | business name | 10 |

### Additional Changes in This Commit

- **Empty state messages updated:** Now account for active search queries (e.g., "No requirements found" vs "Try a different search term")
- **User Approvals:** `viewUser(userId)` method added — navigates to `/admin/users/:id` on card click
- **User Approvals HTML:** Card div now has `(click)="viewUser(user.id)"` binding
- **Approve/Reject buttons:** Updated with `$event.stopPropagation()` to prevent card click navigation when clicking action buttons
- **Destructive actions get confirm dialogs:** Requirement reject, deal cancel, requirement cancel — all wrapped with `ConfirmDialog` and `confirmAction` signal pattern
- **FormsModule added** to all components that gained search inputs (for `ngModel`)
- **SCSS updates:** Each list view's SCSS gained a `&__search` block with `@include input-base; margin-bottom: 1rem`

---

## Commit 4: Admin User Detail Page

**Hash:** `0303db9`
**Message:** `feat: add admin user detail page`
**Files changed:** 5 (3 new + 2 modified)

### New Files

#### `src/app/features/admin/user-detail/user-detail.ts`
- **UserDetail** component: Full profile view for admins
- **Signals:** `user`, `deals`, `requirements`, `loading`, `actionLoading`, `error`, `confirmAction`, `dealsPage`, `reqsPage`
- **loadUser(id):** Fetches user profile via `adminService.getUserById(id)`
- **loadRelatedData(userId, role):** Parallel loads deals + requirements (requirements only for business users)
- **Actions:**
  - `approve()`: Approves pending user, updates signal
  - `promptReject()` / `onConfirmReject()`: Reject with confirmation dialog
  - `promptDeactivate()` / `onConfirmDeactivate()`: Deactivate with confirmation dialog (calls `adminService.deactivateUser()`)
- **Computed getters:** `canApprove` (pending), `canReject` (pending), `canDeactivate` (not already deleted)
- **Confirm dialog routing:** `onConfirm()` dispatches to reject or deactivate based on `confirmAction()` value; `confirmMessage` getter returns appropriate warning text
- **Pagination:** Separate `dealsPage` and `reqsPage` signals, `pagedDeals()` and `pagedRequirements()` methods, both with `pageSize = 10`
- **Label helpers:** `statusLabel()`, `dealStatusLabel()`, `reqStatusLabel()`, `dealBusinessName()`

#### `src/app/features/admin/user-detail/user-detail.html`
- Back button navigating to `/admin/users`
- **Profile card:**
  - Name heading with role badge + approval status badge
  - Deactivated badge shown when `is_deleted` is true
  - Info grid: email, city, phone, instagram, business name, business category, portfolio URL (as link), bio, registered date
  - Action buttons section: Approve (primary), Reject (danger outline), Deactivate User (dark gray)
- **Deals section:**
  - Shows deal count in header
  - Mini-cards: requirement title, status badge, business name, creator name, date
  - Paginated with `<app-pagination>`
- **Requirements section** (business role only):
  - Shows requirement count in header
  - Mini-cards: title, status badge, category, slots, date
  - Paginated with `<app-pagination>`
- Confirmation dialog at bottom for reject/deactivate actions

#### `src/app/features/admin/user-detail/user-detail.scss`
- 255 lines of styles
- **user-detail** block: max-width 800px, back button, profile card, info grid, action buttons, section headings
- **Role badges:** creator=purple (#ede9fe), business=blue (#dbeafe), admin=gray
- **Status badges:** pending=yellow, approved=green, rejected=red, deactivated=dark gray ($gray-800)
- **mini-card** block: Compact card for deals/requirements with title, badge, and metadata row
- **Mini-card badges:** Covers all statuses — active/open=green, completed/closed=gray, cancelled=red, creator_marked_done/partially_filled=blue, draft=light gray, pending_approval=yellow

### Modified Files

#### `src/app/features/admin/admin.routes.ts`
- Added new route: `{ path: 'users/:id', loadComponent: () => import('./user-detail/user-detail').then((m) => m.UserDetail) }`
- Inserted between `/users` (list) and `/requirements`

#### `src/app/core/services/admin.service.ts`
- **New types:**
  - `UserDeal`: Deal + requirement title + business name + creator name
  - `UserRequirement`: Requirement + business name
- **New methods:**
  - `getUserById(id)`: Fetches single profile by ID (`.single<Profile>()`)
  - `getUserDeals(userId)`: Fetches all deals where user is either business or creator (`.or(\`business_id.eq.\${userId},creator_id.eq.\${userId}\`)`)
  - `getUserRequirements(userId)`: Fetches all requirements by business_id
  - `deactivateUser(id)`: Sets `is_deleted: true` and `deleted_at` to current timestamp

---

## Uncommitted: Account Deactivation Feature

**Base:** `0303db9`
**Files changed:** 9
**Scope:** Self-service account deactivation + admin deactivated users tab

### Changes

#### 1. `supabase/schema.sql` — New RLS policy
```sql
CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT
  USING (public.get_my_role() = 'admin');
```
**Why:** Allows admins to see soft-deleted profiles. Non-admins are still blocked by the existing `"Anyone can read non-deleted profiles"` policy which enforces `is_deleted = FALSE`.

**Pre-existing schema support (already in place from Commit 1):**
- `is_deleted BOOLEAN NOT NULL DEFAULT FALSE` column on profiles
- `deleted_at TIMESTAMPTZ` column on profiles
- Partial indexes with `WHERE is_deleted = FALSE`
- Helper functions `get_my_role()` and `is_approved()` checking `is_deleted = FALSE`
- `get_contact_details()` checking `is_deleted = FALSE`

#### 2. `src/app/core/services/auth.service.ts` — New method
```typescript
async deactivateMyAccount(): Promise<{ error: Error | null }> {
  const profile = this.profileSignal();
  if (!profile) return { error: new Error('No profile loaded') };

  const { error } = await this.supabase
    .from('profiles')
    .update({ is_deleted: true, deleted_at: new Date().toISOString() })
    .eq('id', profile.id);

  if (error) return { error };
  await this.signOut();
  return { error: null };
}
```
**Flow:** Set `is_deleted=true` + `deleted_at=now` → sign out → redirect to login.
**Protection:** `loadProfile()` already filters `is_deleted = false`, blocking re-login.

#### 3. `src/app/core/services/admin.service.ts` — Removed `is_deleted` filter
```typescript
// getAllUsers() BEFORE:
.eq('is_deleted', false)  // <-- REMOVED

// getAllUsers() AFTER:
// No is_deleted filter — fetches all profiles including deactivated
```
**Why:** Admin's User Approvals page needs deactivated users for the new "Deactivated" tab. RLS policy ensures only admins can actually fetch deleted profiles.

#### 4. `src/app/features/profile-edit/profile-edit.ts` — Deactivation UI logic
- Added `ConfirmDialog` import and to component imports array
- New signals: `showDeactivateConfirm`, `deactivating`
- New methods: `promptDeactivate()`, `onConfirmDeactivate()`, `onCancelDeactivate()`
- `onConfirmDeactivate()` calls `auth.deactivateMyAccount()`, shows error toast on failure

#### 5. `src/app/features/profile-edit/profile-edit.html` — Danger zone UI
- New "Danger Zone" section after the form: heading (red), warning text, "Deactivate My Account" button
- New `<app-confirm-dialog>` with detailed warning message

#### 6. `src/app/features/profile-edit/profile-edit.scss` — Danger zone styles
- `&__danger-zone`: top border separator, red heading, muted description
- `&__deactivate-btn`: dark gray button (`$gray-800`), darkens on hover

#### 7. `src/app/features/admin/user-approvals/user-approvals.ts` — Deactivated tab
- `FilterTab` type expanded: `'pending' | 'all'` → `'pending' | 'all' | 'deactivated'`
- New tab: `{ label: 'Deactivated', value: 'deactivated' }`
- Filter logic updated:
  - Pending: excludes deleted users
  - Deactivated: shows only `is_deleted === true`
  - All: shows only non-deleted

#### 8. `src/app/features/admin/user-approvals/user-approvals.html` — Deactivated badge
- Badge now conditional: `@if (user.is_deleted)` shows dark "Deactivated" badge, `@else` shows normal status badge

#### 9. `src/app/features/admin/user-approvals/user-approvals.scss` — Badge style
```scss
&--deactivated {
  background: $gray-800;
  color: $white;
}
```

---

## Complete File Inventory

### Configuration (6 files)
| File | Purpose |
|------|---------|
| `angular.json` | Angular CLI config, build budgets |
| `package.json` | Dependencies, scripts |
| `tsconfig.json` | TypeScript base config |
| `tsconfig.app.json` | App-specific TS config |
| `.editorconfig` | Editor formatting rules |
| `.prettierrc` | Prettier formatting config |

### Styles (4 files)
| File | Purpose |
|------|---------|
| `src/styles.scss` | Entry point, imports reset + typography |
| `src/styles/_reset.scss` | CSS reset |
| `src/styles/_typography.scss` | Base font and heading sizes |
| `src/styles/_variables.scss` | Colors, breakpoints, shadows, radii |
| `src/styles/_mixins.scss` | Reusable mixins (card, buttons, inputs, responsive) |

### Core (19 files)
| File | Purpose |
|------|---------|
| `src/main.ts` | Bootstrap entry |
| `src/app/app.ts` | Root component |
| `src/app/app.html` | Root template |
| `src/app/app.config.ts` | App providers |
| `src/app/app.routes.ts` | Top-level routing |
| `src/environments/environment.ts` | Supabase credentials |
| `src/app/core/guards/auth.guard.ts` | Authentication guard |
| `src/app/core/guards/approval.guard.ts` | Approval status guard |
| `src/app/core/guards/role.guard.ts` | Role-based access guard |
| `src/app/core/models/user.model.ts` | Profile types |
| `src/app/core/models/requirement.model.ts` | Requirement types |
| `src/app/core/models/application.model.ts` | Application types |
| `src/app/core/models/deal.model.ts` | Deal types |
| `src/app/core/models/rating.model.ts` | Rating types |
| `src/app/core/models/notification.model.ts` | Notification types |
| `src/app/core/services/supabase.service.ts` | Supabase client wrapper |
| `src/app/core/services/auth.service.ts` | Auth + profile management |
| `src/app/core/services/requirement.service.ts` | Business requirements + deals |
| `src/app/core/services/creator.service.ts` | Creator browse + apply + deals |
| `src/app/core/services/admin.service.ts` | Admin approvals + monitoring |
| `src/app/core/services/notification.service.ts` | In-app notifications |
| `src/app/core/services/toast.service.ts` | Toast notification service |

### Layout (9 files)
| File | Purpose |
|------|---------|
| `src/app/layout/shell/shell.{ts,html,scss}` | Main layout wrapper |
| `src/app/layout/header/header.{ts,html,scss}` | Top navigation bar |
| `src/app/layout/sidebar/sidebar.{ts,html,scss}` | Side navigation |

### Shared (10 files)
| File | Purpose |
|------|---------|
| `src/app/shared/toast/toast.{ts,html,scss}` | Toast notification display |
| `src/app/shared/confirm-dialog/confirm-dialog.{ts,html,scss}` | Reusable confirmation modal |
| `src/app/shared/pagination/pagination.{ts,html,scss}` | Reusable pagination control |
| `src/app/shared/pipes/closes-in.pipe.ts` | Countdown pipe for requirement deadlines |

### Auth Feature (10 files)
| File | Purpose |
|------|---------|
| `src/app/features/auth/auth.routes.ts` | Auth routing |
| `src/app/features/auth/login/login.{ts,html,scss}` | Login page |
| `src/app/features/auth/signup/signup.{ts,html,scss}` | Signup page |
| `src/app/features/auth/pending-approval/pending-approval.{ts,html,scss}` | Waiting room |

### Dashboard + Profile (6 files)
| File | Purpose |
|------|---------|
| `src/app/features/dashboard/dashboard.{ts,html,scss}` | Role-based dashboard |
| `src/app/features/profile-edit/profile-edit.{ts,html,scss}` | Profile editing + deactivation |

### Business Feature (13 files)
| File | Purpose |
|------|---------|
| `src/app/features/business/business.routes.ts` | Business routing |
| `src/app/features/business/requirement-list/requirement-list.{ts,html,scss}` | My Requirements list |
| `src/app/features/business/requirement-form/requirement-form.{ts,html,scss}` | Create/edit requirement |
| `src/app/features/business/requirement-detail/requirement-detail.{ts,html,scss}` | Requirement detail + applications |
| `src/app/features/business/business-deals/business-deals.{ts,html,scss}` | Business deals management |

### Creator Feature (13 files)
| File | Purpose |
|------|---------|
| `src/app/features/creator/creator.routes.ts` | Creator routing |
| `src/app/features/creator/browse-requirements/browse-requirements.{ts,html,scss}` | Browse open requirements |
| `src/app/features/creator/requirement-view/requirement-view.{ts,html,scss}` | View + apply to requirement |
| `src/app/features/creator/my-applications/my-applications.{ts,html,scss}` | My applications list |
| `src/app/features/creator/my-deals/my-deals.{ts,html,scss}` | Creator deals management |

### Admin Feature (13 files)
| File | Purpose |
|------|---------|
| `src/app/features/admin/admin.routes.ts` | Admin routing |
| `src/app/features/admin/user-approvals/user-approvals.{ts,html,scss}` | User approval + deactivated tab |
| `src/app/features/admin/user-detail/user-detail.{ts,html,scss}` | Admin user detail view |
| `src/app/features/admin/requirement-approvals/requirement-approvals.{ts,html,scss}` | Requirement approval |
| `src/app/features/admin/deal-monitor/deal-monitor.{ts,html,scss}` | Deal monitoring |

### Database (1 file)
| File | Purpose |
|------|---------|
| `supabase/schema.sql` | Full PostgreSQL schema with RLS |

---

## Build Status

```
ng build → SUCCESS (no errors)
```

7 SCSS budget warnings on component styles exceeding 4kB soft limit (non-blocking).
