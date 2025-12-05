import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  Trash2, 
  Edit2,
  FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { getEmployees, deleteEmployee, createEmployee, updateEmployee } from '../services/mockDb';
import { Employee, VisaStatus } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { formatDisplayDate, calculateStatus } from '../utils';

export const EmployeeList: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setEmployees(getEmployees());
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.fullName.toLowerCase().includes(search.toLowerCase()) || 
                          emp.passportNumber.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'ALL' || emp.status === filter;
    return matchesSearch && matchesFilter;
  });

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this employee?')) {
      deleteEmployee(id);
      refreshData();
    }
  };

  const handleEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingEmployee(null);
    setIsModalOpen(true);
  };

  const handleExport = () => {
    const data = filteredEmployees.map(emp => ({
      "Full Name": emp.fullName,
      "Passport Number": emp.passportNumber,
      "Visa Type": emp.visaType,
      "Visa Issue Date": emp.visaIssueDate,
      "Visa Expiry Date": emp.visaExpiryDate,
      "Health Card Expiry": emp.healthCardExpiryDate,
      "Labour Card Expiry": emp.labourCardExpiryDate,
      "Overall Status": emp.status
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Employees");
    XLSX.writeFile(wb, "VisaFlow_Employees.xlsx");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
          <p className="text-gray-500 mt-1">Manage employee visa, health, and labour card records</p>
        </div>
        <div className="flex gap-2">
            <button 
            onClick={handleExport}
            className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
            >
            <FileSpreadsheet className="h-4 w-4" />
            Export Excel
            </button>
            <button 
            onClick={handleAddNew}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
            >
            <Plus className="h-4 w-4" />
            Add Employee
            </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search by name or passport..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-gray-400" />
          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="text-sm border-none bg-gray-50 rounded-lg py-2 pl-3 pr-8 focus:ring-2 focus:ring-indigo-500/20 text-gray-700 font-medium cursor-pointer hover:bg-gray-100 transition-colors"
          >
            <option value="ALL">All Statuses</option>
            <option value={VisaStatus.VALID}>Valid</option>
            <option value={VisaStatus.WARNING}>Warning (30d)</option>
            <option value={VisaStatus.CRITICAL}>Critical (7d)</option>
            <option value={VisaStatus.EXPIRED}>Expired</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Visa Type</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Visa Exp</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Health Exp</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Labour Exp</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Overall</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEmployees.length > 0 ? (
                filteredEmployees.map((emp) => {
                  const healthStatus = calculateStatus(emp.healthCardExpiryDate);
                  const labourStatus = calculateStatus(emp.labourCardExpiryDate);
                  const visaStatus = calculateStatus(emp.visaExpiryDate);

                  return (
                  <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">{emp.fullName}</span>
                        <span className="text-xs text-gray-500">PP: {emp.passportNumber}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{emp.visaType}</td>
                    
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${visaStatus !== VisaStatus.VALID ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                      {formatDisplayDate(emp.visaExpiryDate)}
                    </td>
                    
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${healthStatus !== VisaStatus.VALID ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                      {formatDisplayDate(emp.healthCardExpiryDate)}
                    </td>

                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${labourStatus !== VisaStatus.VALID ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                      {formatDisplayDate(emp.labourCardExpiryDate)}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={emp.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleEdit(emp)} className="text-gray-400 hover:text-indigo-600 transition-colors p-1">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(emp.id)} className="text-gray-400 hover:text-red-600 transition-colors p-1">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )})
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500 text-sm">
                    No employees found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <EmployeeModal 
          employee={editingEmployee} 
          onClose={() => setIsModalOpen(false)} 
          onSave={() => {
            setIsModalOpen(false);
            refreshData();
          }} 
        />
      )}
    </div>
  );
};

// Sub-component for Modal
const EmployeeModal: React.FC<{ employee: Employee | null; onClose: () => void; onSave: () => void }> = ({ employee, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    fullName: employee?.fullName || '',
    passportNumber: employee?.passportNumber || '',
    visaType: employee?.visaType || 'Employment',
    visaIssueDate: employee?.visaIssueDate || '',
    visaExpiryDate: employee?.visaExpiryDate || '',
    healthCardExpiryDate: employee?.healthCardExpiryDate || '',
    labourCardExpiryDate: employee?.labourCardExpiryDate || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (employee) {
      updateEmployee(employee.id, formData);
    } else {
      createEmployee(formData);
    }
    onSave();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">{employee ? 'Edit Employee' : 'New Employee'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input 
                required
                type="text" 
                value={formData.fullName}
                onChange={e => setFormData({...formData, fullName: e.target.value})}
                className="w-full rounded-lg border-gray-300 border px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div className="col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Passport No</label>
              <input 
                required
                type="text" 
                value={formData.passportNumber}
                onChange={e => setFormData({...formData, passportNumber: e.target.value})}
                className="w-full rounded-lg border-gray-300 border px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div className="col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Visa Type</label>
              <select 
                value={formData.visaType}
                onChange={e => setFormData({...formData, visaType: e.target.value})}
                className="w-full rounded-lg border-gray-300 border px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              >
                <option value="Employment">Employment</option>
                <option value="Business">Business</option>
                <option value="Tourist">Tourist</option>
                <option value="Dependent">Dependent</option>
              </select>
            </div>
            
            {/* Visa Dates */}
            <div className="col-span-2 text-xs font-semibold text-gray-500 uppercase mt-2">Visa Details</div>
            <div className="col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Issue Date</label>
              <input 
                required
                type="date" 
                value={formData.visaIssueDate}
                onChange={e => setFormData({...formData, visaIssueDate: e.target.value})}
                className="w-full rounded-lg border-gray-300 border px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div className="col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
              <input 
                required
                type="date" 
                value={formData.visaExpiryDate}
                onChange={e => setFormData({...formData, visaExpiryDate: e.target.value})}
                className="w-full rounded-lg border-gray-300 border px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Other Document Dates */}
            <div className="col-span-2 text-xs font-semibold text-gray-500 uppercase mt-2">Other Documents</div>
            <div className="col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Health Card Exp</label>
              <input 
                required
                type="date" 
                value={formData.healthCardExpiryDate}
                onChange={e => setFormData({...formData, healthCardExpiryDate: e.target.value})}
                className="w-full rounded-lg border-gray-300 border px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div className="col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Labour Card Exp</label>
              <input 
                required
                type="date" 
                value={formData.labourCardExpiryDate}
                onChange={e => setFormData({...formData, labourCardExpiryDate: e.target.value})}
                className="w-full rounded-lg border-gray-300 border px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

          </div>
          <div className="pt-4 flex gap-3 justify-end">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm"
            >
              Save Employee
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};