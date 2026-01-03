# Convex Setup Instructions

After running `bunx convex dev`, follow these steps:

## 1. Set Up JWT Keys (Required for Authentication)

Convex Auth requires `JWT_PRIVATE_KEY` and `JWKS` environment variables. Generate them:

```bash
# Install jose if needed
bun add -d jose

# Generate keys
bun run generateKeys.mjs
```

This will output two environment variables. Set them in Convex:

**Using Convex CLI:**
```bash
bunx convex env set JWT_PRIVATE_KEY "your-private-key-value"
bunx convex env set JWKS '{"keys":[...]}'
```

**Or using Convex Dashboard:**
1. Go to [Convex Dashboard](https://dashboard.convex.dev)
2. Select your project
3. Navigate to **Settings** → **Environment Variables**
4. Add `JWT_PRIVATE_KEY` and `JWKS` with the generated values

**Important**: Set these before testing authentication, otherwise signup/login will fail.

## 2. Get Your Convex URL

The `convex dev` command created a `.env.local` file in the project root with your `CONVEX_URL`. 

To use it in the frontend, copy it to `frontend/.env`:

```bash
# Option 1: Manual copy
# Open .env.local and copy the CONVEX_URL value
# Then create frontend/.env with:
# VITE_CONVEX_URL=<your-convex-url>

# Option 2: Automated (from project root)
echo "VITE_CONVEX_URL=$(grep CONVEX_URL .env.local | cut -d '=' -f2)" > frontend/.env
```

## 3. Verify Setup

```bash
# Check that Convex types are generated
ls convex/_generated/

# Should see:
# - api.d.ts
# - api.js
# - dataModel.d.ts
# - server.d.ts
```

## 4. Start Development

```bash
# Terminal 1: Convex dev server (generates types, watches for changes)
bunx convex dev

# Terminal 2: Frontend dev server
cd frontend
bun dev

# Terminal 3: Backend (if needed)
cd backend
bun run src/index.ts
```

## Troubleshooting

### Frontend can't find Convex types
- Make sure `convex dev` is running
- Check that `convex/_generated/api.d.ts` exists
- Restart your frontend dev server

### CONVEX_URL not set
- Check `.env.local` exists in project root
- Copy `CONVEX_URL` to `frontend/.env` as `VITE_CONVEX_URL`
- Restart frontend dev server

### Authentication fails (Missing JWT_PRIVATE_KEY)
- Generate keys: `bun run generateKeys.mjs`
- Set `JWT_PRIVATE_KEY` and `JWKS` in Convex environment variables
- Use CLI: `bunx convex env set JWT_PRIVATE_KEY "..."` 
- Or set via Convex Dashboard → Settings → Environment Variables
- Restart Convex dev server after setting variables
