# Better-Auth Migration Test Checklist

## ✅ Pre-Test Verification (COMPLETED)

- [x] Environment variables configured
  - BETTER_AUTH_SECRET set in Convex
  - SITE_URL set to http://localhost:5173
  - VITE_CONVEX_URL set in frontend/.env
  - VITE_CONVEX_SITE_URL set in frontend/.env
- [x] Dependencies installed
  - better-auth@1.4.9
  - @convex-dev/better-auth@0.10.9
- [x] Convex functions deployed successfully
  - betterAuth component installed
  - Types generated
- [x] TypeScript compilation clean
  - No LSP diagnostics errors
  - Frontend builds successfully
- [x] Backend dependencies resolved
  - Hono installed and working

## 🧪 Manual Testing Required

### 1. Start Development Servers

```bash
cd ~/anchor
bun dev
```

**Expected:**
- [Convex] Functions ready message
- [Backend] Server starting on http://localhost:3000
- [Frontend] VITE dev server on http://localhost:5173

### 2. Test Sign Up Flow

1. Navigate to: http://localhost:5173/signup
2. Fill in form:
   - Full Name: "Test User"
   - Email: "test@example.com"
   - Password: "password123"
   - BitChat Username: "@testuser"
   - Phone: "+1234567890" (optional)
3. Click "Create Account"

**Expected:**
- No infinite spinner ✅
- Redirect to /onboarding
- User can see onboarding form

### 3. Test Onboarding Flow

1. On /onboarding page, fill in:
   - Skills: ["first-aid", "search-rescue"]
   - Availability schedule
2. Submit onboarding

**Expected:**
- Volunteer profile created in Convex
- Redirect to /dashboard or /

### 4. Test Sign Out

1. Navigate to profile or use sign out button
2. Click "Sign Out"

**Expected:**
- Redirect to /login
- No longer authenticated
- Can't access protected routes

### 5. Test Sign In Flow

1. Navigate to: http://localhost:5173/login
2. Enter credentials:
   - Email: "test@example.com"
   - Password: "password123"
3. Click "Sign In"

**Expected:**
- No infinite spinner ✅
- Immediate redirect (no page reload needed)
- Auth state updates instantly
- Redirect to /dashboard

### 6. Test Route Protection

**Without Authentication:**
- Visit http://localhost:5173/ → should redirect to /login
- Visit http://localhost:5173/admin → should redirect to /login
- Visit http://localhost:5173/profile → should redirect to /login

**With Authentication (but no onboarding):**
- Visit any protected route → should redirect to /onboarding

**With Authentication (after onboarding):**
- Can access /, /admin, /profile, /incidents
- Cannot be redirected to /login or /signup

### 7. Test Session Persistence

1. Sign in successfully
2. Close browser tab
3. Open new tab to http://localhost:5173
4. Should still be authenticated (no need to sign in again)

**Expected:**
- Cookie-based session persists
- Immediate authentication on page load
- No localStorage token sync issues

### 8. Browser Console Checks

**During Sign In:**
```
[LoginPage] Should NOT see "Auth state NEVER updated"
[LoginPage] Should NOT see "window.location.reload()"
```

**After Sign In:**
```
[App.tsx] Should see session.data with user information
[RequireOnboarding] Should see authenticated checks passing
```

## 🐛 Known Issues FIXED

- ❌ Infinite spinner on login (OLD ISSUE with @convex-dev/auth)
- ✅ Now using cookie-based sessions (no localStorage sync bug)
- ✅ Immediate auth state updates
- ✅ No page reload required

## 📝 Success Criteria

Authentication migration is successful if:
1. ✅ Users can sign up without errors
2. ✅ Users can sign in without infinite spinner
3. ✅ Auth state updates immediately (no reload needed)
4. ✅ Route guards work correctly
5. ✅ Sessions persist across browser sessions
6. ✅ Sign out works and clears session
7. ✅ Onboarding flow preserved
8. ✅ No TypeScript or build errors

## 🔍 Debugging

If issues occur, check:

1. **Browser Console** for error messages
2. **Network Tab** for failed requests to Convex
3. **Application Tab** → Cookies for better-auth session cookie
4. **Convex Dashboard** → Logs for backend errors
5. **Terminal** for Convex function errors

### Common Issues

**"Session not found"**
- Check SITE_URL matches your dev URL
- Verify VITE_CONVEX_SITE_URL is correct
- Clear cookies and try again

**"Component betterAuth not found"**
- Run `bunx convex dev` to install component
- Check convex/convex.config.ts has betterAuth component

**TypeScript errors**
- Run `bunx convex dev` to regenerate types
- Check _generated folder has latest types

## ✅ Test Status

- [ ] Sign up flow
- [ ] Onboarding flow
- [ ] Sign out
- [ ] Sign in flow
- [ ] Route protection
- [ ] Session persistence
- [ ] Console clean (no critical errors)

**Tester:** ________________
**Date:** ________________
**Result:** PASS / FAIL
**Notes:** ________________
