import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import Layout from '../components/Layout';

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
          <div className="text-neon-blue font-mono text-sm animate-pulse">
            ACCESSING SECURE DATA_
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        <div className="border-b border-tactical pb-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-display font-bold text-white uppercase tracking-wider">
                {incident.title}
              </h1>
              <p className="font-mono text-xs text-gray-500 mt-2 uppercase tracking-widest">
                INCIDENT ID: {incident._id} // T-{Math.floor((Date.now() - incident._creationTime) / 1000 / 60)}M
              </p>
            </div>
            <div className="text-right">
              <div className={`inline-block px-3 py-1 text-sm font-bold font-mono uppercase tracking-wide border ${
                 incident.status === 'active' 
                 ? 'bg-neon-red text-black border-neon-red animate-pulse' 
                 : 'bg-gray-800 text-gray-400 border-gray-700'
              }`}>
                {incident.status}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            <div className="bg-surface border border-tactical p-6 relative">
              <div className="absolute top-0 left-0 w-2 h-2 bg-white"></div>
              <div className="absolute top-0 right-0 w-2 h-2 bg-white"></div>
              <div className="absolute bottom-0 left-0 w-2 h-2 bg-white"></div>
              <div className="absolute bottom-0 right-0 w-2 h-2 bg-white"></div>
              
              <h2 className="text-sm font-mono text-neon-blue uppercase tracking-widest mb-6 border-b border-tactical/50 pb-2">
                Mission Parameters
              </h2>
              
              <dl className="grid grid-cols-2 gap-y-6 gap-x-4">
                <div>
                  <dt className="text-xs font-mono text-gray-500 uppercase">Incident Type</dt>
                  <dd className="mt-1 text-xl font-display text-white uppercase">{incident.incident_type}</dd>
                </div>
                <div>
                  <dt className="text-xs font-mono text-gray-500 uppercase">Threat Level</dt>
                  <dd className="mt-1">
                    <span className={`text-xl font-display uppercase ${
                      incident.severity === 'critical' ? 'text-neon-red font-bold' :
                      incident.severity === 'high' ? 'text-neon-amber' :
                      'text-neon-blue'
                    }`}>
                      {incident.severity}
                    </span>
                  </dd>
                </div>
                {incident.trigger_data && typeof incident.trigger_data === 'object' && 'water_level' in incident.trigger_data && (
                  <div className="col-span-2 bg-void/30 p-4 border border-tactical">
                    <dt className="text-xs font-mono text-gray-500 uppercase mb-2">Telemetry Data</dt>
                    <dd className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="block text-xs text-gray-600 uppercase">Current Level</span>
                        <span className="text-2xl font-mono text-white">{String(incident.trigger_data.water_level)} FT</span>
                      </div>
                      {'threshold' in incident.trigger_data && incident.trigger_data.threshold && (
                        <div>
                           <span className="block text-xs text-gray-600 uppercase">Threshold</span>
                           <span className="text-2xl font-mono text-neon-red">{String(incident.trigger_data.threshold)} FT</span>
                        </div>
                      )}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          <div className="col-span-1">
            <div className="bg-surface border border-tactical h-full p-6">
               <h2 className="text-sm font-mono text-neon-blue uppercase tracking-widest mb-6 border-b border-tactical/50 pb-2">
                Action Required
              </h2>
               <div className="text-center py-8">
                 <button className="w-full bg-neon-red/10 text-neon-red border border-neon-red py-4 font-mono font-bold uppercase hover:bg-neon-red hover:text-black transition-all">
                   Deploy Unit
                 </button>
                 <p className="mt-4 text-xs font-mono text-gray-500">
                   AWAITING DISPATCH CONFIRMATION
                 </p>
               </div>
            </div>
          </div>
        </div>

        <div className="bg-surface border border-tactical">
          <div className="p-4 border-b border-tactical flex justify-between items-center bg-void/30">
            <h2 className="text-lg font-display font-bold text-white uppercase tracking-wide">
              Task Orders
            </h2>
            <button
              onClick={handleGenerateTasks}
              className="text-xs font-mono text-neon-blue border border-neon-blue px-3 py-1 hover:bg-neon-blue hover:text-black uppercase transition-colors"
            >
              Generate Protocols
            </button>
          </div>

          {!tasks || tasks.length === 0 ? (
            <div className="p-12 text-center text-gray-600 font-mono text-sm uppercase">
              No tasks assigned to this sector
            </div>
          ) : (
            <div className="divide-y divide-tactical">
              {tasks.map((task: { _id: string; title: string; status: string; priority: string }) => (
                <div
                  key={task._id}
                  className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors group"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className={`w-1.5 h-1.5 rounded-none ${
                        task.priority === 'urgent' ? 'bg-neon-red' : 'bg-neon-blue'
                      }`}></span>
                      <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wide">{task.title}</h3>
                    </div>
                    <div className="flex gap-2 pl-4">
                      <span className={`text-[10px] font-mono uppercase px-1 border ${
                        task.status === 'completed' ? 'border-neon-green text-neon-green' :
                        task.status === 'accepted' ? 'border-neon-blue text-neon-blue' :
                        task.status === 'dispatched' ? 'border-neon-amber text-neon-amber' :
                        'border-gray-600 text-gray-500'
                      }`}>
                        [{task.status}]
                      </span>
                      <span className={`text-[10px] font-mono uppercase px-1 border ${
                        task.priority === 'urgent' ? 'border-neon-red text-neon-red' :
                        'border-gray-600 text-gray-500'
                      }`}>
                        PRIORITY::{task.priority}
                      </span>
                    </div>
                  </div>
                  <div className="font-mono text-xs text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    ID_#{task._id.substring(0,6)}
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
