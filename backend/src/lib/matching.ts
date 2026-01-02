import { supabase } from './supabase';
import type { Volunteer, Task } from '../types';

interface Location {
  lat: number;
  lon: number;
  address: string;
}

function calculateDistance(loc1: Location, loc2: Location): number {
  const R = 6371;
  const dLat = (loc2.lat - loc1.lat) * Math.PI / 180;
  const dLon = (loc2.lon - loc1.lon) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(loc1.lat * Math.PI / 180) * Math.cos(loc2.lat * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function isAvailableNow(availabilitySchedule: Record<string, string[]>): boolean {
  const now = new Date();
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const currentDay = dayNames[now.getDay()];
  if (!currentDay) return false;
  const currentTime = now.getHours() * 60 + now.getMinutes();
  
  const schedule = availabilitySchedule[currentDay] || [];
  
  for (const slot of schedule) {
    if (slot === 'all_day') return true;
    
    const [start, end] = slot.split('-');
    if (!start || !end) continue;
    
    const startParts = start.split(':').map(Number);
    const endParts = end.split(':').map(Number);
    if (startParts.length < 2 || endParts.length < 2) continue;
    
    const [startHour, startMin] = startParts;
    const [endHour, endMin] = endParts;
    if (startHour === undefined || startMin === undefined || endHour === undefined || endMin === undefined) continue;
    
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;
    
    if (currentTime >= startTime && currentTime <= endTime) {
      return true;
    }
  }
  
  return false;
}

function hasRequiredSkills(volunteerSkills: string[], requiredSkills: string[]): boolean {
  if (requiredSkills.length === 0) return true;
  return requiredSkills.some(skill => volunteerSkills.includes(skill));
}

function calculateMatchScore(
  volunteer: Volunteer,
  task: Task,
  taskLocation?: Location
): number {
  let score = 0;
  
  if (volunteer.current_status !== 'available') return 0;
  
  if (!isAvailableNow(volunteer.availability_schedule)) return 0;
  
  const hasSkills = hasRequiredSkills(volunteer.skills, task.required_skills);
  if (!hasSkills) return 0;
  
  score += 50;
  
  const matchingSkillsCount = task.required_skills.filter(skill => 
    volunteer.skills.includes(skill)
  ).length;
  score += matchingSkillsCount * 10;
  
  if (taskLocation && volunteer.location) {
    const distance = calculateDistance(volunteer.location, taskLocation);
    
    if (distance <= 5) {
      score += 30;
    } else if (distance <= 10) {
      score += 20;
    } else if (distance <= 20) {
      score += 10;
    }
  }
  
  if (task.priority === 'urgent') {
    score += 20;
  } else if (task.priority === 'high') {
    score += 10;
  }
  
  return score;
}

export async function matchTasksToVolunteers(incidentId: string): Promise<{
  assignments: Array<{
    task_id: string;
    volunteer_id: string;
    score: number;
  }>;
  unmatched: string[];
}> {
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('*')
    .eq('incident_id', incidentId)
    .eq('status', 'pending');

  if (tasksError || !tasks) {
    throw new Error(`Failed to fetch tasks: ${tasksError?.message}`);
  }

  const { data: volunteers, error: volunteersError } = await supabase
    .from('volunteers')
    .select('*')
    .eq('current_status', 'available');

  if (volunteersError || !volunteers) {
    throw new Error(`Failed to fetch volunteers: ${volunteersError?.message}`);
  }

  const usedVolunteers = new Set<string>();
  const assignments: Array<{ task_id: string; volunteer_id: string; score: number }> = [];
  const unmatched: string[] = [];

  const tasksByPriority = [...tasks].sort((a, b) => {
    const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
    const aPriority = priorityOrder[a.priority] ?? 999;
    const bPriority = priorityOrder[b.priority] ?? 999;
    return aPriority - bPriority;
  });

  for (const task of tasksByPriority) {
    const availableVolunteers = volunteers.filter(v => !usedVolunteers.has(v.id));
    
    if (availableVolunteers.length === 0) {
      unmatched.push(task.id);
      continue;
    }

    const scoredVolunteers = availableVolunteers
      .map(volunteer => ({
        volunteer,
        score: calculateMatchScore(volunteer, task, task.location),
      }))
      .filter(v => v.score > 0)
      .sort((a, b) => b.score - a.score);

    if (scoredVolunteers.length === 0) {
      unmatched.push(task.id);
      continue;
    }

    const bestMatch = scoredVolunteers[0];
    if (!bestMatch) {
      unmatched.push(task.id);
      continue;
    }
    
    assignments.push({
      task_id: task.id,
      volunteer_id: bestMatch.volunteer.id,
      score: bestMatch.score,
    });
    usedVolunteers.add(bestMatch.volunteer.id);
  }

  return { assignments, unmatched };
}

export async function assignTaskToVolunteer(
  taskId: string,
  volunteerId: string
): Promise<void> {
  const { error: updateError } = await supabase
    .from('tasks')
    .update({
      assigned_volunteer_id: volunteerId,
      status: 'dispatched',
      dispatched_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId);

  if (updateError) {
    throw new Error(`Failed to assign task: ${updateError.message}`);
  }

  const { data: task } = await supabase
    .from('tasks')
    .select('acceptance_code')
    .eq('id', taskId)
    .single();

  if (task) {
    const { error: assignmentError } = await supabase
      .from('task_assignments')
      .insert({
        task_id: taskId,
        volunteer_id: volunteerId,
        acceptance_code: task.acceptance_code,
        status: 'sent',
        assigned_at: new Date().toISOString(),
      });

    if (assignmentError) {
      console.error('Failed to create task assignment record:', assignmentError);
    }
  }

  const { error: auditError } = await supabase
    .from('audit_log')
    .insert({
      entity_type: 'task',
      entity_id: taskId,
      action: 'assigned',
      actor: 'system',
      details: { volunteer_id: volunteerId },
    });

  if (auditError) {
    console.error('Failed to create audit log:', auditError);
  }
}
