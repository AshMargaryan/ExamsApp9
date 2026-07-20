import { apiClient, tokenStorage } from "./client";

export interface User {
  id: number;
  username: string;
  email: string;
  date_joined: string;
}

export async function login(username: string, password: string): Promise<void> {
  const { data } = await apiClient.post("/auth/login/", { username, password });
  tokenStorage.set(data.access, data.refresh);
}

export async function register(username: string, email: string, password: string): Promise<void> {
  await apiClient.post("/auth/register/", { username, email, password });
}

export async function fetchMe(): Promise<User> {
  const { data } = await apiClient.get("/auth/me/");
  return data;
}

export function logout(): void {
  tokenStorage.clear();
}