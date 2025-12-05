import React, { useEffect, useState } from 'react';
import { 
  Users, 
  AlertTriangle, 
  AlertCircle, 
  Clock, 
  ArrowRight
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { Link } from 'react-router-dom';
import { getEmployees } from '../services/mockDb';
import { Employee, VisaStatus, DashboardStats } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { formatDisplayDate } from '../utils';

export const Dashboard: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    expiring30Days: 0,
    expiring7Days: 0,
    expired: 0
  });

  useEffect(() => {
    const data = getEmployees();
    setEmployees(data);

    const statsData = {
      totalEmployees: data.length,
      expiring30Days: data.filter(e => e.status === VisaStatus.WARNING).length,
      expiring7Days: data.filter(e => e.status === VisaStatus.CRITICAL).length,
      expired: data.filter(e => e.status === VisaStatus.EXPIRED).length
    };
    setStats(statsData);
  }, []);

  const chartData = [
    { name: 'Valid', value: employees.filter(e => e.status === VisaStatus.VALID).length, color: '#10b981' }, // Emerald-500
    { name: 'Warning', value: stats.expiring30Days, color: '#f59e0b' }, // Amber-500
    { name: 'Critical', value: stats.expiring7Days, color: '#f97316' }, // Orange-500
    { name: 'Expired', value: stats.expired, color: '#ef4444' }, // Red-500
  ].filter(d => d.value > 0);

  const StatCard = ({ title, value, icon: Icon, colorClass, link }: any) => (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex items-start justify-between hover:shadow-md transition-shadow">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="mt-2 text-3xl font-semibold text-gray-900">{value}</p>
        {link && (
          <Link to={link} className="mt-4 text-sm text-indigo-600 font-medium hover:text-indigo-700 flex items-center gap-1">
            View Details <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>
      <div className={`p-3 rounded-lg ${colorClass}`}>
        <Icon className="h-6 w-6" />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Overview of employee status (Visa, Health Card, Labour Card)</p>
        </div>
        <div className="flex gap-3">
          <Link to="/import" className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            Import Excel
          </Link>
          <Link to="/employees" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm">
            Add Employee
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Employees" 
          value={stats.totalEmployees} 
          icon={Users} 
          colorClass="bg-blue-50 text-blue-600"
          link="/employees"
        />
        <StatCard 
          title="Expiring Soon (30d)" 
          value={stats.expiring30Days} 
          icon={Clock} 
          colorClass="bg-yellow-50 text-yellow-600"
        />
        <StatCard 
          title="Critical (<7d)" 
          value={stats.expiring7Days} 
          icon={AlertCircle} 
          colorClass="bg-orange-50 text-orange-600"
        />
        <StatCard 
          title="Expired Documents" 
          value={stats.expired} 
          icon={AlertTriangle} 
          colorClass="bg-red-50 text-red-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Charts */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Overall Status Distribution</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={80} />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={40}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Urgent Items */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Urgent Attention Needed</h3>
          <p className="text-xs text-gray-500 mb-3">Employees with expired or critical documents.</p>
          <div className="flex-1 overflow-y-auto pr-2 space-y-4 max-h-[320px]">
            {employees
              .filter(e => e.status !== VisaStatus.VALID)
              .sort((a, b) => {
                  // Rough sort by most urgent document date
                  const getMinDate = (e: Employee) => [e.visaExpiryDate, e.healthCardExpiryDate, e.labourCardExpiryDate].sort()[0];
                  return getMinDate(a).localeCompare(getMinDate(b));
              })
              .slice(0, 5)
              .map(employee => (
                <div key={employee.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{employee.fullName}</p>
                    <p className="text-xs text-gray-500">Check documents</p>
                  </div>
                  <StatusBadge status={employee.status} />
                </div>
              ))}
              {employees.filter(e => e.status !== VisaStatus.VALID).length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm">
                  <div className="p-3 bg-gray-50 rounded-full mb-2">
                    <Users className="h-6 w-6 text-gray-300" />
                  </div>
                  No urgent issues found.
                </div>
              )}
          </div>
          <Link to="/employees" className="mt-4 text-center text-sm text-indigo-600 font-medium hover:text-indigo-700 block">
            View All Employees
          </Link>
        </div>
      </div>
    </div>
  );
};