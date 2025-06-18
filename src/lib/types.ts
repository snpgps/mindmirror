
export interface Activity {
  id: string;
  name: string;
  icon?: React.ElementType; // For Lucide icons or custom SVGs
  isCustom?: boolean;
}

export interface MoodEntry {
  id: string;
  userId: string;
  timestamp: string; // ISO string date
  moodWords: string[]; // Stores core, primary, and secondary selected emotions
  activities: Activity[];
  notes?: string;
}

export type UserRole = 'patient' | 'doctor';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface Patient extends User {
  role: 'patient';
  linkedDoctorCode?: string;
}

export interface Doctor extends User {
  role: 'doctor';
  doctorCode: string; // Unique code for doctors to share with patients
}
