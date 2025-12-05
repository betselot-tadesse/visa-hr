import { Employee, Notification, NotificationSeverity, VisaStatus } from '../types';
import { calculateStatus, getAggregateStatus } from '../utils';
import { v4 as uuidv4 } from 'uuid';
import { addDays, subDays, format } from 'date-fns';

const EMPLOYEES_KEY = 'visaflow_employees';
const NOTIFICATIONS_KEY = 'visaflow_notifications';
const LAST_CHECK_KEY = 'visaflow_last_check';

// Helper to calculate employee aggregate status
const computeEmployeeStatus = (e: Omit<Employee, 'status'>): VisaStatus => {
    return getAggregateStatus(e.visaExpiryDate, e.healthCardExpiryDate, e.labourCardExpiryDate);
};

// Initial Seeder Data
const seedData = () => {
  try {
      if (localStorage.getItem(EMPLOYEES_KEY)) return;
  } catch (e) {
      console.error("Storage access error", e);
      return;
  }

  const today = new Date();
  
  // Helper to make dates
  const days = (d: number) => format(addDays(today, d), 'yyyy-MM-dd');

  const employees: Employee[] = [
    {
      id: uuidv4(),
      employeeId: "EMP001",
      fullName: "Alice Johnson",
      passportNumber: "A12345678",
      visaType: "Employment",
      visaIssueDate: days(-300),
      visaExpiryDate: days(120),
      healthCardExpiryDate: days(100),
      labourCardExpiryDate: days(90),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: VisaStatus.VALID // will be recalculated
    },
    {
      id: uuidv4(),
      employeeId: "EMP002",
      fullName: "Bob Smith",
      passportNumber: "B98765432",
      visaType: "Business",
      visaIssueDate: days(-350),
      visaExpiryDate: days(25), // Warning
      healthCardExpiryDate: days(60),
      labourCardExpiryDate: days(60),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: VisaStatus.WARNING
    },
    {
      id: uuidv4(),
      employeeId: "EMP003",
      fullName: "Charlie Davis",
      passportNumber: "C11223344",
      visaType: "Tourist",
      visaIssueDate: days(-60),
      visaExpiryDate: days(5), // Critical
      healthCardExpiryDate: days(40),
      labourCardExpiryDate: days(40),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: VisaStatus.CRITICAL
    },
    {
      id: uuidv4(),
      employeeId: "EMP004",
      fullName: "Diana Evans",
      passportNumber: "D55667788",
      visaType: "Employment",
      visaIssueDate: days(-400),
      visaExpiryDate: days(60),
      healthCardExpiryDate: days(-2), // Expired Health Card
      labourCardExpiryDate: days(60),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: VisaStatus.EXPIRED
    }
  ];

  // Recalculate all statuses before saving
  const processedEmployees = employees.map(e => ({
      ...e,
      status: computeEmployeeStatus(e)
  }));

  try {
    localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(processedEmployees));
    runNotificationCheck(); // Generate initial notifications
  } catch(e) {
      console.error("Failed to seed data", e);
  }
};

export const runNotificationCheck = () => {
  const employees = getEmployees();
  const notifications = getNotifications();
  const newNotifications: Notification[] = [];
  
  employees.forEach(emp => {
    // Check all 3 documents
    const checks = [
        { type: 'Visa', date: emp.visaExpiryDate },
        { type: 'Health Card', date: emp.healthCardExpiryDate },
        { type: 'Labour Card', date: emp.labourCardExpiryDate },
    ];

    checks.forEach(check => {
        const status = calculateStatus(check.date);
        if (status === VisaStatus.VALID) return;

        let severity: NotificationSeverity;
        let message: string;

        if (status === VisaStatus.EXPIRED) {
          severity = NotificationSeverity.EXPIRED;
          message = `${check.type} for ${emp.fullName} has EXPIRED on ${check.date}.`;
        } else if (status === VisaStatus.CRITICAL) {
          severity = NotificationSeverity.CRITICAL;
          message = `${check.type} for ${emp.fullName} expires in < 7 days (${check.date}).`;
        } else {
          severity = NotificationSeverity.WARNING;
          message = `${check.type} for ${emp.fullName} expires in < 30 days (${check.date}).`;
        }

        // Check duplicates: Same employee, same message (message contains doc type and date, effectively unique per incident)
        const exists = notifications.some(n => 
          n.employeeId === emp.id && 
          n.message === message && 
          !n.isRead
        );

        if (!exists) {
          newNotifications.push({
            id: uuidv4(),
            employeeId: emp.id,
            employeeName: emp.fullName,
            severity,
            message,
            isRead: false,
            createdAt: new Date().toISOString()
          });
        }
    });
  });

  if (newNotifications.length > 0) {
    try {
        localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify([...newNotifications, ...notifications]));
    } catch(e) {
        console.error("Failed to save notifications", e);
    }
  }
  localStorage.setItem(LAST_CHECK_KEY, new Date().toISOString());
};

