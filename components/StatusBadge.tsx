import React from 'react';
import { VisaStatus } from '../types';
import { getStatusColor, cn } from '../utils';

interface StatusBadgeProps {
  status: VisaStatus;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
      getStatusColor(status),
      className
    )}>
      {status}
    </span>
  );
};