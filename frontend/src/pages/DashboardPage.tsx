import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
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
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <button className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition">
            🚨 Create Emergency Incident
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-700">Active Incidents</h3>
            <p className="text-4xl font-bold text-blue-600 mt-2">{activeIncidents?.length ?? 0}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-700">Pending Tasks</h3>
            <p className="text-4xl font-bold text-yellow-600 mt-2">{pendingTasks?.length ?? 0}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-700">Available Volunteers</h3>
            <p className="text-4xl font-bold text-green-600 mt-2">{availableVolunteers?.length ?? 0}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Incidents</h2>
          {!activeIncidents || activeIncidents.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No incidents yet</p>
          ) : (
            <div className="space-y-3">
              {activeIncidents.map((incident: { _id: string; title: string; incident_type: string; _creationTime: number }) => (
                <div
                  key={incident._id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div>
                    <h3 className="font-medium text-gray-900">{incident.title}</h3>
                    <p className="text-sm text-gray-500">
                      {incident.incident_type} • {new Date(incident._creationTime).toLocaleString()}
                    </p>
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
