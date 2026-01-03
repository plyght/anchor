import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import Layout from '../components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, AlertTriangle, Clock, MapPin, Waves } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export default function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const incidentId = id as Id<'incidents'> | undefined;
  const incident = useQuery(
    api.incidents.get,
    incidentId ? { id: incidentId } : 'skip'
  );
  const tasks = useQuery(api.tasks.list, {
    incident_id: incidentId,
  });
  const generateTasks = useMutation(api.tasks.generateForIncident);

  async function handleGenerateTasks() {
    if (!incidentId) return;
    await generateTasks({ incident_id: incidentId });
  }

  if (!incident) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[50vh]">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
             <Activity className="w-8 h-8 animate-pulse" />
             <p>Loading incident details...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8 max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-heading font-bold tracking-tight text-foreground">
                {incident.title}
              </h1>
              <Badge variant={incident.status === 'active' ? 'destructive' : 'secondary'}>
                {incident.status}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {Math.floor((Date.now() - incident._creationTime) / 1000 / 60)} mins ago
              </span>
              <span>•</span>
              <span className="font-mono text-xs">ID: {incident._id}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Incident Details</CardTitle>
                <CardDescription>Key information and telemetry data.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Type</h4>
                    <div className="text-lg font-medium capitalize flex items-center gap-2">
                      {incident.incident_type === 'flood' && <Waves className="w-5 h-5" />}
                      {incident.incident_type === 'fire' && <AlertTriangle className="w-5 h-5" />}
                      {incident.incident_type}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Severity</h4>
                    <div className="flex items-center">
                      <Badge variant={
                        incident.severity === 'critical' ? 'destructive' :
                        incident.severity === 'high' ? 'destructive' :
                        incident.severity === 'medium' ? 'secondary' : 'outline'
                      }>
                        {incident.severity.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </div>

                <Separator />

                {incident.trigger_data && typeof incident.trigger_data === 'object' && 'water_level' in incident.trigger_data && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Water Level</h4>
                      <div className="text-2xl font-bold font-mono">
                        {String(incident.trigger_data.water_level)} <span className="text-sm text-muted-foreground font-sans">ft</span>
                      </div>
                    </div>
                    {'threshold' in incident.trigger_data && incident.trigger_data.threshold && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Threshold</h4>
                        <div className="text-2xl font-bold font-mono text-destructive">
                          {String(incident.trigger_data.threshold)} <span className="text-sm text-muted-foreground font-sans">ft</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {incident.trigger_data && typeof incident.trigger_data === 'object' && 'address' in incident.trigger_data && (
                  <div>
                     <h4 className="text-sm font-medium text-muted-foreground mb-1">Location</h4>
                     <div className="flex items-center gap-2">
                       <MapPin className="w-4 h-4 text-muted-foreground" />
                       <span>{String(incident.trigger_data.address)}</span>
                     </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Task List</CardTitle>
                  <CardDescription>Generated tasks for response teams.</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={handleGenerateTasks}>
                  Generate Tasks
                </Button>
              </CardHeader>
              <CardContent>
                {!tasks || tasks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                    No tasks generated yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {tasks.map((task: { _id: string; title: string; status: string; priority: string }) => (
                      <div
                        key={task._id}
                        className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{task.title}</span>
                            {task.priority === 'urgent' && (
                              <Badge variant="destructive" className="text-[10px] h-5">Urgent</Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">
                            ID: {task._id.substring(0, 8)}...
                          </div>
                        </div>
                        <Badge variant={
                          task.status === 'completed' ? 'default' :
                          task.status === 'accepted' ? 'secondary' :
                          task.status === 'dispatched' ? 'outline' : 'outline'
                        } className={task.status === 'completed' ? 'bg-green-600 hover:bg-green-700' : ''}>
                          {task.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
                <CardDescription>Response controls.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button className="w-full" size="lg">
                  Deploy Units
                </Button>
                <Button variant="outline" className="w-full">
                  Archive Incident
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
