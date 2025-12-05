import React, { useEffect, useState } from 'react';
import { 
  Bell, 
  Check, 
  Trash2, 
  AlertTriangle, 
  Info,
  Clock
} from 'lucide-react';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../services/mockDb';
import { Notification, NotificationSeverity } from '../types';
import { cn } from '../utils';
import { formatDistanceToNow } from 'date-fns';

export const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');

  useEffect(() => {
    refreshNotifications();
  }, []);

  const refreshNotifications = () => {
    setNotifications(getNotifications().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  };

  const handleMarkRead = (id: string) => {
    markNotificationRead(id);
    refreshNotifications();
  };

  const handleMarkAllRead = () => {
    markAllNotificationsRead();
    refreshNotifications();
  };

  const filtered = notifications.filter(n => {
    if (filter === 'UNREAD') return !n.isRead;
    return true;
  });

  const getIcon = (severity: NotificationSeverity) => {
    switch (severity) {
      case NotificationSeverity.EXPIRED: return AlertTriangle;
      case NotificationSeverity.CRITICAL: return Clock;
      case NotificationSeverity.WARNING: return Info;
      default: return Info;
    }
  };

  const getColor = (severity: NotificationSeverity) => {
    switch (severity) {
      case NotificationSeverity.EXPIRED: return 'text-red-600 bg-red-100';
      case NotificationSeverity.CRITICAL: return 'text-orange-600 bg-orange-100';
      case NotificationSeverity.WARNING: return 'text-yellow-600 bg-yellow-100';
      default: return 'text-blue-600 bg-blue-100';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500 mt-1">Alerts regarding visa expirations</p>
        </div>
        <div className="flex items-center gap-3">
            <select 
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="text-sm border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
            >
                <option value="ALL">All Notifications</option>
                <option value="UNREAD">Unread Only</option>
            </select>
            {notifications.some(n => !n.isRead) && (
                <button 
                    onClick={handleMarkAllRead}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                    <Check className="h-4 w-4" />
                    Mark all read
                </button>
            )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
        {filtered.length > 0 ? (
          filtered.map((notification) => {
            const Icon = getIcon(notification.severity);
            const colorClass = getColor(notification.severity);
            
            return (
              <div 
                key={notification.id} 
                className={cn(
                  "p-4 flex items-start gap-4 transition-colors",
                  !notification.isRead ? "bg-indigo-50/40" : "bg-white hover:bg-gray-50"
                )}
              >
                <div className={cn("p-2 rounded-lg shrink-0", colorClass)}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex justify-between items-start gap-4">
                    <p className={cn("text-sm font-medium", !notification.isRead ? "text-gray-900 font-semibold" : "text-gray-700")}>
                      {notification.message}
                    </p>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Employee: {notification.employeeName}</p>
                </div>
                {!notification.isRead && (
                  <button 
                    onClick={() => handleMarkRead(notification.id)}
                    className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"
                    title="Mark as read"
                  >
                    <div className="h-2 w-2 rounded-full bg-indigo-500" />
                  </button>
                )}
              </div>
            );
          })
        ) : (
          <div className="p-12 text-center text-gray-500">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-4">
              <Bell className="h-6 w-6 text-gray-400" />
            </div>
            <p>No notifications found matching your filter.</p>
          </div>
        )}
      </div>
    </div>
  );
};