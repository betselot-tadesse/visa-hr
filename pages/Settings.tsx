import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearAllData, runNotificationCheck, getEmployees, getNotifications, restoreFromBackup } from '../services/mockDb';
import { format } from 'date-fns';
import { Download, Upload, Database, RefreshCw, Trash } from 'lucide-react';

export const Settings: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleReset = () => {
    if (confirm("This will wipe all local data and reset to seed data. Continue?")) {
        clearAllData();
        alert("System reset complete.");
        navigate('/'); // Redirect to dashboard to force data refresh
    }
  };

  const handleRunJobs = () => {
      runNotificationCheck();
      alert("Notification check run successfully.");
      navigate('/'); // Redirect to dashboard
  };

  const handleBackup = () => {
    const backup = {
        employees: getEmployees(),
        notifications: getNotifications(),
        timestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `visaflow_backup_${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRestoreClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const json = JSON.parse(event.target?.result as string);
              if (confirm(`Found ${json.employees?.length || 0} employees and ${json.notifications?.length || 0} notifications. Restore this data? This will overwrite current data.`)) {
                  restoreFromBackup(json);
                  alert('Database restored successfully.');
                  navigate('/'); // Redirect to dashboard
              }
          } catch (error) {
              alert('Invalid backup file.');
          }
      };
      reader.readAsText(file);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">System configuration, database management, and developer tools</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-2 mb-2">
                <Database className="h-5 w-5 text-indigo-600" />
                <h3 className="text-lg font-medium text-gray-900">Database Management</h3>
            </div>
            <p className="text-sm text-gray-500">Export your entire database for safekeeping or restore from a previous backup file.</p>
        </div>
        
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
              <div>
                <p className="font-medium text-gray-900">Backup Data</p>
                <p className="text-sm text-gray-500">Download a full JSON dump of all employees and notifications.</p>
              </div>
              <button 
                onClick={handleBackup}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Download className="h-4 w-4" />
                Download Backup
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
              <div>
                <p className="font-medium text-gray-900">Restore Data</p>
                <p className="text-sm text-gray-500">Upload a previously generated JSON backup file.</p>
              </div>
              <div>
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden" 
                    accept=".json"
                  />
                  <button 
                    onClick={handleRestoreClick}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Upload className="h-4 w-4" />
                    Restore from File
                  </button>
              </div>
            </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Developer Actions</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-100">
              <div>
                <p className="font-medium text-red-900">Reset Database</p>
                <p className="text-sm text-red-700">Clears all employees and notifications, restores seed data.</p>
              </div>
              <button 
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 hover:border-red-300 transition-colors"
              >
                <Trash className="h-4 w-4" />
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
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Run Job
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};