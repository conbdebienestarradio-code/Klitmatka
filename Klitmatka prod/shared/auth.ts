export interface AuthCompany {
  id: string;
  name: string;
  rif: string;
  email: string;
  employeeCount: number;
  role: "admin" | "member";
}

export interface AuthIdentity {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  role: "admin" | "member" | "none";
  isPlatformAdmin: boolean;
  company: AuthCompany | null;
  companies: AuthCompany[];
}

export interface UserRegistration {
  firstName: string;
  lastName: string;
  jobTitle: string;
  email: string;
  password: string;
}

export interface CompanyRegistration {
  companyEmail: string;
  rif: string;
  companyName: string;
  employeeCount: number;
}

export interface CompanyInvitation {
  email: string;
  companyName: string;
  expiresAt: string;
}

export interface MeasurementModuleVersion {
  id: string;
  moduleId: string;
  version: number;
  name: string;
  description: string;
  unit: string;
  metricName: string;
  factorValue: number | null;
  factorUnit: string;
  sourceReference: string;
  status: "VIGENTE" | "PENDIENTE_VALIDACION_OFICIAL";
  validFrom: string;
  createdAt: string;
}

export interface MeasurementModule {
  id: string;
  code: string;
  name: string;
  description: string;
  unit: string;
  metricName: string;
  active: boolean;
  currentVersion: MeasurementModuleVersion | null;
}
