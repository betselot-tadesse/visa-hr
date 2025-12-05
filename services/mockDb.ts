import { Employee, Notification, NotificationSeverity, VisaStatus } from '../types';
import { calculateVisaStatus } from '../utils';
import { v4 as uuidv4 } from 'uuid';
import { addDays, subDays, format } from 'date-fns';

const EMPLOYEES_KEY = 'visaflow_employees';
const NOTIFICATIONS_KEY = 'visaflow_notifications';
const LAST_CHECK_KEY = 'visaflow_last_check';

// Initial Seeder Data
const seedData = () => {
  if (localStorage.getItem(EMPLOYEES_KEY)) return;

  const today = new Date();
  const employees: Employee[] = [
    {
      id: uuidv4(),
      fullName: "Alice Johnson",
      passportNumber: "A12345678",
      visaType: "Employment",
      visaIssueDate: format(subDays(today, 300), 'yyyy-MM-dd'),
      visaExpiryDate: format(addDays(today, 120), 'yyyy-MM-dd'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: VisaStatus.VALID
    },
    {
      id: uuidv4(),
      fullName: "Bob Smith",
      passportNumber: "B98765432",
      visaType: "Business",
      visaIssueDate: format(subDays(today, 350), 'yyyy-MM-dd'),
      visaExpiryDate: format(addDays(today, 25), 'yyyy-MM-dd'), // Warning
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: VisaStatus.WARNING
    },
    {
      id: uuidv4(),
      fullName: "Charlie Davis",
      passportNumber: "C11223344",
      visaType: "Tourist",
      visaIssueDate: format(subDays(today, 60), 'yyyy-MM-dd'),
      visaExpiryDate: format(addDays(today, 5), 'yyyy-MM-dd'), // Critical
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: VisaStatus.CRITICAL
    },
    {
      id: uuidv4(),
      fullName: "Diana Evans",
      passportNumber: "D55667788",
      visaType: "Employment",
      visaIssueDate: format(subDays(today, 400), 'yyyy-MM-dd'),
      visaExpiryDate: format(subDays(today, 2), 'yyyy-MM-dd'), // Expired
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: VisaStatus.EXPIRED
    }
  ];

  localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(employees));
  runNotificationCheck(); // Generate initial notifications
};

export const runNotificationCheck = () => {
  const employees = getEmployees();
  const notifications = getNotifications();
  const newNotifications: Notification[] = [];
  
  // Simple logic: If an employee is in a warning/critical/expired state, ensure a notification exists
  // In a real app, we would track if a notification was sent for a specific status transition.
  // Here, we'll just check if there is an unread notification for this user with the current severity.
  
  employees.forEach(emp => {
    const status = calculateVisaStatus(emp.visaExpiryDate);
    if (status === VisaStatus.VALID) return;

    let severity: NotificationSeverity;
    let message: string;

    if (status === VisaStatus.EXPIRED) {
      severity = NotificationSeverity.EXPIRED;
      message = `Visa for ${emp.fullName} has EXPIRED on ${emp.visaExpiryDate}.`;
    } else if (status === VisaStatus.CRITICAL) {
      severity = NotificationSeverity.CRITICAL;
      message = `Visa for ${emp.fullName} expires in less than 7 days (${emp.visaExpiryDate}).`;
    } else {
      severity = NotificationSeverity.WARNING;
      message = `Visa for ${emp.fullName} expires in less than 30 days (${emp.visaExpiryDate}).`;
    }

    // Check if we already have an active (unread) notification for this
    const exists = notifications.some(n => 
      n.employeeId === emp.id && 
      n.severity === severity && 
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

  if (newNotifications.length > 0) {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify([...newNotifications, ...notifications]));
  }
  localStorage.setItem(LAST_CHECK_KEY, new Date().toISOString());
};

// CRUD Operations

export const getEmployees = (): Employee[] => {
  const data = localStorage.getItem(EMPLOYEES_KEY);
  const employees: Employee[] = data ? JSON.parse(data) : [];
  // Recalculate status on fetch to ensure freshness
  return employees.map(e => ({
    ...e,
    status: calculateVisaStatus(e.visaExpiryDate)
  })).sort((a, b) => new Date(a.visaExpiryDate).getTime() - new Date(b.visaExpiryDate).getTime());
};

export const getEmployee = (id: string): Employee | undefined => {
  return getEmployees().find(e => e.id === id);
};

export const createEmployee = (employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => {
  const employees = getEmployees();
  const newEmployee: Employee = {
    ...employee,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: calculateVisaStatus(employee.visaExpiryDate)
  };
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
  // Recalculate status just in case dates changed
  updatedEmployee.status = calculateVisaStatus(updatedEmployee.visaExpiryDate);
  
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
  const data = localStorage.getItem(NOTIFICATIONS_KEY);
  return data ? JSON.parse(data) : [];
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

// Initialize on load
seedData();