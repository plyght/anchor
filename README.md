# ⚓ Anchor - Emergency Volunteer Coordination System

Hackathon MVP for coordinating emergency volunteers via Bluetooth mesh network (BitChat).

## 🎯 System Overview

When a water level threshold is exceeded, Anchor:
1. Creates an incident
2. Generates flood response tasks
3. Matches tasks to volunteers based on skills/availability
4. Dispatches task messages via Bluetooth mesh (BitChat)
5. Tracks volunteer responses (accept/decline codes)
6. Escalates unclaimed tasks
7. Maintains full audit log

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│  WEB APP (Frontend + Backend)                           │
│  - React dashboard (volunteers & admins)                │
│  - Bun API server with better-auth                      │
│  - Real-time updates via Supabase                       │
└───────────────┬─────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────┐
│  SUPABASE (Cloud Database)                              │
│  - PostgreSQL with RLS                                  │
│  - Real-time subscriptions                              │
│  - NOTIFY/LISTEN for bridge                             │
└───────────────┬─────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────┐
│  BRIDGE PROCESS (Modified bitchat-terminal on Mac)      │
│  - Listens for task dispatch notifications              │
│  - Sends tasks to BLE mesh network                      │
│  - Parses volunteer acceptance codes                    │
│  - Updates database with responses                      │
└───────────────┬─────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────┐
│  BITCHAT MESH NETWORK                                   │
│  - iOS volunteers with BitChat app                      │
│  - Bluetooth LE peer-to-peer relay                      │
│  - No internet required                                 │
└─────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
anchor/
├── backend/              # Bun + Hono + better-auth API
│   ├── src/
│   │   ├── index.ts      # Main server
│   │   ├── auth.ts       # better-auth config
│   │   ├── lib/
│   │   │   └── supabase.ts
│   │   ├── routes/
│   │   │   ├── volunteers.ts
│   │   │   ├── incidents.ts
│   │   │   └── tasks.ts
│   │   └── types/
│   │       └── index.ts  # TypeScript definitions
│   └── package.json
│
├── frontend/             # React + Vite + Tailwind
│   ├── src/
│   │   ├── App.tsx       # Router setup
│   │   ├── components/
│   │   │   ├── Layout.tsx
│   │   │   └── Header.tsx
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── SignupPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── ProfilePage.tsx
│   │   │   └── IncidentDetailPage.tsx
│   │   └── lib/
│   │       └── supabase.ts
│   └── package.json
│
├── supabase/             # Database schema & migrations
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   └── README.md
│
└── docs/
    └── bridge-implementation-plan.md  # Bridge modification guide
```

## 🚀 Quick Start

### 1. Set Up Supabase

1. Create project at https://supabase.com
2. Run migration from `supabase/migrations/001_initial_schema.sql` in SQL editor
3. Copy project URL and keys

### 2. Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your Supabase credentials
bun install
bun run src/index.ts
```

Backend runs on **http://localhost:3000**

### 3. Frontend Setup

```bash
cd frontend
cp .env.example .env
# Edit .env with your Supabase credentials
bun install
bun dev
```

Frontend runs on **http://localhost:5173**

### 4. Bridge Setup (Coming Next)

Follow detailed instructions in `docs/bridge-implementation-plan.md` to:
- Add Supabase dependencies to bitchat-terminal
- Implement PostgreSQL LISTEN for task notifications
- Add response parser for volunteer acceptance codes
- Run bridge with `cargo run --release -- --bridge`

## 🔑 Environment Variables

### Backend `.env`
```env
PORT=3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres
BETTER_AUTH_SECRET=your-random-secret
BETTER_AUTH_URL=http://localhost:3000
```

### Frontend `.env`
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:3000
```

### Bridge `.env` (to be created)
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres
```

## 📊 Database Schema

### Core Tables
- **volunteers** - User profiles with BitChat usernames, skills, availability
- **incidents** - Emergency events (floods, fires, etc.)
- **tasks** - Work items with acceptance codes
- **task_assignments** - Assignment history and responses
- **audit_log** - Full system audit trail
- **mesh_messages** - BitChat message log for debugging

### Key Features
- ✅ Row Level Security (RLS) policies
- ✅ PostgreSQL NOTIFY/LISTEN for bridge integration
- ✅ Automatic acceptance code generation (4-char alphanumeric)
- ✅ JSONB for flexible data (location, availability schedules)
- ✅ Performance indexes on high-query columns
- ✅ Automatic timestamp updates via triggers

