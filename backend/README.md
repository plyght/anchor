# Anchor Backend

Emergency volunteer coordination API built with Bun + Hono + better-auth.

## Setup

1. Install dependencies:
```bash
bun install
```

2. Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

3. Update `.env` with your Supabase credentials

4. Run the server:
```bash
bun run src/index.ts
```

## API Endpoints

### Health Check
- `GET /health` - Server health status

### Auth (better-auth)
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/session` - Get current session

### Volunteers
- `GET /api/volunteers` - List all volunteers
- `GET /api/volunteers/:id` - Get volunteer by ID
- `POST /api/volunteers` - Create volunteer
- `PATCH /api/volunteers/:id` - Update volunteer

### Incidents
- `GET /api/incidents` - List incidents
- `GET /api/incidents/:id` - Get incident with tasks
- `POST /api/incidents` - Create incident

### Tasks
- `GET /api/tasks?status=pending&incident_id=xxx` - List tasks (filterable)
- `POST /api/tasks/generate` - Generate tasks for incident
- `PATCH /api/tasks/:id` - Update task status

## Development

```bash
bun run src/index.ts
```

Server runs on http://localhost:3000
