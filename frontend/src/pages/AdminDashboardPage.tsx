import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
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
      <div className="space-y-8">
        <div className="flex justify-between items-end border-b border-tactical pb-4">
          <div>
            <h1 className="text-4xl font-display font-bold text-white uppercase tracking-wider">
              Command Center
            </h1>
            <p className="text-neon-amber font-mono text-sm mt-1 tracking-widest">
              ADMINISTRATIVE ACCESS GRANTED
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-neon-red text-black border border-neon-red px-6 py-2 hover:bg-white hover:text-black transition-colors font-mono font-bold text-sm uppercase tracking-wider"
          >
            Initiate Protocol
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-surface border border-tactical p-6">
            <h3 className="font-mono text-xs uppercase text-gray-500 tracking-widest mb-2">Active Threats</h3>
            <p className="text-5xl font-display font-bold text-neon-blue">{stats.activeIncidents}</p>
          </div>
          <div className="bg-surface border border-tactical p-6">
            <h3 className="font-mono text-xs uppercase text-gray-500 tracking-widest mb-2">Pending Ops</h3>
            <p className="text-5xl font-display font-bold text-neon-amber">{stats.pendingTasks}</p>
          </div>
          <div className="bg-surface border border-tactical p-6">
            <h3 className="font-mono text-xs uppercase text-gray-500 tracking-widest mb-2">Units Available</h3>
            <p className="text-5xl font-display font-bold text-neon-green">{stats.availableVolunteers}</p>
          </div>
        </div>

        <div className="bg-surface border border-tactical">
          <div className="p-4 border-b border-tactical bg-void/30">
            <h2 className="text-xl font-display font-bold text-white uppercase tracking-wide">Incident Log</h2>
          </div>
          {incidents.length === 0 ? (
            <p className="text-gray-500 text-center py-12 font-mono uppercase">System Clear</p>
          ) : (
            <div className="divide-y divide-tactical">
              {incidents.map((incident: { _id: string; title: string; incident_type: string; severity: string; status: string; _creationTime: number }) => (
                <div
                  key={incident._id}
                  onClick={() => navigate(`/incidents/${incident._id}`)}
                  className="flex items-center justify-between p-4 hover:bg-white/5 cursor-pointer transition-colors group"
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${incident.status === 'active' ? 'bg-neon-green animate-pulse' : 'bg-gray-600'}`}></span>
                      <h3 className="font-display font-bold text-white group-hover:text-neon-blue transition-colors text-lg uppercase">{incident.title}</h3>
                    </div>
                    <p className="text-xs font-mono text-gray-500 mt-1 pl-5">
                      {incident.incident_type} // {new Date(incident._creationTime).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2 font-mono text-xs">
                    <span
                      className={`px-2 py-1 uppercase border ${
                        incident.severity === 'critical'
                          ? 'border-neon-red text-neon-red bg-neon-red/10'
                          : incident.severity === 'high'
                          ? 'border-neon-amber text-neon-amber bg-neon-amber/10'
                          : 'border-neon-blue text-neon-blue bg-neon-blue/10'
                      }`}
                    >
                      {incident.severity}
                    </span>
                    <span className="px-2 py-1 uppercase border border-gray-600 text-gray-400">
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
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-surface border border-neon-red shadow-glow-red max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-tactical bg-neon-red/5">
              <h2 className="text-2xl font-display font-bold text-neon-red uppercase tracking-wider">
                Initiate Emergency Protocol
              </h2>
            </div>
            
            <form onSubmit={handleCreateIncident} className="p-6 space-y-6">
              <div>
                <label className="block text-xs font-mono text-gray-500 uppercase tracking-wider mb-2">
                  Code Name / Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-void border border-tactical p-3 text-white font-mono focus:border-neon-red focus:outline-none transition-colors"
                  placeholder="e.g. SECTOR_7_FLOOD"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-gray-500 uppercase tracking-wider mb-2">
                  Parameters / Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-void border border-tactical p-3 text-white font-mono focus:border-neon-red focus:outline-none transition-colors"
                  rows={3}
                  placeholder="Operational details..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-gray-500 uppercase tracking-wider mb-2">Type</label>
                  <select
                    value={formData.incidentType}
                    onChange={(e) => setFormData({ ...formData, incidentType: e.target.value as typeof formData.incidentType })}
                    className="w-full bg-void border border-tactical p-3 text-white font-mono focus:border-neon-red focus:outline-none appearance-none"
                  >
                    <option value="flood">FLOOD</option>
                    <option value="fire">FIRE</option>
                    <option value="earthquake">EARTHQUAKE</option>
                    <option value="storm">STORM</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-gray-500 uppercase tracking-wider mb-2">
                    Severity Level *
                  </label>
                  <select
                    value={formData.severity}
                    onChange={(e) => setFormData({ ...formData, severity: e.target.value as typeof formData.severity })}
                    className="w-full bg-void border border-tactical p-3 text-white font-mono focus:border-neon-red focus:outline-none appearance-none"
                    required
                  >
                    <option value="low">LOW</option>
                    <option value="medium">MEDIUM</option>
                    <option value="high">HIGH</option>
                    <option value="critical">CRITICAL</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-gray-500 uppercase tracking-wider mb-2">
                    Water Level (ft)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.waterLevel}
                    onChange={(e) => setFormData({ ...formData, waterLevel: e.target.value })}
                    className="w-full bg-void border border-tactical p-3 text-white font-mono focus:border-neon-red focus:outline-none"
                    placeholder="0.0"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-gray-500 uppercase tracking-wider mb-2">
                    Threshold (ft)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.threshold}
                    onChange={(e) => setFormData({ ...formData, threshold: e.target.value })}
                    className="w-full bg-void border border-tactical p-3 text-white font-mono focus:border-neon-red focus:outline-none"
                    placeholder="0.0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-gray-500 uppercase tracking-wider mb-2">Coordinates / Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-void border border-tactical p-3 text-white font-mono focus:border-neon-red focus:outline-none"
                  placeholder="Sector / Grid Ref"
                />
              </div>

              <div className="flex gap-4 mt-8 pt-4 border-t border-tactical">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-3 border border-gray-700 text-gray-400 font-mono text-sm uppercase hover:bg-white/5 transition-colors"
                  disabled={creating}
                >
                  Abort
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-neon-red text-black border border-neon-red px-4 py-3 font-mono font-bold text-sm uppercase hover:bg-white transition-colors disabled:opacity-50"
                  disabled={creating}
                >
                  {creating ? 'INITIALIZING...' : 'EXECUTE'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
