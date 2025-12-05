import React from 'react';
import { clearAllData, runNotificationCheck } from '../services/mockDb';

export const Settings: React.FC = () => {
  const handleReset = () => {
    if (confirm("This will wipe all local data and reset to seed data. Continue?")) {
        clearAllData();
        window.location.reload();
    }
  };

  const handleRunJobs = () => {
      runNotificationCheck();
      alert("Notification check run successfully.");
      window.location.reload();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">System configuration and developer tools</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Developer Actions</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
              <div>
                <p className="font-medium text-gray-900">Reset Database</p>
                <p className="text-sm text-gray-500">Clears all employees and notifications, restores seed data.</p>
              </div>
              <button 
                onClick={handleReset}
                className="px-4 py-2 bg-white border border-red-200 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 hover:border-red-300 transition-colors"
              >
                Reset Data
              </button>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
              <div>
                <p className="font-medium text-gray-900">Force Visa Check</p>
                <p className="text-sm text-gray-500">Manually triggers the daily visa status check job.</p>
              </div>
              <button 
                onClick={handleRunJobs}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors"
              >
                Run Job
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};