-- Anchor Emergency Volunteer Coordination System
-- Initial Database Schema Migration
-- PostgreSQL 14+ / Supabase

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- VOLUNTEERS TABLE
-- Stores volunteer profiles with skills, availability, and mesh network identity
-- =============================================================================
CREATE TABLE volunteers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    full_name TEXT NOT NULL,
    bitchat_username TEXT UNIQUE NOT NULL,
    phone TEXT,
    email TEXT,
    skills TEXT[] DEFAULT '{}',
    availability_schedule JSONB DEFAULT '{}',
    current_status TEXT NOT NULL DEFAULT 'offline' CHECK (current_status IN ('online', 'offline', 'busy', 'responding')),
    location JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- INCIDENTS TABLE
-- Tracks emergency incidents that generate volunteer tasks
-- =============================================================================
CREATE TABLE incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    incident_type TEXT NOT NULL CHECK (incident_type IN ('flood', 'fire', 'earthquake', 'medical', 'rescue', 'infrastructure', 'other')),
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    trigger_data JSONB,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'monitoring', 'resolved', 'cancelled')),
    location JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- =============================================================================
-- TASKS TABLE
-- Individual volunteer tasks dispatched via Bluetooth mesh network
-- =============================================================================
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    task_type TEXT NOT NULL CHECK (task_type IN ('assessment', 'rescue', 'medical', 'evacuation', 'supplies', 'communication', 'coordination')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    required_skills TEXT[] DEFAULT '{}',
    location JSONB,
    assigned_volunteer_id UUID REFERENCES volunteers(id) ON DELETE SET NULL,
    acceptance_code TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'dispatched', 'accepted', 'in_progress', 'completed', 'cancelled', 'failed')),
    dispatched_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    escalation_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- TASK_ASSIGNMENTS TABLE
-- Tracks all assignment attempts and volunteer responses for audit trail
-- =============================================================================
CREATE TABLE task_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    volunteer_id UUID NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
    acceptance_code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'timeout', 'reassigned')),
    response_message TEXT,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMPTZ
);

-- =============================================================================
-- AUDIT_LOG TABLE
-- Comprehensive audit trail for all entity changes and system actions
-- =============================================================================
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type TEXT NOT NULL CHECK (entity_type IN ('volunteer', 'incident', 'task', 'assignment', 'system')),
    entity_id UUID,
    action TEXT NOT NULL,
    actor TEXT,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- MESH_MESSAGES TABLE
-- Log of all Bluetooth mesh messages sent/received for debugging and analytics
-- =============================================================================
CREATE TABLE mesh_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    message_content TEXT NOT NULL,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    volunteer_bitchat_username TEXT,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- Performance optimization for common query patterns
-- =============================================================================
CREATE INDEX idx_volunteers_bitchat ON volunteers(bitchat_username);
CREATE INDEX idx_volunteers_status ON volunteers(current_status);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_incident ON tasks(incident_id);
CREATE INDEX idx_tasks_assigned_volunteer ON tasks(assigned_volunteer_id);
CREATE INDEX idx_assignments_task ON task_assignments(task_id);
CREATE INDEX idx_assignments_volunteer ON task_assignments(volunteer_id);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_mesh_messages_task ON mesh_messages(task_id);
CREATE INDEX idx_mesh_messages_volunteer ON mesh_messages(volunteer_bitchat_username);

-- =============================================================================
-- POSTGRESQL FUNCTION: notify_task_dispatch
-- Sends PostgreSQL NOTIFY event when task is dispatched for bridge to listen
-- =============================================================================
CREATE OR REPLACE FUNCTION notify_task_dispatch()
RETURNS TRIGGER AS $$
DECLARE
    notification_payload JSONB;
BEGIN
    IF NEW.status = 'dispatched' AND (OLD IS NULL OR OLD.status != 'dispatched') THEN
        notification_payload := jsonb_build_object(
            'task_id', NEW.id,
            'incident_id', NEW.incident_id,
            'title', NEW.title,
            'description', NEW.description,
            'task_type', NEW.task_type,
            'priority', NEW.priority,
            'required_skills', NEW.required_skills,
            'location', NEW.location,
            'assigned_volunteer_id', NEW.assigned_volunteer_id,
            'acceptance_code', NEW.acceptance_code,
            'dispatched_at', NEW.dispatched_at
        );
        
        PERFORM pg_notify('task_dispatch', notification_payload::TEXT);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TRIGGER: tasks_dispatch_notify
-- Automatically calls notify_task_dispatch() when tasks are inserted or updated
-- =============================================================================
CREATE TRIGGER tasks_dispatch_notify
    AFTER INSERT OR UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION notify_task_dispatch();

-- =============================================================================
-- FUNCTION: update_updated_at_column
-- Automatically updates updated_at timestamp on row modification
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TRIGGERS: Auto-update updated_at timestamps
-- =============================================================================
CREATE TRIGGER update_volunteers_updated_at
    BEFORE UPDATE ON volunteers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE mesh_messages ENABLE ROW LEVEL SECURITY;

