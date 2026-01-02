import Layout from '../components/Layout';

export default function DashboardPage() {
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
            <p className="text-4xl font-bold text-blue-600 mt-2">0</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-700">Pending Tasks</h3>
            <p className="text-4xl font-bold text-yellow-600 mt-2">0</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-700">Available Volunteers</h3>
            <p className="text-4xl font-bold text-green-600 mt-2">0</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Incidents</h2>
          <p className="text-gray-500 text-center py-8">No incidents yet</p>
        </div>
      </div>
    </Layout>
  );
}
