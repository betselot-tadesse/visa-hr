import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { differenceInDays, parseISO, isPast, isToday, addDays } from 'date-fns';
import { VisaStatus, Employee } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const calculateStatus = (expiryDateStr: string): VisaStatus => {
  if (!expiryDateStr) return VisaStatus.VALID; // Fallback if missing
  const expiryDate = parseISO(expiryDateStr);
  const today = new Date();
  
  const daysRemaining = differenceInDays(expiryDate, today);

  if (daysRemaining < 0) return VisaStatus.EXPIRED;
  if (daysRemaining <= 7) return VisaStatus.CRITICAL;
  if (daysRemaining <= 30) return VisaStatus.WARNING;
  return VisaStatus.VALID;
};

// Returns the 'worst' status among the three provided
export const getAggregateStatus = (
  visaExpiry: string, 
  healthExpiry: string, 
  labourExpiry: string
): VisaStatus => {
  const s1 = calculateStatus(visaExpiry);
  const s2 = calculateStatus(healthExpiry);
  const s3 = calculateStatus(labourExpiry);

  const severityWeight = {
    [VisaStatus.EXPIRED]: 3,
    [VisaStatus.CRITICAL]: 2,
    [VisaStatus.WARNING]: 1,
    [VisaStatus.VALID]: 0,
  };

  const statuses = [s1, s2, s3];
  // Sort by severity descending
  statuses.sort((a, b) => severityWeight[b] - severityWeight[a]);
  
  return statuses[0];
};

export const getStatusColor = (status: VisaStatus) => {
  switch (status) {
    case VisaStatus.EXPIRED:
      return 'bg-red-100 text-red-700 border-red-200';
    case VisaStatus.CRITICAL:
      return 'bg-orange-100 text-orange-700 border-orange-200';
    case VisaStatus.WARNING:
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case VisaStatus.VALID:
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};

export const formatDisplayDate = (isoDate: string) => {
  if (!isoDate) return '-';
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return '-';
  
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};