// Hand-written mirrors of backend/models/schemas.py — keep in sync.
export type Role = "user" | "admin";
export type UserType = "aluno" | "professor" | "tecnico";
export type ReservationKind = "lab" | "equipment";
export type ReservationStatus = "confirmed" | "cancelled";

export interface UserPublic {
  id: string;
  name: string;
  email: string;
  role: Role;
  user_type: UserType;
}

export interface GoogleLoginIn {
  credential: string;
}

export interface LoginIn {
  email: string;
  password: string;
}

export interface LabIn {
  name: string;
  location: string;
  computers: number;
  capacity: number;
  description: string;
  specs: string;
  active: boolean;
}

export interface Lab extends LabIn {
  id: string;
  in_use_now: boolean;
}

export interface EquipmentIn {
  name: string;
  category: string;
  quantity: number;
  description: string;
  specs: string;
  active: boolean;
}

export interface Equipment extends EquipmentIn {
  id: string;
  available_now: number;
}

export interface AvailabilityOut {
  available: number;
  total: number;
}

export interface ReservationIn {
  kind: ReservationKind;
  resource_id: string;
  start: string;
  end: string;
  quantity: number;
  purpose: string;
}

export interface Reservation {
  id: string;
  kind: ReservationKind;
  resource_id: string;
  resource_name: string;
  user_id: string;
  user_name: string;
  user_email: string;
  start: string;
  end: string;
  quantity: number;
  purpose: string;
  status: ReservationStatus;
  cancel_reason: string;
  cancelled_by: "" | "user" | "admin";
  created_at: string;
}

export interface CancelIn {
  reason: string;
}

export interface Notification {
  id: string;
  user_id: string;
  reservation_id: string;
  title: string;
  message: string;
  reason: string;
  read: boolean;
  created_at: string;
}

export interface StatsOut {
  total_labs: number;
  total_computers: number;
  labs_in_use_now: number;
  equipment_total: number;
  equipment_available: number;
  my_active_reservations: number;
  now: string;
}

export const USER_TYPE_LABELS: Record<UserType, string> = {
  aluno: "Aluno",
  professor: "Professor",
  tecnico: "Técnico",
};
