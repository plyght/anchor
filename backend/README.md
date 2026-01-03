# Anchor Backend

Emergency volunteer coordination API built with Bun + Hono + Convex.

## Setup

1. Install dependencies:
```bash
bun install
```

2. Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

3. Update `.env` with your Convex URL and deploy key

4. Run the server:
```bash
bun start
```

## API Endpoints

### Health Check
- `GET /health` - Server health status

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

### Matching
- `POST /api/matching/match` - Match volunteers to tasks

**Note:** Authentication is handled by Convex Auth in the frontend. No backend auth endpoints needed.

## Development

```bash
bun start
```

Server runs on http://localhost:8000
