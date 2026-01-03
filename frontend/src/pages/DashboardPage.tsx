import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import Layout from '../components/Layout';

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
      <div className="space-y-8">
        <div className="flex justify-between items-end border-b border-tactical pb-4">
          <div>
            <h1 className="text-4xl font-display font-bold text-white uppercase tracking-wider">
              Operational Status
            </h1>
            <p className="text-neon-blue font-mono text-sm mt-1 tracking-widest">
              SYSTEM ONLINE // MONITORING ACTIVE
            </p>
          </div>
          <button className="bg-neon-red/10 text-neon-red border border-neon-red px-6 py-2 hover:bg-neon-red hover:text-black transition-all duration-200 font-mono text-sm uppercase tracking-wider">
            Report Incident
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-surface border border-tactical p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-40 transition-opacity">
              <div className="w-16 h-16 border-2 border-neon-blue rounded-full border-dashed animate-spin-slow"></div>
            </div>
            <h3 className="font-mono text-xs uppercase text-gray-500 tracking-widest mb-2">Active Incidents</h3>
            <p className="text-5xl font-display font-bold text-neon-blue">
              {(activeIncidents?.length ?? 0).toString().padStart(2, '0')}
            </p>
          </div>
          
          <div className="bg-surface border border-tactical p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-1 h-full bg-neon-amber/20"></div>
            <h3 className="font-mono text-xs uppercase text-gray-500 tracking-widest mb-2">Pending Tasks</h3>
            <p className="text-5xl font-display font-bold text-neon-amber">
              {(pendingTasks?.length ?? 0).toString().padStart(2, '0')}
            </p>
          </div>

          <div className="bg-surface border border-tactical p-6 relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-1 h-full bg-neon-green/20"></div>
            <h3 className="font-mono text-xs uppercase text-gray-500 tracking-widest mb-2">Personnel Online</h3>
            <p className="text-5xl font-display font-bold text-neon-green">
              {(availableVolunteers?.length ?? 0).toString().padStart(2, '0')}
            </p>
          </div>
        </div>

        <div className="border border-tactical bg-surface">
          <div className="p-4 border-b border-tactical flex justify-between items-center bg-void/50">
            <h2 className="text-xl font-display font-bold text-white uppercase tracking-wide">
              Recent Activity Log
            </h2>
            <span className="text-xs font-mono text-neon-blue animate-pulse">LIVE FEED</span>
          </div>
          
          {!activeIncidents || activeIncidents.length === 0 ? (
            <div className="p-12 text-center text-gray-600 font-mono text-sm uppercase">
              No active incidents detected
            </div>
          ) : (
            <div className="divide-y divide-tactical">
              {activeIncidents.map((incident: { _id: string; title: string; incident_type: string; _creationTime: number }) => (
                <div
                  key={incident._id}
                  className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors group"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-neon-red border border-neon-red/30 px-1">ALERT</span>
                      <h3 className="font-display font-bold text-lg text-white group-hover:text-neon-blue transition-colors">
                        {incident.title}
                      </h3>
                    </div>
                    <p className="text-xs font-mono text-gray-500 uppercase tracking-wide pl-12">
                      TYPE: {incident.incident_type} <span className="mx-2 text-gray-700">|</span> 
                      T-{Math.floor((Date.now() - incident._creationTime) / 1000 / 60)} MIN
                    </p>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="font-mono text-xs text-neon-blue">VIEW_DETAILS &gt;</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
