export interface SalaryBand {
  min?: number;
  max?: number;
  currency?: string;
}

export interface DesignationMetadata {
  isManager?: boolean;
  isExecutive?: boolean;
  requiresApproval?: boolean;
}

export interface Designation {
  _id?: string;
  title: string;
  code?: string;
  description?: string;
  
  level: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  
  nextDesignation?: string | { _id: string; title: string };
  promotionAfterYears?: number;
  
  jobFamily?: string;
  responsibilities?: string[];
  qualifications?: string[];
  experienceRequired?: number;
  
  salaryBand?: SalaryBand;
  
  reportsTo?: Array<string | { _id: string; title: string }>;
  
  isActive?: boolean;
  metadata?: DesignationMetadata;
  
  createdAt?: string;
  updatedAt?: string;
}
