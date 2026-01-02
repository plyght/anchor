# Anchor Supabase Database

This directory contains the PostgreSQL database schema and migrations for the Anchor emergency volunteer coordination system.

## Database Architecture

The Anchor system uses Supabase (PostgreSQL 14+) for:
- **Persistent Storage**: Volunteer profiles, incidents, tasks, assignments
- **Real-time Subscriptions**: Live task status updates via Supabase Realtime
- **PostgreSQL NOTIFY/LISTEN**: Bridge integration for Bluetooth mesh dispatch

## Schema Overview

### Core Tables

| Table | Purpose |
|-------|---------|
| `volunteers` | Volunteer profiles with skills, availability, and Bitchat identity |
| `incidents` | Emergency incidents that generate volunteer tasks |
| `tasks` | Individual volunteer tasks dispatched via mesh network |
| `task_assignments` | Assignment attempts and volunteer responses (audit trail) |
| `audit_log` | System-wide audit trail for compliance and debugging |
| `mesh_messages` | Log of all Bluetooth mesh messages sent/received |

### Key Features

**Acceptance Codes**: 4-character alphanumeric codes (e.g., "K3P7") for task acceptance via SMS/mesh
**Skills Array**: Tags like `["first_aid", "boat_operator", "heavy_lifting"]`
**Location JSONB**: `{"lat": 37.7749, "lon": -122.4194, "address": "123 Main St"}`
**Availability Schedule**: `{"monday": ["09:00-17:00"], "tuesday": ["all_day"]}`

### PostgreSQL NOTIFY Integration

The `notify_task_dispatch()` function sends PostgreSQL NOTIFY events when tasks are dispatched:

```sql
LISTEN task_dispatch;
```

The bridge process (modified bitchat-terminal) listens for these notifications and forwards tasks to volunteers via Bluetooth mesh.

### Row Level Security (RLS)

All tables have RLS enabled with policies:
- **Volunteers**: Can view/update own profile; admins see all
- **Tasks**: Volunteers see assigned tasks; admins see all
- **Assignments**: Volunteers see own assignments; admins see all
- **Audit Log**: Admin-only read access; system can insert
- **Mesh Messages**: Volunteers see own messages; admins see all

## Setup Instructions

### Option 1: Supabase Cloud (Recommended for Development)

1. Create a new Supabase project at https://supabase.com
2. Copy your project URL and anon key to `.env`
3. Run the migration:

```bash
cd /Users/nicojaffer/anchor
npx supabase db push
```

Alternatively, paste the contents of `001_initial_schema.sql` into the Supabase SQL editor and execute.

### Option 2: Local Supabase (Docker)

1. Install Supabase CLI:

```bash
brew install supabase/tap/supabase
```

2. Initialize Supabase locally:

```bash
cd /Users/nicojaffer/anchor
supabase init
supabase start
```

3. Link to your project (optional):

```bash
supabase link --project-ref your-project-ref
```

4. Apply migrations:

```bash
supabase db reset
```

5. Access local Supabase Studio at http://localhost:54323

### Option 3: Manual PostgreSQL

If using standalone PostgreSQL 14+:

```bash
psql -U postgres -d anchor -f supabase/migrations/001_initial_schema.sql
```

## Verification

After running the migration, verify the schema:

```sql
-- Check tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Check indexes
SELECT indexname FROM pg_indexes 
WHERE schemaname = 'public';

-- Check triggers
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public';

-- Test NOTIFY function
INSERT INTO incidents (title, incident_type, severity) 
VALUES ('Test Incident', 'fire', 'high') 
RETURNING id;

INSERT INTO tasks (incident_id, title, task_type, acceptance_code, status) 
VALUES (
    '<incident_id_from_above>', 
    'Test Task', 
    'assessment', 
    'TEST', 
    'dispatched'
);
```

In a separate psql session, run `LISTEN task_dispatch;` before the INSERT and you should receive a notification.

## Environment Variables

Add these to your `.env` file:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Migration Management

### Creating New Migrations

```bash
supabase migration new migration_name
```

Edit the generated file in `supabase/migrations/` and apply:

```bash
supabase db reset
```

### Rolling Back

Supabase CLI does not support automatic rollback. To revert:
1. Create a new migration that reverses the changes
2. Or restore from a database snapshot

## Security Considerations

- **Service Role Key**: Only use in trusted server environments (backend API, bridge process)
- **Anon Key**: Safe for client-side use with RLS enabled
- **RLS Policies**: All tables have RLS enabled. Test policies thoroughly before production.
- **JWT Claims**: RLS policies rely on `request.jwt.claims` from better-auth

## Performance Tuning

Indexes are created for common query patterns:
- `idx_volunteers_bitchat`: Volunteer lookup by Bitchat username
- `idx_tasks_status`: Task filtering by status
- `idx_tasks_incident`: Tasks for a specific incident
- `idx_assignments_task`: Assignments for a task

Monitor query performance with:

```sql
EXPLAIN ANALYZE SELECT * FROM tasks WHERE status = 'dispatched';
```

## Bridge Integration

The bridge process connects Supabase to the Bluetooth mesh network:

1. **LISTEN**: Bridge subscribes to `task_dispatch` channel
2. **NOTIFY**: `notify_task_dispatch()` trigger sends task data
3. **Mesh Dispatch**: Bridge forwards task to volunteer via Bitchat
4. **Response Handling**: Bridge updates task status based on mesh responses

See `backend/bridge/` for bridge implementation details.

## Troubleshooting

### RLS Policies Not Working

Check JWT claims format:

```sql
SELECT current_setting('request.jwt.claims', true)::jsonb;
```

### NOTIFY Not Firing

Ensure trigger is active:

```sql
SELECT * FROM pg_trigger WHERE tgname = 'tasks_dispatch_notify';
```

### Performance Issues

Check slow queries:

```sql
SELECT * FROM pg_stat_statements 
ORDER BY total_exec_time DESC 
LIMIT 10;
```

## Next Steps

1. Seed test data (see `backend/scripts/seed.ts`)
2. Set up Supabase Realtime subscriptions in frontend
3. Configure bridge process for PostgreSQL LISTEN
4. Test RLS policies with different user roles
5. Monitor database performance with Supabase Dashboard

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL 14 Docs](https://www.postgresql.org/docs/14/)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL NOTIFY/LISTEN](https://www.postgresql.org/docs/current/sql-notify.html)
