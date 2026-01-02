# Convex Setup Instructions

After running `bunx convex dev`, follow these steps:

## 1. Get Your Convex URL

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

## 2. Verify Setup

```bash
# Check that Convex types are generated
ls convex/_generated/

# Should see:
# - api.d.ts
# - api.js
# - dataModel.d.ts
# - server.d.ts
```

## 3. Start Development

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
