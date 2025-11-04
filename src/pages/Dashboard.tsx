export default function Dashboard() {
  return (
    <div className="h-screen bg-gray-50">
      <div className="container mx-auto p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">JobSentinel Dashboard</h1>

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Recent Jobs</h2>
          <p className="text-gray-600">No jobs found yet. Click "Search Now" to start scraping.</p>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Jobs</h3>
            <p className="text-3xl font-bold text-primary">0</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">High Matches</h3>
            <p className="text-3xl font-bold text-success">0</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Avg Score</h3>
            <p className="text-3xl font-bold text-gray-900">0%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
