export enum VisaStatus {
  VALID = 'VALID',
  WARNING = 'WARNING',   // <= 30 days
  CRITICAL = 'CRITICAL', // <= 7 days
  EXPIRED = 'EXPIRED'    // < 0 days
}

export interface Employee {
  id: string;
  fullName: string;
  passportNumber: string;
  visaType: string;
  visaIssueDate: string; // ISO Date string
  visaExpiryDate: string; // ISO Date string
  healthCardExpiryDate: string; // ISO Date string
  labourCardExpiryDate: string; // ISO Date string
  createdAt: string;
  updatedAt: string;
  status: VisaStatus; // Computed Aggregate field (Worst of all 3)
}

export enum NotificationSeverity {
  WARNING = 'warning',
  CRITICAL = 'critical',
  EXPIRED = 'expired'
}

export interface Notification {
  id: string;
  employeeId: string;
  employeeName: string;
  severity: NotificationSeverity;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface DashboardStats {
  totalEmployees: number;
  expiring30Days: number;
  expiring7Days: number;
  expired: number;
}

export interface ImportResult {
  inserted: number;
  updated: number;
  errors: Array<{ row: number; error: string }>;
}