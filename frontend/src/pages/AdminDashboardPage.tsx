import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import Layout from '../components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, AlertTriangle, Users, ClipboardList } from 'lucide-react';

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    incidentType: 'flood' | 'fire' | 'earthquake' | 'medical' | 'rescue' | 'infrastructure' | 'other';
    severity: 'low' | 'medium' | 'high' | 'critical';
    waterLevel: string;
    threshold: string;
    address: string;
  }>({
    title: '',
    description: '',
    incidentType: 'flood',
    severity: 'high',
    waterLevel: '',
    threshold: '',
    address: '',
  });

  const activeIncidents = useQuery(api.incidents.getByStatus, {
    status: 'active',
  });
  const pendingTasks = useQuery(api.tasks.list, { status: 'pending' });
  const availableVolunteers = useQuery(api.volunteers.getByStatus, {
    status: 'online',
  });
  const recentIncidents = useQuery(api.incidents.list, {});

  const createIncident = useMutation(api.incidents.create);
  const generateTasks = useMutation(api.tasks.generateForIncident);
  const matchIncident = useMutation(api.matching.matchIncident);

  const stats = {
    activeIncidents: activeIncidents?.length ?? 0,
    pendingTasks: pendingTasks?.length ?? 0,
    availableVolunteers: availableVolunteers?.length ?? 0,
  };

  async function handleCreateIncident(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);

    try {
      const incidentId = await createIncident({
        title: formData.title,
        description: formData.description,
        incident_type: formData.incidentType,
        severity: formData.severity,
        status: 'active',
        trigger_data: {
          water_level: parseFloat(formData.waterLevel) || 0,
          threshold: parseFloat(formData.threshold) || 0,
          address: formData.address,
        },
      });

      await generateTasks({ incident_id: incidentId });
      await matchIncident({ incident_id: incidentId });

      setShowCreateModal(false);
      setFormData({
        title: '',
        description: '',
        incidentType: 'flood' as const,
        severity: 'high' as const,
        waterLevel: '',
        threshold: '',
        address: '',
      });

      navigate(`/incidents/${incidentId}`);
    } catch (error) {
      console.error('Error creating incident:', error);
      alert('Failed to create incident. Please try again.');
    } finally {
      setCreating(false);
    }
  }

  const incidents = recentIncidents?.slice(0, 5) ?? [];

  return (
    <Layout>
      <div className="space-y-8 max-w-6xl mx-auto">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-heading font-bold tracking-tight text-foreground">
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage incidents and coordinate response efforts.
            </p>
          </div>
          <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Incident
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Incident</DialogTitle>
                <DialogDescription>
                  Enter the details of the emergency incident to initiate response.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateIncident} className="space-y-6 py-4">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="title">Incident Title</Label>
                    <Input
                      id="title"
                      placeholder="e.g. Sector 7 Flood"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <textarea
                      id="description"
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Operational details..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="type">Type</Label>
                      <Select 
                        value={formData.incidentType} 
                        onValueChange={(value: any) => setFormData({ ...formData, incidentType: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="flood">Flood</SelectItem>
                          <SelectItem value="fire">Fire</SelectItem>
                          <SelectItem value="earthquake">Earthquake</SelectItem>
                          <SelectItem value="storm">Storm</SelectItem>
                          <SelectItem value="medical">Medical</SelectItem>
                          <SelectItem value="rescue">Rescue</SelectItem>
                          <SelectItem value="infrastructure">Infrastructure</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="severity">Severity</Label>
                      <Select 
                        value={formData.severity} 
                        onValueChange={(value: any) => setFormData({ ...formData, severity: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select severity" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="waterLevel">Water Level (ft)</Label>
                      <Input
                        id="waterLevel"
                        type="number"
                        step="0.1"
                        placeholder="0.0"
                        value={formData.waterLevel}
                        onChange={(e) => setFormData({ ...formData, waterLevel: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="threshold">Threshold (ft)</Label>
                      <Input
                        id="threshold"
                        type="number"
                        step="0.1"
                        placeholder="0.0"
                        value={formData.threshold}
                        onChange={(e) => setFormData({ ...formData, threshold: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="address">Location / Address</Label>
                    <Input
                      id="address"
                      placeholder="Sector / Grid Ref"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={creating}>
                    {creating ? 'Creating...' : 'Create Incident'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Incidents</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeIncidents}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingTasks}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Volunteers Online</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.availableVolunteers}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Incident Log</CardTitle>
            <CardDescription>Recent emergency incidents and their status.</CardDescription>
          </CardHeader>
          <CardContent>
            {incidents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No incidents recorded.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incidents.map((incident: any) => (
                    <TableRow 
                      key={incident._id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/incidents/${incident._id}`)}
                    >
                      <TableCell className="font-medium">{incident.title}</TableCell>
                      <TableCell className="capitalize">{incident.incident_type}</TableCell>
                      <TableCell>
                        <Badge variant={
                          incident.severity === 'critical' ? 'destructive' :
                          incident.severity === 'high' ? 'destructive' :
                          incident.severity === 'medium' ? 'secondary' : 'outline'
                        }>
                          {incident.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            incident.status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                          }`} />
                          <span className="capitalize">{incident.status}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {new Date(incident._creationTime).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
