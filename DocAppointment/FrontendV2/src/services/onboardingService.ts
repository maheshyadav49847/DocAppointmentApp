import { api } from "@/lib/axios";

export interface OnboardingStatusDto {
  isOnboarded: boolean;
  hasBranch: boolean;
  hasDoctor: boolean;
  hasSession: boolean;
  hasRateList: boolean;
  currentStep: number;
  orgAdminName: string;
  orgAdminEmail: string;
  orgAdminPhoneDialCode?: string;
  orgAdminPhone: string;
  isOrgAdminDoctor: boolean;
  doctorId?: string;

  // Existing Branch Data (from Branches table)
  existingBranchName?: string;
  existingBranchAddress?: string;
  existingBranchPhone?: string;
  existingBranchPhoneDialCode?: string;
  existingBranchLogoBase64?: string;
  existingTelegramBotToken?: string;

  // Existing Doctor Data (from Doctors table)
  existingDoctorSpecialization?: string;
  existingDoctorQualification?: string;
  existingDoctorExperience?: string;
  existingDoctorGender?: string;
  existingDoctorRegNo?: string;

  // Existing Session Data (from Sessions table)
  existingSessionName?: string;
  existingSessionStartTime?: string;
  existingSessionEndTime?: string;
  existingSessionCapacity?: number;
  existingSessionIsDaily?: boolean;

  // Existing Rate List Data (from ServiceItems table)
  existingServiceName?: string;
  existingServiceFee?: number;
}

export interface BranchSetupPayload {
  name: string;
  address: string;
  phoneDialCode?: string;
  phone: string;
  whatsAppDialCode?: string;
  whatsAppNumber?: string;
  telegramBotToken?: string;
  logoBase64?: string;
}

export interface DoctorSetupPayload {
  isOrgAdminDoctor: boolean;
  name: string;
  specialization: string;
  registrationNumber?: string;
  consultationFee: number;
  consultationDurationMinutes: number;
  gender?: string;
  qualification?: string;
  experience?: string;
  mobileDialCode?: string;
  mobile?: string;
  emailId?: string;
}

export interface SessionSetupPayload {
  sessionName: string;
  isDaily: boolean;
  dayOfWeek: number;
  daysOfWeek?: number[];
  startTime: string; // e.g. "09:00:00"
  endTime: string;   // e.g. "13:00:00"
  defaultCapacity: number;
}

export interface RateListSetupPayload {
  serviceName: string;
  category: string;
  price: number;
}

export interface CompleteOnboardingSetupCommand {
  branch: BranchSetupPayload;
  doctor: DoctorSetupPayload;
  session: SessionSetupPayload;
  rateList: RateListSetupPayload;
}

export interface CompleteOnboardingSetupResult {
  success: boolean;
  branchId: string;
  doctorId: string;
  sessionId: string;
  serviceItemId: string;
  message: string;
}

export const onboardingService = {
  getStatus: async (): Promise<OnboardingStatusDto> => {
    const response = await api.get<OnboardingStatusDto>('/onboarding/status');
    return response.data;
  },

  completeSetup: async (payload: CompleteOnboardingSetupCommand): Promise<CompleteOnboardingSetupResult> => {
    const response = await api.post<CompleteOnboardingSetupResult>('/onboarding/setup', payload);
    return response.data;
  }
};
