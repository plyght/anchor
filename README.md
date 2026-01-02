# Anchor

Emergency volunteer coordination system using Bluetooth mesh networks for infrastructure-independent task dispatch during crisis events.

## Overview

Anchor coordinates emergency response volunteers through a token-gated task system that operates over Bluetooth LE mesh networks when traditional infrastructure fails. The system generates tasks from incident triggers, matches them to available volunteers based on skills and location, and dispatches assignments via BitChat mesh with unique acceptance codes for verification.

## Features

- **Infrastructure-Independent**: Operates over Bluetooth LE mesh when internet/cellular networks are unavailable
- **Token-Gated Tasks**: 4-character acceptance codes prevent unauthorized task claiming
- **Intelligent Matching**: Skills-based task assignment with availability and location awareness
- **Real-Time Coordination**: Live dashboard updates via Convex reactive queries
- **Audit Trail**: Complete system history for compliance and post-incident analysis
- **Escalation System**: Automatic task reassignment when volunteers don't respond
- **Bridge Architecture**: Convex scheduled functions connect web app to mesh network

## Installation

### Prerequisites
- Bun 1.0+
- Convex account (sign up at https://convex.dev)
- BitChat iOS/Android app for volunteers
- Rust 1.70+ (for bridge component)

### Convex Setup

```bash
# From the project root, run Convex dev
bunx convex dev

# This will:
# 1. Login/create account (if first time)
# 2. Create/select a project
# 3. Generate types in convex/_generated/
# 4. Create .env.local with CONVEX_URL
```

After running `convex dev`, copy the `CONVEX_URL` from `.env.local` to `frontend/.env` as `VITE_CONVEX_URL`:
```bash
# Copy CONVEX_URL from .env.local to frontend/.env
echo "VITE_CONVEX_URL=$(grep CONVEX_URL .env.local | cut -d '=' -f2)" >> frontend/.env
```

### Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with Convex deploy key if needed
bun install
bun run src/index.ts
```

Backend runs on http://localhost:3000

### Frontend Setup

```bash
cd frontend
cp .env.example .env
# Edit .env with your Convex URL (from convex dev output)
bun install
bun dev
```

Frontend runs on http://localhost:5173

## Usage

### Creating an Incident

Use the admin dashboard at http://localhost:5173/admin or call Convex mutations directly:

```typescript
import { useMutation } from 'convex/react';
import { api } from './convex/_generated/api';

const createIncident = useMutation(api.incidents.create);
const incidentId = await createIncident({
  title: "River Flood - Section B",
  incident_type: "flood",
  severity: "high",
  trigger_data: { water_level: 15.2, threshold: 12.0 }
});
```

### Generating Tasks

```typescript
const generateTasks = useMutation(api.tasks.generateForIncident);
const taskIds = await generateTasks({ incident_id: incidentId });
```

### Matching Volunteers to Tasks

```typescript
const matchIncident = useMutation(api.matching.matchIncident);
const result = await matchIncident({ incident_id: incidentId });
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

### Frontend Environment

```env
VITE_CONVEX_URL=https://your-project.convex.cloud
```

### Backend Environment

```env
CONVEX_DEPLOY_KEY=your-convex-deploy-key
DATABASE_URL=postgresql://postgres:password@localhost:5432/postgres
```

## Architecture

### System Layers

```
Web App (React + Bun)
    ↓
Convex (Reactive Database + Functions)
    ↓ (Scheduled Functions)
Bridge Process (Rust)
    ↓ (Bluetooth LE)
BitChat Mesh Network (iOS/Android)
```

### Database Schema

Convex schema defined in `convex/schema.ts`:

- **volunteers**: User profiles with BitChat usernames, skills, availability schedules
- **incidents**: Emergency events with severity, type, trigger data
- **tasks**: Work items with acceptance codes, status, required skills
- **task_assignments**: Assignment history and responses for audit trail
- **audit_log**: Complete system audit trail
- **mesh_messages**: Bluetooth mesh message log for debugging

### Key Components

- `convex/volunteers.ts`: Volunteer CRUD operations
- `convex/incidents.ts`: Incident management
- `convex/tasks.ts`: Task management and generation
- `convex/matching.ts`: Skills-based volunteer matching algorithm
- `convex/escalation.ts`: Timeout-based task reassignment (scheduled)
- `convex/audit.ts`: System audit trail generation
- `convex/crons.ts`: Scheduled escalation checks
- `frontend/src/pages/`: Dashboard, incident, and volunteer management UIs

### Bridge Integration

The bridge process connects web infrastructure to mesh network:

1. Convex scheduled functions check for dispatched tasks
2. Tasks with `status='dispatched'` trigger bridge notification
3. Bridge forwards task to BitChat mesh network
4. Bridge parses volunteer response codes
5. Bridge updates Convex with task status changes

Implementation: `docs/bridge-implementation-plan.md`

## Development

### Convex Development

```bash
# Start Convex dev server (generates types automatically)
convex dev

# Deploy to production
convex deploy
```

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
- Backend: Hono (Web framework) + Convex
- Auth: better-auth (can be migrated to Convex auth)
- Database: Convex (reactive database)
- Frontend: React + Vite + Convex React hooks
- Styling: TailwindCSS
- Mesh Network: BitChat (Bluetooth LE)
- Bridge: Rust (bitchat-terminal fork)

Dependencies: convex, hono, better-auth, react-router-dom, zustand.

## Convex Functions

### Queries (Read-only)
- `api.volunteers.list` - List all volunteers
- `api.volunteers.get` - Get volunteer by ID
- `api.volunteers.getByStatus` - Filter by status
- `api.incidents.list` - List all incidents
- `api.incidents.get` - Get incident by ID
- `api.incidents.getByStatus` - Filter by status
- `api.tasks.list` - List tasks (filterable by status/incident)
- `api.tasks.get` - Get task by ID
- `api.matching.matchTasksToVolunteers` - Calculate matches

### Mutations (Write)
- `api.volunteers.create` - Create volunteer
- `api.volunteers.update` - Update volunteer
- `api.incidents.create` - Create incident
- `api.tasks.create` - Create task
- `api.tasks.update` - Update task
- `api.tasks.generateForIncident` - Generate default tasks
- `api.matching.assignTaskToVolunteer` - Assign task
- `api.matching.matchIncident` - Match and assign all tasks
- `api.audit.logAuditEvent` - Log audit event

### Scheduled Functions
- `internal.escalation.checkAndEscalateTasks` - Runs every minute via cron

## Security

- Convex functions use validators for all inputs
- Internal functions are not exposed to public API
- Acceptance codes prevent unauthorized task claiming
- Row-level security handled by Convex auth (when implemented)

## Migration from Supabase

This project has been migrated from Supabase to Convex. Key changes:

1. **Database**: PostgreSQL → Convex reactive database
2. **Real-time**: Supabase subscriptions → Convex reactive queries
3. **Backend API**: REST endpoints → Convex queries/mutations
4. **Scheduled Jobs**: PostgreSQL triggers → Convex cron jobs
5. **Type Safety**: Manual types → Auto-generated Convex types

## License

MIT
