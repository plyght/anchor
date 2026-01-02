export interface Volunteer {
  id: string;
  user_id: string;
  full_name: string;
  bitchat_username: string;
  phone?: string;
  email?: string;
  skills: string[];
  availability_schedule: Record<string, string[]>;
  current_status: 'available' | 'busy' | 'offline';
  location?: {
    lat: number;
    lon: number;
    address: string;
  };
  created_at: string;
  updated_at: string;
}

export interface Incident {
  id: string;
  title: string;
  description?: string;
  incident_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  trigger_data?: Record<string, any>;
  status: 'active' | 'resolved' | 'cancelled';
  location?: {
    lat: number;
    lon: number;
    address: string;
  };
  created_at: string;
  resolved_at?: string;
}

export interface Task {
  id: string;
  incident_id: string;
  title: string;
  description?: string;
  task_type: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  required_skills: string[];
  location?: {
    lat: number;
    lon: number;
    address: string;
  };
  assigned_volunteer_id?: string;
  acceptance_code: string;
  status: 'pending' | 'dispatched' | 'accepted' | 'declined' | 'completed' | 'escalated';
  dispatched_at?: string;
  accepted_at?: string;
  completed_at?: string;
  escalation_count: number;
  created_at: string;
  updated_at: string;
}

export interface TaskAssignment {
  id: string;
  task_id: string;
  volunteer_id: string;
  acceptance_code: string;
  status: 'sent' | 'accepted' | 'declined' | 'timeout';
  response_message?: string;
  assigned_at: string;
  responded_at?: string;
}

export interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  actor?: string;
  details?: Record<string, any>;
  created_at: string;
}
