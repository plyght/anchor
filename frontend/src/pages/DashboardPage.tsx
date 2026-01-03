import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Activity, Users, ClipboardList, AlertTriangle } from 'lucide-react';

export default function DashboardPage() {
  const activeIncidents = useQuery(api.incidents.getByStatus, {
    status: 'active',
  });
  const pendingTasks = useQuery(api.tasks.list, { status: 'pending' });
  const availableVolunteers = useQuery(api.volunteers.getByStatus, {
    status: 'online',
  });

  return (
    <Layout>
      <div className="space-y-8 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-heading font-bold tracking-tight text-foreground">
              Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Overview of current incidents and volunteer status.
            </p>
          </div>
          <Button className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
            <AlertTriangle className="mr-2 h-4 w-4" />
            Report Incident
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Incidents</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {activeIncidents?.length ?? 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Requiring immediate attention
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {pendingTasks?.length ?? 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Awaiting assignment
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Volunteers Online</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {availableVolunteers?.length ?? 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Ready for deployment
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest incidents and system updates.</CardDescription>
            </CardHeader>
            <CardContent>
              {!activeIncidents || activeIncidents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                  <Activity className="h-8 w-8 mb-3 opacity-20" />
                  <p>No active incidents detected</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeIncidents.map((incident: { _id: string; title: string; incident_type: string; _creationTime: number }) => (
                    <div
                      key={incident._id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <div className="p-2 bg-destructive/10 text-destructive rounded-full">
                          <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">
                            {incident.title}
                          </h3>
                          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                            <span className="capitalize">{incident.incident_type}</span>
                            <span>•</span>
                            <span>
                              {Math.floor((Date.now() - incident._creationTime) / 1000 / 60)} mins ago
                            </span>
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline">Active</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
