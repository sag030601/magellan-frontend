import React, { useEffect, useState } from "react";

function AdminPanel() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const VITE_API_URL = import.meta.env.VITE_API_URL;
  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        const response = await fetch(`${VITE_API_URL}/api/candidates/all`);
        if (!response.ok) throw new Error("Failed to fetch candidates");
        const data = await response.json();
        setCandidates(data.candidates || []);
        setError(null);
      } catch (err) {
        setError(err.message);
        setCandidates([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCandidates();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-blue-900 mb-2">Admin Panel</h1>
          <p className="text-teal-700">Manage Candidates</p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center h-64">
            <div className="text-teal-600 text-lg">Loading candidates...</div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        )}

        {/* Table */}
        {!loading && !error && (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden border-t-4 border-teal-500">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-600 to-teal-600 text-white">
                    <th className="px-6 py-4 text-left text-sm font-semibold">
                      ID
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">
                      Name
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">
                      Email
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">
                      Position
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.length > 0 ? (
                    candidates.map((candidate, index) => (
                      <tr
                        key={candidate.id || index}
                        className="border-b hover:bg-blue-50 transition-colors duration-200"
                      >
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {candidate.id}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {candidate.name || "N/A"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {candidate.email || "N/A"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {candidate.position || "N/A"}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                            {candidate.status || "Active"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <button className="text-teal-600 hover:text-teal-800 font-medium mr-3">
                            Edit
                          </button>
                          <button className="text-red-600 hover:text-red-800 font-medium">
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="6"
                        className="px-6 py-8 text-center text-gray-500"
                      >
                        No candidates found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer Stats */}
            <div className="bg-gradient-to-r from-blue-50 to-teal-50 px-6 py-4 border-t">
              <p className="text-sm text-gray-600">
                Total Candidates:{" "}
                <span className="font-bold text-teal-600">
                  {candidates.length}
                </span>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminPanel;
