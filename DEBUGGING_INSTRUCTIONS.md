# Better-Auth Migration - Debugging Guide

## Migration Complete! ✅

The codebase has been successfully migrated from @convex-dev/auth to better-auth. Follow the steps below to complete the setup and test.

## Quick Start

### 1. Set Environment Variables

Follow the instructions in `MIGRATION_ENV_SETUP.md` to set:
- `BETTER_AUTH_SECRET`
- `SITE_URL`
- `VITE_CONVEX_SITE_URL` in frontend/.env

### 2. Start Convex Dev Server

```bash
bunx convex dev
```

**Important:** This step will:
- Generate the better-auth component schema
- Create TypeScript types
- Set up the better-auth tables in your database
- Fix TypeScript errors related to generated types

### 3. Start Frontend Dev Server

In a new terminal:

```bash
cd frontend
bun dev
```

### 4. Test Authentication Flow

1. Navigate to http://localhost:5173
2. Click "Sign up"
3. Create a new account with email/password
4. Complete the onboarding flow
5. You should be redirected to the dashboard
6. Test sign out and sign in again

## Common Issues & Solutions

### Issue: "Property 'betterAuth' does not exist on type '{}'"

**Cause:** TypeScript types haven't been generated yet by Convex dev server

**Solution:** Run `bunx convex dev` - this will generate the necessary types

### Issue: "Cannot find module '@convex-dev/better-auth'"

**Cause:** Dependencies not installed

**Solution:**
```bash
bun install
cd frontend && bun install
```

### Issue: "BETTER_AUTH_SECRET is not set"

**Cause:** Environment variable not configured

**Solution:** Follow step 1 in MIGRATION_ENV_SETUP.md

### Issue: "Auth state never updates after sign in"

**Cause:** This was the original bug with @convex-dev/auth that we fixed by migrating to better-auth

**Expected:** Auth state should update immediately with better-auth's cookie-based sessions

### Issue: Type errors about "userId" vs "id"

**Cause:** Better-auth user objects use `userId` field instead of `id`

**Solution:** Already fixed in volunteers.ts - uses `user.userId || user._id`

## What Changed

### Backend (Convex)

- ✅ `convex/convex.config.ts` - Registered better-auth component
- ✅ `convex/auth.config.ts` - Auth provider configuration
- ✅ `convex/auth.ts` - New better-auth instance with email/password
- ✅ `convex/http.ts` - Better-auth HTTP routes
- ✅ `convex/schema.ts` - Removed old authTables
- ✅ `convex/volunteers.ts` - Updated to use `authComponent.getAuthUser()`

### Frontend

- ✅ `frontend/src/lib/auth-client.ts` - New auth client
- ✅ `frontend/src/main.tsx` - ConvexBetterAuthProvider instead of ConvexAuthProvider
- ✅ `frontend/src/pages/LoginPage.tsx` - Uses `authClient.signIn.email()`
- ✅ `frontend/src/pages/SignupPage.tsx` - Uses `authClient.signUp.email()`
- ✅ `frontend/src/App.tsx` - Route guards use `authClient.useSession()`
- ✅ `frontend/src/pages/OnboardingPage.tsx` - Uses `authClient.signOut()`

### Dependencies

- ✅ Installed: `better-auth@1.4.9`, `@convex-dev/better-auth@0.10.9`, `convex-helpers@0.1.108`
- ✅ Removed: `@convex-dev/auth@0.0.90` from all package.json files

## Key Differences from Old Auth

### Session Management

**Old (@convex-dev/auth):**
- JWT tokens in localStorage
- State sync issues (the bug we were experiencing)
- Manual token refresh

**New (better-auth):**
- Cookie-based sessions
- Automatic state updates
- Better security (httpOnly cookies)

### Auth State Checking

**Old:**
```tsx
const { isAuthenticated, isLoading } = useConvexAuth();
```

**New:**
```tsx
const { data: session, isPending } = authClient.useSession();
const isAuthenticated = session !== null;
```

### Sign In/Up

**Old:**
```tsx
await signIn('password', { email, password, flow: 'signIn' });
```

**New:**
```tsx
await authClient.signIn.email({ email, password });
await authClient.signUp.email({ email, password, name });
```

### Getting Current User

**Old:**
```tsx
const userId = await getAuthUserId(ctx);
```

**New:**
```tsx
const user = await authComponent.getAuthUser(ctx);
const userId = user.userId || user._id;
```

## Testing Checklist

- [ ] Can sign up with new account
- [ ] Can complete onboarding flow
- [ ] Dashboard loads after onboarding
- [ ] Can sign out successfully
- [ ] Can sign in with existing account
- [ ] Route guards work (redirects unauthenticated users)
- [ ] Protected pages are accessible when authenticated
- [ ] Session persists across page reloads

## Rollback (if needed)

If you need to rollback to the old auth system:

```bash
git stash  # or git reset --hard HEAD
bun install
cd frontend && bun install
```

## Support

If you encounter issues not covered here:

1. Check the better-auth documentation: https://www.better-auth.com
2. Check the Convex better-auth docs: https://labs.convex.dev/better-auth
3. Check the error messages in browser console and terminal

## Next Steps

After confirming everything works:

1. Remove all console.log debug statements from LoginPage, App.tsx, etc.
2. Remove unused files:
   - `frontend/src/lib/decodeJWT.ts` (no longer needed)
   - `frontend/src/lib/forceAuthCheck.ts` (if exists)
3. Update your README.md to document the new auth system
4. Deploy to production (remember to set environment variables there too!)