-- VOLUNTEERS POLICIES
CREATE POLICY "Volunteers can view their own profile"
    ON volunteers FOR SELECT
    USING (user_id = current_setting('request.jwt.claims', true)::jsonb->>'sub');

CREATE POLICY "Volunteers can update their own profile"
    ON volunteers FOR UPDATE
    USING (user_id = current_setting('request.jwt.claims', true)::jsonb->>'sub');

CREATE POLICY "Admins can view all volunteers"
    ON volunteers FOR SELECT
    USING (
        current_setting('request.jwt.claims', true)::jsonb->>'role' = 'admin'
    );

CREATE POLICY "Admins can insert volunteers"
    ON volunteers FOR INSERT
    WITH CHECK (
        current_setting('request.jwt.claims', true)::jsonb->>'role' = 'admin'
    );

CREATE POLICY "Admins can update all volunteers"
    ON volunteers FOR UPDATE
    USING (
        current_setting('request.jwt.claims', true)::jsonb->>'role' = 'admin'
    );

-- INCIDENTS POLICIES
CREATE POLICY "Authenticated users can view incidents"
    ON incidents FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can manage incidents"
    ON incidents FOR ALL
    USING (
        current_setting('request.jwt.claims', true)::jsonb->>'role' = 'admin'
    );

-- TASKS POLICIES
CREATE POLICY "Volunteers can view their assigned tasks"
    ON tasks FOR SELECT
    USING (
        assigned_volunteer_id IN (
            SELECT id FROM volunteers 
            WHERE user_id = current_setting('request.jwt.claims', true)::jsonb->>'sub'
        )
    );

CREATE POLICY "Volunteers can view dispatched tasks for acceptance"
    ON tasks FOR SELECT
    USING (status = 'dispatched');

CREATE POLICY "Volunteers can update their assigned tasks"
    ON tasks FOR UPDATE
    USING (
        assigned_volunteer_id IN (
            SELECT id FROM volunteers 
            WHERE user_id = current_setting('request.jwt.claims', true)::jsonb->>'sub'
        )
    );

CREATE POLICY "Admins can manage all tasks"
    ON tasks FOR ALL
    USING (
        current_setting('request.jwt.claims', true)::jsonb->>'role' = 'admin'
    );

-- TASK_ASSIGNMENTS POLICIES
CREATE POLICY "Volunteers can view their own assignments"
    ON task_assignments FOR SELECT
    USING (
        volunteer_id IN (
            SELECT id FROM volunteers 
            WHERE user_id = current_setting('request.jwt.claims', true)::jsonb->>'sub'
        )
    );

CREATE POLICY "Volunteers can update their own assignments"
    ON task_assignments FOR UPDATE
    USING (
        volunteer_id IN (
            SELECT id FROM volunteers 
            WHERE user_id = current_setting('request.jwt.claims', true)::jsonb->>'sub'
        )
    );

CREATE POLICY "Admins can manage all assignments"
    ON task_assignments FOR ALL
    USING (
        current_setting('request.jwt.claims', true)::jsonb->>'role' = 'admin'
    );

-- AUDIT_LOG POLICIES
CREATE POLICY "Admins can view audit logs"
    ON audit_log FOR SELECT
    USING (
        current_setting('request.jwt.claims', true)::jsonb->>'role' = 'admin'
    );

CREATE POLICY "System can insert audit logs"
    ON audit_log FOR INSERT
    WITH CHECK (true);

-- MESH_MESSAGES POLICIES
CREATE POLICY "Volunteers can view messages related to their tasks"
    ON mesh_messages FOR SELECT
    USING (
        task_id IN (
            SELECT id FROM tasks 
            WHERE assigned_volunteer_id IN (
                SELECT id FROM volunteers 
                WHERE user_id = current_setting('request.jwt.claims', true)::jsonb->>'sub'
            )
        )
        OR volunteer_bitchat_username IN (
            SELECT bitchat_username FROM volunteers 
            WHERE user_id = current_setting('request.jwt.claims', true)::jsonb->>'sub'
        )
    );

CREATE POLICY "Admins can view all mesh messages"
    ON mesh_messages FOR SELECT
    USING (
        current_setting('request.jwt.claims', true)::jsonb->>'role' = 'admin'
    );

CREATE POLICY "System can insert mesh messages"
    ON mesh_messages FOR INSERT
    WITH CHECK (true);

-- =============================================================================
-- HELPER FUNCTION: generate_acceptance_code
-- Generates unique 4-character alphanumeric acceptance codes for tasks
-- =============================================================================
CREATE OR REPLACE FUNCTION generate_acceptance_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    result TEXT := '';
    i INTEGER;
    code_exists BOOLEAN;
BEGIN
    LOOP
        result := '';
        FOR i IN 1..4 LOOP
            result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
        END LOOP;
        
        SELECT EXISTS(SELECT 1 FROM tasks WHERE acceptance_code = result) INTO code_exists;
        
        EXIT WHEN NOT code_exists;
    END LOOP;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