// CRUD Operations

export const getEmployees = (): Employee[] => {
  try {
      const data = localStorage.getItem(EMPLOYEES_KEY);
      const employees: Employee[] = data ? JSON.parse(data) : [];
      // Recalculate status on fetch to ensure freshness
      return employees.map(e => ({
        ...e,
        status: computeEmployeeStatus(e)
      })).sort((a, b) => new Date(a.visaExpiryDate).getTime() - new Date(b.visaExpiryDate).getTime());
  } catch (error) {
      console.error("Failed to load employees, resetting data", error);
      // Fallback: clear bad data
      localStorage.removeItem(EMPLOYEES_KEY);
      return [];
  }
};

export const getEmployee = (id: string): Employee | undefined => {
  return getEmployees().find(e => e.id === id);
};

export const createEmployee = (employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => {
  const employees = getEmployees();
  
  // Check for duplicate employeeId if provided
  if (employee.employeeId && employees.some(e => e.employeeId === employee.employeeId)) {
      console.warn(`Duplicate Employee ID ${employee.employeeId} skipped/handled in UI layer.`);
  }

  const newEmployee: Employee = {
    ...employee,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: VisaStatus.VALID // temp
  };
  newEmployee.status = computeEmployeeStatus(newEmployee);
  
  employees.push(newEmployee);
  localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(employees));
  runNotificationCheck();
  return newEmployee;
};

export const updateEmployee = (id: string, updates: Partial<Omit<Employee, 'id' | 'createdAt'>>) => {
  const employees = getEmployees();
  const index = employees.findIndex(e => e.id === id);
  if (index === -1) throw new Error("Employee not found");

  const updatedEmployee = {
    ...employees[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  
  updatedEmployee.status = computeEmployeeStatus(updatedEmployee);
  
  employees[index] = updatedEmployee;
  localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(employees));
  runNotificationCheck();
  return updatedEmployee;
};

export const deleteEmployee = (id: string) => {
  const employees = getEmployees();
  const filtered = employees.filter(e => e.id !== id);
  localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(filtered));
};

export const getNotifications = (): Notification[] => {
  try {
      const data = localStorage.getItem(NOTIFICATIONS_KEY);
      return data ? JSON.parse(data) : [];
  } catch (e) {
      console.error("Failed to load notifications", e);
      return [];
  }
};

export const markNotificationRead = (id: string) => {
  const notifications = getNotifications();
  const updated = notifications.map(n => n.id === id ? { ...n, isRead: true } : n);
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
};

export const markAllNotificationsRead = () => {
    const notifications = getNotifications();
    const updated = notifications.map(n => ({ ...n, isRead: true }));
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
};

export const clearAllData = () => {
    localStorage.removeItem(EMPLOYEES_KEY);
    localStorage.removeItem(NOTIFICATIONS_KEY);
    seedData();
}

export const restoreFromBackup = (data: { employees?: Employee[], notifications?: Notification[] }) => {
    if (data.employees) {
        localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(data.employees));
    }
    if (data.notifications) {
        localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(data.notifications));
    }
}

// Initialize on load
seedData();