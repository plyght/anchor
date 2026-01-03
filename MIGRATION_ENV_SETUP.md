# Environment Variables Setup for Better-Auth

## Required Environment Variables

You need to set the following environment variables for the better-auth migration:

### 1. Generate and set BETTER_AUTH_SECRET

```bash
# Generate a random secret
openssl rand -base64 32

# Set it in Convex (replace with generated value)
bunx convex env set BETTER_AUTH_SECRET "YOUR_GENERATED_SECRET"
```

### 2. Set SITE_URL

```bash
# For local development
bunx convex env set SITE_URL http://localhost:5173

# For production (use your actual domain)
bunx convex env set SITE_URL https://your-domain.com
```

### 3. Update frontend/.env

Add these lines to `frontend/.env`:

```env
# Your Convex deployment URL (already exists)
VITE_CONVEX_URL=https://your-project.convex.cloud

# Add this new variable - same as VITE_CONVEX_URL but with .site extension
VITE_CONVEX_SITE_URL=https://your-project.convex.site

# Your backend API URL (already exists)
VITE_API_URL=http://localhost:8000
```

**Important:** The `VITE_CONVEX_SITE_URL` should be your Convex URL with `.cloud` replaced by `.site`

Example:
- VITE_CONVEX_URL=https://happy-animal-123.convex.cloud
- VITE_CONVEX_SITE_URL=https://happy-animal-123.convex.site

## After Setting Environment Variables

1. Restart your Convex dev server:
   ```bash
   bunx convex dev
   ```

2. Restart your frontend dev server:
   ```bash
   cd frontend && bun dev
   ```

3. Test the authentication flow:
   - Sign up a new account
   - Complete onboarding
   - Sign out
   - Sign in again
   - Verify route guards work correctly
