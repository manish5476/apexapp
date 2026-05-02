export interface ShiftBreak {
  name?: string;
  startTime?: string;
  endTime?: string;
  isPaid?: boolean;
}

export interface OvertimeRules {
  enabled?: boolean;
  multiplier?: number;
  afterHours?: number;
  doubleAfterHours?: number;
  holidayMultiplier?: number;
}

export interface FlexiConfig {
  coreStartTime?: string;
  coreEndTime?: string;
  flexibleBandStart?: string;
  flexibleBandEnd?: string;
  minHoursPerDay?: number;
}

export interface Shift {
  _id?: string;
  name: string;
  code?: string;
  description?: string;

  startTime: string; // HH:MM
  endTime: string; // HH:MM

  breakDurationMins?: number;
  breaks?: ShiftBreak[];

  gracePeriodMins?: number;
  lateThresholdMins?: number;
  earlyDepartureThresholdMins?: number;
  halfDayThresholdHrs?: number;
  minFullDayHrs?: number;
  maxOvertimeHrs?: number;

  shiftType?: 'fixed' | 'rotating' | 'flexi' | 'split' | 'night';
  isNightShift?: boolean;
  crossesMidnight?: boolean;

  weeklyOffs?: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  applicableDays?: number[];

  overtimeRules?: OvertimeRules;
  flexiConfig?: FlexiConfig;

  isActive?: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;

  duration?: string; // Virtual property

  createdAt?: string;
  updatedAt?: string;
}
