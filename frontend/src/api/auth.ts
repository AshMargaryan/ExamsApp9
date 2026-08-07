import { apiClient, tokenStorage } from "./client";

export interface School {
  id: number;
  name: string;
  marz: string;
}

export interface University {
  id: number;
  name: string;
}

export type AccountRole = "student" | "teacher" | "parent";

export interface User {
  id: number;
  username: string;
  email: string;
  date_joined: string;
  is_email_verified: boolean;
  role: AccountRole;
  first_name: string;
  last_name: string;
  age: number | null;
  grade: number | null;
  sex: "" | "male" | "female";
  school: School | null;
  university: University | null;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  confirm_password: string;
  first_name: string;
  last_name: string;
  role: AccountRole;
  age?: number;
  grade?: number;
  sex?: "male" | "female";
  school?: number;
  university?: number;
}

export async function login(username: string, password: string): Promise<void> {
  const { data } = await apiClient.post("/auth/login/", { username, password });
  tokenStorage.set(data.access, data.refresh);
}

export async function register(payload: RegisterPayload): Promise<void> {
  await apiClient.post("/auth/register/", payload);
}

export async function fetchMe(): Promise<User> {
  const { data } = await apiClient.get("/auth/me/");
  return data;
}

export function logout(): void {
  tokenStorage.clear();
}

export async function verifyEmail(code: string): Promise<void> {
  await apiClient.post("/auth/verify-email/", { code });
}

export async function resendVerificationCode(): Promise<void> {
  await apiClient.post("/auth/verify-email/resend/");
}

export async function requestPasswordReset(email: string): Promise<void> {
  await apiClient.post("/auth/password-reset/", { email });
}

export async function confirmPasswordReset(
  uid: string,
  token: string,
  newPassword: string,
  confirmNewPassword: string,
): Promise<void> {
  await apiClient.post("/auth/password-reset/confirm/", {
    uid,
    token,
    new_password: newPassword,
    confirm_new_password: confirmNewPassword,
  });
}
