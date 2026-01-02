# Anchor

Emergency volunteer coordination system using Bluetooth mesh networks for infrastructure-independent task dispatch during crisis events.

## Overview

Anchor coordinates emergency response volunteers through a token-gated task system that operates over Bluetooth LE mesh networks when traditional infrastructure fails. The system generates tasks from incident triggers, matches them to available volunteers based on skills and location, and dispatches assignments via BitChat mesh with unique acceptance codes for verification.

## Features

- **Infrastructure-Independent**: Operates over Bluetooth LE mesh when internet/cellular networks are unavailable
- **Token-Gated Tasks**: 4-character acceptance codes prevent unauthorized task claiming
- **Intelligent Matching**: Skills-based task assignment with availability and location awareness
- **Real-Time Coordination**: Live dashboard updates via Supabase real-time subscriptions
- **Audit Trail**: Complete system history for compliance and post-incident analysis
- **Escalation System**: Automatic task reassignment when volunteers don't respond
- **Bridge Architecture**: PostgreSQL NOTIFY/LISTEN connects web app to mesh network

## Installation

### Prerequisites
- Bun 1.0+
- Supabase account or local PostgreSQL 14+
- BitChat iOS/Android app for volunteers
- Rust 1.70+ (for bridge component)

### Database Setup

```bash
# Create Supabase project at https://supabase.com
# Then run the migration
cd supabase
# Paste migrations/001_initial_schema.sql into SQL Editor
```

### Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with Supabase credentials
bun install
bun run src/index.ts
```

Backend runs on http://localhost:3000

### Frontend Setup

```bash
cd frontend
cp .env.example .env
# Edit .env with Supabase credentials
bun install
bun dev
```

Frontend runs on http://localhost:5173

## Usage

### Creating an Incident

```bash
curl -X POST http://localhost:3000/api/incidents \
  -H "Content-Type: application/json" \
  -d '{
    "title": "River Flood - Section B",
    "incident_type": "flood",
    "severity": "high",
    "trigger_data": {"water_level": 15.2, "threshold": 12.0}
  }'
```

### Generating Tasks

```bash
curl -X POST http://localhost:3000/api/tasks/generate \
  -H "Content-Type: application/json" \
  -d '{
    "incident_id": "uuid-here",
    "tasks": [
      {
        "title": "Check levee section B5",
        "task_type": "assessment",
        "priority": "urgent",
        "required_skills": ["engineering", "water_rescue"]
      }
    ]
  }'
```

### Volunteer Response Flow

Tasks dispatched to mesh show: `TASK#3: Check levee B5 | Code: X7Y2`

Volunteer responses:
```
X7Y2 A     # Accept task
X7Y2 D     # Decline task
X7Y2 DONE  # Mark complete
```

Bridge validates code and updates database automatically.

## Configuration

### Backend Environment

```env
PORT=3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres
BETTER_AUTH_SECRET=your-random-secret
BETTER_AUTH_URL=http://localhost:3000
```

### Frontend Environment

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:3000
```

### Bridge Environment (Future)

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres
```

## Architecture

### System Layers

```
Web App (React + Bun)
    ↓
Supabase (PostgreSQL + Realtime)
    ↓ (NOTIFY/LISTEN)
Bridge Process (Rust)
    ↓ (Bluetooth LE)
BitChat Mesh Network (iOS/Android)
```

### Database Schema

**volunteers**: User profiles with BitChat usernames, skills, availability schedules
**incidents**: Emergency events with severity, type, trigger data
**tasks**: Work items with acceptance codes, status, required skills
**task_assignments**: Assignment history and responses for audit trail
**audit_log**: Complete system audit trail
**mesh_messages**: Bluetooth mesh message log for debugging

### Key Components

- `backend/src/routes/`: REST API endpoints for CRUD operations
- `backend/src/lib/matching.ts`: Skills-based volunteer matching algorithm
- `backend/src/lib/escalation.ts`: Timeout-based task reassignment
- `backend/src/lib/audit.ts`: System audit trail generation
- `frontend/src/pages/`: Dashboard, incident, and volunteer management UIs
- `supabase/migrations/`: Database schema with RLS policies and triggers

### Bridge Integration

The bridge process connects web infrastructure to mesh network:

1. PostgreSQL LISTEN subscribes to `task_dispatch` channel
2. Tasks inserted with `status='dispatched'` trigger NOTIFY
3. Bridge forwards task to BitChat mesh network
4. Bridge parses volunteer response codes
5. Bridge updates Supabase with task status changes

Implementation: `docs/bridge-implementation-plan.md`

## Development

### Backend Development

```bash
cd backend
bun run src/index.ts
```

### Frontend Development

```bash
cd frontend
bun dev
```

### Database Migrations

```bash
cd supabase
# Add new migration
supabase migration new migration_name
# Apply migrations
supabase db reset
```

### Testing

```bash
# Backend
cd backend
bun test

# Frontend
cd frontend
bun test
```

## Tech Stack

- Runtime: Bun (JavaScript/TypeScript)
- Backend: Hono (Web framework)
- Auth: better-auth
- Database: Supabase (PostgreSQL 14+)
- Frontend: React + Vite
- Styling: TailwindCSS
- Mesh Network: BitChat (Bluetooth LE)
- Bridge: Rust (bitchat-terminal fork)

Dependencies: @supabase/supabase-js, hono, better-auth, react-router-dom, zustand, pg.

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register volunteer
- `POST /api/auth/login` - Authenticate user
- `GET /api/auth/session` - Get current session

### Volunteers
- `GET /api/volunteers` - List volunteers
- `GET /api/volunteers/:id` - Get volunteer details
- `POST /api/volunteers` - Create volunteer
- `PATCH /api/volunteers/:id` - Update volunteer

### Incidents
- `GET /api/incidents` - List incidents
- `GET /api/incidents/:id` - Get incident with tasks
- `POST /api/incidents` - Create incident

### Tasks
- `GET /api/tasks?status=pending&incident_id=xxx` - Filter tasks
- `POST /api/tasks/generate` - Generate tasks for incident
- `PATCH /api/tasks/:id` - Update task status

## Security

- Row Level Security (RLS) enabled on all tables
- JWT-based authentication via better-auth
- Service role key restricted to backend and bridge only
- Anon key safe for client use with RLS policies
- Acceptance codes prevent unauthorized task claiming

## License

MIT
