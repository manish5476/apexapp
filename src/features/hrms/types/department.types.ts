export interface Department {
  _id?: string;
  name: string;
  code?: string;
  description?: string;
  parentDepartment?: string | { _id: string; name: string };
  headOfDepartment?: string | { _id: string; name: string };
  assistantHOD?: string | { _id: string; name: string };
  costCenter?: string;
  budgetCode?: string;
  employeeCount?: number;
  maxStrength?: number;
  contactEmail?: string;
  contactPhone?: string;
  location?: string;
  isActive?: boolean;
  path?: string;
  level?: number;
  metadata?: {
    establishedDate?: string | Date;
    division?: string;
    region?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface DepartmentTree extends Department {
  children?: DepartmentTree[];
}
