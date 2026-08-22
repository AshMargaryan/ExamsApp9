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
  has_usable_password: boolean;
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

export interface OAuthNewUser {
  is_new: true;
  ticket: string;
  email: string;
  first_name: string;
  last_name: string;
}

export interface CompleteOAuthRegistrationPayload {
  ticket: string;
  username: string;
  first_name: string;
  last_name: string;
  role: AccountRole;
  age?: number;
  grade?: number;
  sex?: "male" | "female";
  school?: number;
  university?: number;
}

/** Present on a login response when the account was already at its device cap:
 *  the oldest device was signed out to make room for this one. */
export interface SignedOutDevice {
  /** e.g. "Windows · Chrome", or a generic word when the UA said nothing. */
  label: string;
  count: number;
  device_limit: number;
}

export async function login(username: string, password: string): Promise<SignedOutDevice | null> {
  const { data } = await apiClient.post("/auth/login/", { username, password });
  tokenStorage.set(data.access, data.refresh);
  return (data.signed_out_device as SignedOutDevice | undefined) ?? null;
}

/** Returns the ticket payload for a brand-new Google account, or null once tokens are stored. */
export async function googleAuth(idToken: string): Promise<OAuthNewUser | null> {
  const { data } = await apiClient.post("/auth/google/", { id_token: idToken });
  if (data.is_new) return data as OAuthNewUser;
  tokenStorage.set(data.access, data.refresh);
  return null;
}

/** Returns the ticket payload for a brand-new Apple account, or null once tokens are stored.
 * firstName/lastName are only meaningful on a user's very first Apple authorization
 * (Apple never repeats them afterward) — pass through whatever AppleSignInButton captured. */
export async function appleAuth(idToken: string, firstName: string, lastName: string): Promise<OAuthNewUser | null> {
  const { data } = await apiClient.post("/auth/apple/", {
    id_token: idToken, first_name: firstName, last_name: lastName,
  });
  if (data.is_new) return data as OAuthNewUser;
  tokenStorage.set(data.access, data.refresh);
  return null;
}

export async function completeOAuthRegistration(payload: CompleteOAuthRegistrationPayload): Promise<void> {
  const { data } = await apiClient.post("/auth/oauth/complete/", payload);
  tokenStorage.set(data.access, data.refresh);
}

export interface UsernameAvailability {
  username: string;
  available: boolean;
  /** False when the username fails the field's own format rules. */
  valid: boolean;
  /** Human-readable reason when unavailable or invalid; empty when free. */
  detail: string;
  suggestions: string[];
}

/** Signup's live availability check. Advisory only — registration re-validates,
 *  so a name reported free can still be taken by the time the form is sent. */
export async function checkUsernameAvailability(
  username: string,
  signal?: AbortSignal,
): Promise<UsernameAvailability> {
  const { data } = await apiClient.get<UsernameAvailability>("/auth/username-available/", {
    params: { username },
    signal,
  });
  return data;
}

export async function register(payload: RegisterPayload): Promise<void> {
  await apiClient.post("/auth/register/", payload);
}

export async function fetchMe(): Promise<User> {
  const { data } = await apiClient.get("/auth/me/");
  return data;
}

export async function logout(): Promise<void> {
  try {
    await apiClient.post("/auth/logout/");
  } finally {
    // Always clear locally, even if the network call fails — a user must
    // never be stuck unable to log out on their own device.
    tokenStorage.clear();
  }
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

/** currentPassword is ignored server-side for an account with no usable
 * password yet (Google/Apple-only) — see ChangePasswordView. */
export async function changePassword(
  currentPassword: string,
  newPassword: string,
  confirmNewPassword: string,
): Promise<void> {
  await apiClient.post("/auth/change-password/", {
    current_password: currentPassword,
    new_password: newPassword,
    confirm_new_password: confirmNewPassword,
  });
}
