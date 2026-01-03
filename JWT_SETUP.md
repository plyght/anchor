# JWT Setup for Convex Auth

Convex Auth requires `JWT_PRIVATE_KEY` and `JWKS` environment variables to be set in your Convex deployment. Without these, authentication (signup/login) will fail with the error:

```
Missing environment variable `JWT_PRIVATE_KEY`
```

## Quick Setup

### 1. Generate Keys

```bash
# Install jose dependency (if not already installed)
bun add -d jose

# Generate the keys
bun run generateKeys.mjs
```

This will output two lines:
- `JWT_PRIVATE_KEY="..."`
- `JWKS={"keys":[...]}`

### 2. Set Environment Variables in Convex

**Option A: Using Convex CLI (Recommended)**

For **development** environment:
```bash
bunx convex env set JWT_PRIVATE_KEY "your-private-key-value"
bunx convex env set JWKS '{"keys":[...]}'
```

For **production** environment:
```bash
bunx convex env set JWT_PRIVATE_KEY "your-private-key-value" --prod
bunx convex env set JWKS '{"keys":[...]}' --prod
```

**Option B: Using Convex Dashboard**

1. Go to [Convex Dashboard](https://dashboard.convex.dev)
2. Select your project
3. Navigate to **Settings** → **Environment Variables**
4. Select the environment (Development or Production)
5. Click **Add Variable**
6. Add `JWT_PRIVATE_KEY` with the private key value
7. Add `JWKS` with the JWKS JSON value

### 3. Verify Setup

After setting the variables:
1. Restart your Convex dev server if running locally
2. Try signing up or logging in
3. Check Convex logs if authentication still fails

## Important Notes

- **Set for both environments**: If you're deploying to production, set these variables for both development and production environments
- **Keep keys secure**: Never commit these keys to version control
- **One key per environment**: You can use the same keys for dev and prod, or generate separate keys for better security
- **Format**: The `JWT_PRIVATE_KEY` should be a single line with spaces instead of newlines (the script handles this automatically)

## Troubleshooting

### Error: "Missing environment variable `JWT_PRIVATE_KEY`"
- Verify the variables are set in the correct environment (dev vs prod)
- Check that you're using the right Convex project
- Restart Convex dev server after setting variables
- Verify variable names are exactly `JWT_PRIVATE_KEY` and `JWKS` (case-sensitive)

### Authentication still fails after setting variables
- Check Convex Dashboard → Logs for detailed error messages
- Verify the `JWKS` value is valid JSON
- Ensure the private key format is correct (single line, spaces instead of newlines)
- Try regenerating keys and setting them again