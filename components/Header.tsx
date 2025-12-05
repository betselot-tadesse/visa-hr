import React from 'react';
import { Menu, Bell, Search, User } from 'lucide-react';
import { Link } from 'react-router-dom';

interface HeaderProps {
  onMenuClick: () => void;
  unreadCount: number;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick, unreadCount }) => {
  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 md:px-6 lg:px-8">
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-md"
        >
          <Menu className="h-5 w-5" />
        </button>
        
        <div className="hidden md:flex items-center relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search employees..." 
            className="pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-6">
        <Link to="/notifications" className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>

        <div className="flex items-center gap-3 pl-3 md:pl-0">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-sm font-medium text-gray-900">Admin User</span>
            <span className="text-xs text-gray-500">HR Manager</span>
          </div>
          <div className="h-9 w-9 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 border-2 border-white shadow-sm ring-1 ring-gray-100">
            <User className="h-5 w-5" />
          </div>
        </div>
      </div>
    </header>
  );
};