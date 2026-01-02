import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';
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
        <div className="text-center py-8">
          <p className="text-gray-500">Loading incident...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{incident.title}</h1>
          <p className="text-gray-500 mt-1">
            Created {new Date(incident._creationTime).toLocaleString()}
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Incident Details</h2>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Type</dt>
              <dd className="mt-1 text-sm text-gray-900">{incident.incident_type}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Severity</dt>
              <dd className="mt-1">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  incident.severity === 'critical' ? 'bg-red-100 text-red-800' :
                  incident.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {incident.severity}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="mt-1">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  incident.status === 'active' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {incident.status}
                </span>
              </dd>
            </div>
            {incident.trigger_data && typeof incident.trigger_data === 'object' && 'water_level' in incident.trigger_data && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Water Level</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {String(incident.trigger_data.water_level)} ft
                  {'threshold' in incident.trigger_data && incident.trigger_data.threshold && ` (threshold: ${String(incident.trigger_data.threshold)} ft)`}
                </dd>
              </div>
            )}
          </dl>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Tasks</h2>
            <button
              onClick={handleGenerateTasks}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
            >
              Generate Tasks
            </button>
          </div>

          {!tasks || tasks.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No tasks yet</p>
          ) : (
            <div className="space-y-3">
              {tasks.map((task: { _id: string; title: string; status: string; priority: string }) => (
                <div
                  key={task._id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{task.title}</h3>
                    <div className="flex gap-2 mt-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        task.status === 'completed' ? 'bg-green-100 text-green-800' :
                        task.status === 'accepted' ? 'bg-blue-100 text-blue-800' :
                        task.status === 'dispatched' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {task.status}
                      </span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        task.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                        task.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {task.priority}
                      </span>
                    </div>
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
