import { ApiService } from '@/src/api/ApiService';
import { PERMISSIONS } from '@/src/constants/permissions';

export type HrmsModuleKey =
  | 'departments'
  | 'designations'
  | 'shifts'
  | 'shift-groups'
  | 'leave-requests'
  | 'leave-balances'
  | 'attendance-logs'
  | 'attendance-daily'
  | 'attendance-machines'
  | 'attendance-geofences'
  | 'attendance-holidays';

type ListMethod = (params?: Record<string, unknown>) => Promise<any>;
type ItemMethod = (id: string) => Promise<any>;

export type HrmsModuleConfig = {
  key: HrmsModuleKey;
  title: string;
  subtitle: string;
  icon: string;
  permission: string;
  list: ListMethod;
  getById: ItemMethod;
};

export const HRMS_MODULES: HrmsModuleConfig[] = [
  {
    key: 'departments',
    title: 'Departments',
    subtitle: 'Department hierarchy and ownership',
    icon: 'business-outline',
    permission: PERMISSIONS.DEPARTMENT.READ,
    list: ApiService.getDepartments,
    getById: ApiService.getDepartmentById,
  },
  {
    key: 'designations',
    title: 'Designations',
    subtitle: 'Titles, grades, and career levels',
    icon: 'ribbon-outline',
    permission: PERMISSIONS.DESIGNATION.READ,
    list: ApiService.getDesignations,
    getById: ApiService.getDesignationById,
  },
  {
    key: 'shifts',
    title: 'Shifts',
    subtitle: 'Shift templates and timings',
    icon: 'time-outline',
    permission: PERMISSIONS.SHIFT.READ,
    list: ApiService.getShifts,
    getById: ApiService.getShiftById,
  },
  {
    key: 'shift-groups',
    title: 'Shift Groups',
    subtitle: 'Rotation groups and schedules',
    icon: 'git-network-outline',
    permission: PERMISSIONS.SHIFT.GROUP_READ,
    list: ApiService.getShiftGroups,
    getById: ApiService.getShiftGroupById,
  },
  {
    key: 'leave-requests',
    title: 'Leave Requests',
    subtitle: 'Employee leave applications',
    icon: 'calendar-outline',
    permission: PERMISSIONS.LEAVE.READ,
    list: ApiService.getLeaveRequests,
    getById: ApiService.getLeaveRequestById,
  },
  {
    key: 'leave-balances',
    title: 'Leave Balances',
    subtitle: 'Accruals, usage, and balances',
    icon: 'wallet-outline',
    permission: PERMISSIONS.LEAVE.BALANCE_READ,
    list: ApiService.getLeaveBalances,
    getById: ApiService.getLeaveBalanceById,
  },
  {
    key: 'attendance-logs',
    title: 'Attendance Logs',
    subtitle: 'Raw punches and source logs',
    icon: 'clipboard-outline',
    permission: PERMISSIONS.ATTENDANCE.LOG_READ,
    list: ApiService.getAttendanceLogs,
    getById: ApiService.getAttendanceLogById,
  },
  {
    key: 'attendance-daily',
    title: 'Daily Attendance',
    subtitle: 'Daily status and work hours',
    icon: 'calendar-number-outline',
    permission: PERMISSIONS.ATTENDANCE.READ,
    list: ApiService.getDailyAttendance,
    getById: ApiService.getDailyAttendanceById,
  },
  {
    key: 'attendance-machines',
    title: 'Attendance Machines',
    subtitle: 'Device health and sync status',
    icon: 'hardware-chip-outline',
    permission: PERMISSIONS.ATTENDANCE.MACHINE_READ,
    list: ApiService.getAttendanceMachines,
    getById: ApiService.getAttendanceMachineById,
  },
  {
    key: 'attendance-geofences',
    title: 'Geo Fences',
    subtitle: 'Attendance zones and assignments',
    icon: 'locate-outline',
    permission: PERMISSIONS.ATTENDANCE.GEOFENCE_READ,
    list: ApiService.getGeoFences,
    getById: ApiService.getGeoFenceById,
  },
  {
    key: 'attendance-holidays',
    title: 'Holidays',
    subtitle: 'Calendar holidays and applicability',
    icon: 'sunny-outline',
    permission: PERMISSIONS.HOLIDAY.READ,
    list: ApiService.getHolidays,
    getById: ApiService.getHolidayById,
  },
];

export const getHrmsModuleConfig = (key?: string) => HRMS_MODULES.find((module) => module.key === key);
