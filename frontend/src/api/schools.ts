import { apiClient } from "./client";
import type { School, University } from "./auth";

export async function searchSchools(q: string): Promise<School[]> {
  const { data } = await apiClient.get("/auth/schools/", { params: { q } });
  return data;
}

export async function searchUniversities(q: string): Promise<University[]> {
  const { data } = await apiClient.get("/auth/universities/", { params: { q } });
  return data;
}
