import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import Layout from '../components/Layout';

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
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition font-medium"
          >
            🚨 Create Emergency Incident
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-700">Active Incidents</h3>
            <p className="text-4xl font-bold text-blue-600 mt-2">{stats.activeIncidents}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-700">Pending Tasks</h3>
            <p className="text-4xl font-bold text-yellow-600 mt-2">{stats.pendingTasks}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-700">Available Volunteers</h3>
            <p className="text-4xl font-bold text-green-600 mt-2">{stats.availableVolunteers}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Incidents</h2>
          {incidents.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No incidents yet</p>
          ) : (
            <div className="space-y-3">
              {incidents.map((incident: { _id: string; title: string; incident_type: string; severity: string; status: string; _creationTime: number }) => (
                <div
                  key={incident._id}
                  onClick={() => navigate(`/incidents/${incident._id}`)}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <div>
                    <h3 className="font-medium text-gray-900">{incident.title}</h3>
                    <p className="text-sm text-gray-500">
                      {incident.incident_type} • {new Date(incident._creationTime).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        incident.severity === 'critical'
                          ? 'bg-red-100 text-red-800'
                          : incident.severity === 'high'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {incident.severity}
                    </span>
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        incident.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {incident.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Create Emergency Incident</h2>
            <form onSubmit={handleCreateIncident} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Incident Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g., River Flood - Section B"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                  placeholder="Additional details..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={formData.incidentType}
                    onChange={(e) => setFormData({ ...formData, incidentType: e.target.value as typeof formData.incidentType })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="flood">Flood</option>
                    <option value="fire">Fire</option>
                    <option value="earthquake">Earthquake</option>
                    <option value="storm">Storm</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Severity *
                  </label>
                  <select
                    value={formData.severity}
                    onChange={(e) => setFormData({ ...formData, severity: e.target.value as typeof formData.severity })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Water Level (ft)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.waterLevel}
                    onChange={(e) => setFormData({ ...formData, waterLevel: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="15.2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Threshold (ft)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.threshold}
                    onChange={(e) => setFormData({ ...formData, threshold: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="12.0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Address or coordinates"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition"
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition font-medium disabled:opacity-50"
                  disabled={creating}
                >
                  {creating ? 'Creating...' : 'Create & Dispatch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
