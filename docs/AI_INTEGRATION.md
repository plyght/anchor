# AI Integration Guide

## Overview

Anchor now includes AI-powered features for intelligent task generation, volunteer matching, and emergency message routing using OpenAI's GPT models.

## Features

### 1. AI-Powered Task Generation

Generate context-aware tasks dynamically based on incident details instead of using hardcoded templates.

**Usage:**

```typescript
import { useAction } from 'convex/react';
import { api } from './convex/_generated/api';

const generateTasks = useAction(api.tasks.generateForIncident);

// With AI
const taskIds = await generateTasks({ 
  incident_id: incidentId,
  use_ai: true 
});

// Without AI (uses hardcoded templates)
const taskIds = await generateTasks({ 
  incident_id: incidentId,
  use_ai: false 
});
```

**Benefits:**
- Dynamically adapts to different incident types
- Creates contextually relevant task descriptions
- Suggests appropriate skills and priorities
- Falls back to hardcoded templates if AI fails

### 2. AI-Assisted Volunteer Matching

Enhance rule-based matching with AI reasoning for difficult-to-match tasks.

**Usage:**

```typescript
import { useAction } from 'convex/react';
import { api } from './convex/_generated/api';

const matchWithAI = useAction(api.matching.matchIncidentWithAI);

const result = await matchWithAI({ 
  incident_id: incidentId,
  use_ai_fallback: true 
});

console.log(`Matched: ${result.matched}`);
console.log(`AI Assisted: ${result.ai_assisted}`);
console.log(`Unmatched: ${result.unmatched}`);
```

**How it works:**
1. First attempts rule-based matching (skill, availability, location)
2. For unmatched tasks, uses AI to find suitable volunteers
3. Returns combined results with match method tracking

**Benefits:**
- Handles edge cases rule-based matching misses
- Provides reasoning for each match
- Falls back gracefully if AI is unavailable
- Tracks which matches used AI for analytics

### 3. Emergency Message Routing

Automatically analyze incoming emergency messages and route to appropriate volunteers.

**Usage:**

```typescript
import { useAction } from 'convex/react';
import { api } from './convex/_generated/api';

const processMessage = useAction(api.ai_routing.processEmergencyMessage);

const result = await processMessage({
  message: "We need medical help at 123 Main St. Person injured.",
  incident_id: incidentId,
  auto_assign: true
});

console.log(`Urgency: ${result.analysis.urgency}`);
console.log(`Type: ${result.analysis.message_type}`);
console.log(`Recommended volunteers:`, result.recommended_volunteers);
console.log(`Task created:`, result.task_created);
```

**Features:**
- Extracts urgency level (low, medium, high, critical)
- Identifies message type (medical, rescue, logistics, etc.)
- Detects required skills
- Recommends best-fit volunteers
- Optionally auto-creates task and assigns volunteer
- Validates all volunteer IDs before returning

**Benefits:**
- Automates triage of incoming mesh messages
- Reduces response time
- Ensures proper skill matching
- Provides reasoning for coordinator review

### 4. Individual Task Matching

Get AI recommendations for a single task.

**Usage:**

```typescript
import { useAction } from 'convex/react';
import { api } from './convex/_generated/api';

const matchTask = useAction(api.ai_routing.matchVolunteerToTask);

const result = await matchTask({ task_id: taskId });

if (result.best_match) {
  console.log(`Best match: ${result.best_match.volunteer_name}`);
  console.log(`Confidence: ${result.best_match.confidence}`);
  console.log(`Reasoning: ${result.best_match.reasoning}`);
}

console.log(`Alternatives:`, result.alternatives);
```

**Benefits:**
- Detailed reasoning for each match
- Confidence scores
- Alternative options
- Useful for manual coordinator review

### 5. Message Analysis Only

Analyze a message without taking action.

**Usage:**

```typescript
import { useAction } from 'convex/react';
import { api } from './convex/_generated/api';

const analyzeMessage = useAction(api.ai_routing.analyzeMessageAndRoute);

const result = await analyzeMessage({
  message: "Fire spreading in sector 7, need evacuation support",
  incident_context: "Wildfire - critical severity",
  location_hint: "Mountain View District"
});

console.log(result.analysis);
console.log(result.recommended_volunteers);
console.log(result.suggested_response);
```

## Configuration

### Environment Variables

AI features require OpenAI API key in Convex environment:

```bash
bunx convex env set OPENAI_API_KEY "sk-..."
```

Check current configuration:

```bash
bunx convex env list
```

### Cost Considerations

AI features use OpenAI's `gpt-4o-mini` model:
- Task generation: ~$0.01 per incident (5 task types)
- Message routing: ~$0.005 per message
- Volunteer matching: ~$0.005 per task

Estimate: ~$10-20/month for medium-volume emergency operations.

## Error Handling

All AI functions include robust error handling:

- **Validation**: All returned volunteer IDs are validated against the database
- **Fallbacks**: If AI fails, functions return safe defaults or use rule-based logic
- **Logging**: Errors logged to Convex console for debugging
- **User feedback**: Error messages included in responses

## Best Practices

### When to Use AI

**Use AI for:**
- Complex incidents with unclear task requirements
- Emergency messages that need triage
- Tasks with unusual skill combinations
- Situations where rule-based matching fails