## 🔐 Token-Gated Acceptance System

Each task gets a unique 4-character code:

**Outbound (Task Dispatch):**
```
TASK#3: Check levee section B5 | Code: X7Y2
```

**Inbound (Volunteer Response):**
```
X7Y2 A    (Accept)
X7Y2 D    (Decline)
X7Y2 DONE (Completed)
```

The system validates codes before accepting responses, ensuring only intended volunteers can claim tasks.

## 🛠️ Tech Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| Runtime | Bun | Fastest JS runtime, great DX |
| Backend | Hono | Lightweight, fast, Bun-native |
| Auth | better-auth | Modern, flexible auth |
| Database | Supabase (PostgreSQL) | Realtime, RLS, free tier |
| Frontend | React + Vite | Fast HMR, standard stack |
| Styling | TailwindCSS | Rapid prototyping |
| Bridge | Rust (bitchat-terminal) | BLE access, existing client |
| Mesh | BitChat (iOS/Android) | No hardware, phone-to-phone |

## 📡 API Endpoints

### Auth
- `POST /api/auth/signup` - Register new volunteer
- `POST /api/auth/login` - Login
- `GET /api/auth/session` - Get session

### Volunteers
- `GET /api/volunteers` - List all volunteers
- `GET /api/volunteers/:id` - Get volunteer details
- `POST /api/volunteers` - Create volunteer profile
- `PATCH /api/volunteers/:id` - Update volunteer

### Incidents
- `GET /api/incidents` - List incidents
- `GET /api/incidents/:id` - Get incident with tasks
- `POST /api/incidents` - Create incident (triggers task generation)

### Tasks
- `GET /api/tasks?status=pending&incident_id=xxx` - Filter tasks
- `POST /api/tasks/generate` - Generate tasks for incident
- `PATCH /api/tasks/:id` - Update task status

## 🎯 Demo Flow

1. **Pre-Demo:**
   - Volunteers download BitChat iOS app
   - Volunteers sign up at http://localhost:5173/signup
   - Admin verifies registrations

2. **Demo Script:**
   - Water level sensor triggers POST to `/api/incidents` with threshold breach
   - System creates "River Flood - Section B" incident
   - System generates 4 tasks (inspection, delivery, etc.)
   - Matching algorithm assigns tasks to available volunteers
   - Bridge sends task messages to BitChat mesh
   - Volunteers see: `"TASK#3: Check levee B5 | Code: X7Y2"`
   - Volunteer types `"X7Y2 A"` in BitChat
   - Bridge parses response, updates Supabase
   - Dashboard shows real-time status change to "Accepted"
   - Unclaimed task auto-escalates after 5 minutes

## ✅ What's Built So Far

### Phase 1: Foundation ✅ COMPLETE
- [x] Supabase schema with 6 tables, 10 indexes, 19 RLS policies
- [x] PostgreSQL functions: acceptance code generator, NOTIFY triggers
- [x] Bun backend with Hono framework
- [x] better-auth integration with Supabase
- [x] Volunteer/Incident/Task CRUD APIs
- [x] React frontend with routing
- [x] Login, Signup, Dashboard, Profile pages
- [x] TailwindCSS styling
- [x] TypeScript types for all entities
- [x] Bridge implementation plan (43KB detailed spec)

### Phase 2: Core Workflow (NEXT)
- [ ] Task matching algorithm (skills + availability + location)
- [ ] Real-time frontend updates (Supabase subscriptions)
- [ ] Incident creation UI with task generation
- [ ] Bridge implementation (Rust modifications)
- [ ] End-to-end testing with real BitChat mesh

### Phase 3: Polish (FUTURE)
- [ ] Task escalation logic (timeout + reassignment)
- [ ] Audit log viewer
- [ ] Admin controls
- [ ] Error handling + validation
- [ ] Production deployment

## 🔧 Next Steps

1. **Create Supabase project** and run migration
2. **Configure environment variables** for backend + frontend
3. **Test backend API** with Postman/curl
4. **Test frontend UI** in browser
5. **Implement bridge** following `docs/bridge-implementation-plan.md`
6. **Run bridge** with BitChat mesh network
7. **End-to-end test** with real iOS volunteers

## 📚 Documentation

- **Database:** `supabase/README.md`
- **Backend:** `backend/README.md`
- **Bridge:** `docs/bridge-implementation-plan.md`
- **Frontend:** Standard React/Vite docs

## 🤝 Team

Built for hackathon by [Your Team Name]

## 📄 License

MIT (or specify your license)
