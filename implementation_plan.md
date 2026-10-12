# Implementation Plan — Supabase Auth & Member POV Dashboard

---

## Overview

Add full authentication and dual-role experience on top of the existing LedgerOne admin shell. The app will:
1. Start on a **Login page** (unauthenticated state)
2. Detect the logged-in user's **role** (`admin` / `member`) from a `profiles` table
3. Route **Admins** → existing Admin Dashboard (all pages)
4. Route **Members** → new Member Dashboard (personal data only)

---

## Proposed Architecture

```
LoginPage (unauthenticated)
    ↓ signInWithPassword
AuthContext (global auth state + role)
    ├── role === "admin"  → AdminLayout (current Sidebar + Navbar + pages)
    └── role === "member" → MemberLayout (Member Sidebar + Navbar + pages)
```

---

## User Review Required

> [!IMPORTANT]
> The current app has no user accounts. After running `supabase_auth.sql`, you need to manually create accounts in **Supabase Dashboard → Authentication → Users → Add User** (or via the Login page's signup form). The first admin account can be created there and then granted `role = 'admin'` directly in the `profiles` table.

> [!WARNING]
> The real Supabase credentials are now in `.env`. All Supabase Auth calls (signIn, signOut, getUser) will hit your live project. Ensure you have run the `supabase_schema.sql` AND the new `supabase_auth.sql` before testing authentication.

---

## Proposed Changes

---

### Database Layer

#### [NEW] `supabase_auth.sql`
- **`profiles` table**: `id` (FK → `auth.users.id`), `full_name`, `email`, `phone`, `role` (enum: `admin` | `member`), `avatar_initials`, linked to `members` table.
- **Auto-create profile trigger**: On every new `auth.users` insert, automatically inserts a row in `profiles` with default `role = 'member'`.
- **Updated RLS policies**:
  - `profiles`: Users can read/update **only their own profile**. Admins can read all profiles.
  - `members`, `payments`, `activities`: Members can only `SELECT` rows where `member_id = auth.uid()`.
  - Admins can `SELECT/INSERT/UPDATE` everything (checked via `profiles.role = 'admin'`).
- **Helper Supabase Function**: `get_my_role()` — an RPC function that returns the current user's role, callable from the frontend.

---

### Frontend Layer

#### [NEW] `src/context/AuthContext.jsx`
- Wraps the entire app.
- On mount: calls `supabase.auth.getSession()` + fetches the user's `profiles` row to get `role`.
- Listens to `supabase.auth.onAuthStateChange` for live session events (login, logout, token refresh).
- Exposes: `{ user, role, profile, loading, signOut }`.

#### [NEW] `src/pages/LoginPage.jsx`
- Visually premium, full-screen login page matching the LedgerOne design palette (dark navy sidebar panel + white form panel).
- Email + password fields with validation.
- Calls `supabase.auth.signInWithPassword({ email, password })`.
- Shows inline error messages for wrong credentials.
- A "Request Access" note for new members (since account creation is admin-controlled).

#### [NEW] `src/pages/member/MemberDashboard.jsx`
- Member's personal stats: their enrolled schemes, total invested, last payment status, upcoming installment due date.
- Their recent activity feed (filtered to their own `member_id`).
- Their active auction participations.
- No admin-only controls (no Approve/Reject, no global user list, no scheme creation).

#### [NEW] `src/pages/member/MemberPayments.jsx`
- Shows only **their own** payment history (filtered by `member_id = auth.uid()`).
- Can view receipts and payment details.
- No Approve/Reject buttons.

#### [NEW] `src/pages/member/MemberSchemes.jsx`
- Shows only schemes **they are enrolled in**.
- Displays their installment schedule, dividend history, and next due date.

#### [MODIFY] `src/components/Sidebar.jsx`
- Accepts `role` prop.
- **Admin role**: shows full menu (Dashboard, User Management, Chit Schemes, Live Auctions, Payments, Reports, Settings).
- **Member role**: shows reduced menu (My Dashboard, My Schemes, My Payments, Live Auctions).

#### [MODIFY] `src/components/Navbar.jsx`
- Reads `user` and `role` from `AuthContext`.
- **Unauthenticated**: Shows "Login" button (routes to LoginPage).
- **Authenticated**: Replaces Supabase badge with user's name/avatar + role badge. Settings icon → Profile page. Shows "Logout" in user dropdown.
- Logout calls `supabase.auth.signOut()` → returns to LoginPage.

#### [MODIFY] `src/App.jsx`
- Wraps everything in `<AuthProvider>`.
- If `loading`: shows full-screen animated loading spinner.
- If `!user`: renders `<LoginPage />`.
- If `user && role === "admin"`: renders existing Admin layout.
- If `user && role === "member"`: renders Member layout with member-specific sidebar and pages.

---

## Verification Plan

### Automated
- `npm run build` — zero errors after all changes.
- `npm run lint` — zero ESLint errors.

### Manual
1. **Unauthenticated**: Visit app → should see Login page, no dashboard visible.
2. **Wrong credentials**: Enter bad email/password → inline error message shown.
3. **Admin login**: Login as admin → redirected to full Admin Dashboard, all pages accessible, username shown in navbar, Logout works.
4. **Member login**: Login as member → redirected to Member Dashboard (personalized stats only), admin-only pages (User Management) not accessible in sidebar.
5. **Logout**: Click Logout → session cleared, redirected back to Login page.
6. **RLS**: Verify in Supabase table editor that a member's session can only read their own payments row.