**Don't use AI for:**
- Simple, routine incidents (use templates)
- When immediate response is critical (AI adds latency)
- When you have limited OpenAI quota
- For incidents with well-established procedures

### Combining AI with Rules

The hybrid approach works best:

```typescript
// 1. Try rule-based matching first (fast, free)
const ruleResult = await matchIncident({ incident_id });

// 2. Use AI only for unmatched tasks
if (ruleResult.unmatched > 0) {
  await matchIncidentWithAI({ 
    incident_id,
    use_ai_fallback: true 
  });
}
```

### Monitoring AI Usage

Track AI-assisted matches for analytics:

```typescript
const result = await matchIncidentWithAI({ 
  incident_id,
  use_ai_fallback: true 
});

// Log AI usage
console.log(`AI assisted ${result.ai_assisted} out of ${result.matched} matches`);
```

## API Reference

### `api.tasks.generateForIncident`

**Type:** Action  
**Args:**
- `incident_id: Id<"incidents">` - Incident to generate tasks for
- `use_ai?: boolean` - Enable AI generation (default: false)

**Returns:** `Id<"tasks">[]` - Created task IDs

### `api.matching.matchIncidentWithAI`

**Type:** Action  
**Args:**
- `incident_id: Id<"incidents">` - Incident to match
- `use_ai_fallback?: boolean` - Use AI for unmatched tasks (default: false)

**Returns:**
```typescript
{
  matched: number;
  unmatched: number;
  ai_assisted: number;
  assignments: Array<{
    task_id: Id<"tasks">;
    volunteer_id: Id<"volunteers">;
    match_score: number;
    match_method: "rule_based" | "ai_assisted";
  }>;
  unmatched_task_ids: Id<"tasks">[];
}
```

### `api.ai_routing.processEmergencyMessage`

**Type:** Action  
**Args:**
- `message: string` - Emergency message text
- `incident_id?: Id<"incidents">` - Associated incident
- `auto_assign?: boolean` - Auto-create task and assign (default: false)

**Returns:**
```typescript
{
  analysis: {
    message_type: string;
    urgency: "low" | "medium" | "high" | "critical";
    required_skills: string[];
    summary: string;
  };
  recommended_volunteers: Array<{
    volunteer_id: string;
    volunteer_name: string;
    confidence: number;
    reasoning: string;
    matched_skills: string[];
  }>;
  suggested_response?: string;
  task_created: Id<"tasks"> | null;
  assignments_created: Id<"volunteers">[];
}
```

### `api.ai_routing.matchVolunteerToTask`

**Type:** Action  
**Args:**
- `task_id: Id<"tasks">` - Task to match

**Returns:**
```typescript
{
  best_match: {
    volunteer_id: string;
    volunteer_name: string;
    confidence: number;
    reasoning: string;
  } | null;
  alternatives: Array<{
    volunteer_id: string;
    volunteer_name: string;
    confidence: number;
    reasoning: string;
  }>;
}
```

### `api.ai_routing.analyzeMessageAndRoute`

**Type:** Action  
**Args:**
- `message: string` - Message to analyze
- `incident_context?: string` - Incident context
- `location_hint?: string` - Location information

**Returns:**
```typescript
{
  analysis: {
    message_type: string;
    urgency: "low" | "medium" | "high" | "critical";
    required_skills: string[];
    summary: string;
  };
  recommended_volunteers: Array<{
    volunteer_id: string;
    volunteer_name: string;
    confidence: number;
    reasoning: string;
    matched_skills: string[];
  }>;
  suggested_response?: string;
}
```

## Testing

Test AI features in development:

```typescript
// Test task generation
const testIncident = await createIncident({
  title: "Test Earthquake",
  incident_type: "earthquake",
  severity: "high",
  description: "Magnitude 6.5 earthquake with building damage"
});

const tasks = await generateForIncident({ 
  incident_id: testIncident,
  use_ai: true 
});

console.log(`Generated ${tasks.length} AI-powered tasks`);

// Test message routing
const result = await processEmergencyMessage({
  message: "Building collapsed at 5th and Main, people trapped inside",
  auto_assign: false
});

console.log(result.analysis);
console.log(result.recommended_volunteers);
```

## Troubleshooting

### AI not returning results

**Issue:** AI functions return empty arrays or null

**Solutions:**
1. Check OpenAI API key: `bunx convex env list`
2. Verify volunteers exist and are online
3. Check Convex function logs for errors
4. Ensure incident data is complete

### Volunteer IDs invalid

**Issue:** AI returns volunteer IDs that don't exist

**Fix:** This shouldn't happen - IDs are validated before returning. If it does:
1. Check volunteer database for corruption
2. Verify volunteer deletion isn't happening during matching
3. Report as bug

### High latency

**Issue:** AI functions taking too long

**Solutions:**
1. Use AI selectively (not for every operation)
2. Implement timeout handling
3. Cache AI results where appropriate
4. Consider reducing number of task types in generation

### OpenAI rate limits

**Issue:** Hitting API rate limits

**Solutions:**
1. Implement exponential backoff
2. Reduce AI usage frequency
3. Upgrade OpenAI tier
4. Add request queuing

## Future Enhancements

Potential improvements:
- Fine-tune model on historical incident data
- Add confidence thresholds for auto-assignment
- Implement AI-powered incident severity assessment
- Create AI chatbot for coordinators
- Generate post-incident reports automatically
