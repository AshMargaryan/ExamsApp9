import { apiClient } from "./client";

export interface Note {
  id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface NoteInput {
  title: string;
  content: string;
}

export async function listNotes(): Promise<Note[]> {
  const { data } = await apiClient.get("/notepad/");
  return data;
}

export async function createNote(input: NoteInput): Promise<Note> {
  const { data } = await apiClient.post("/notepad/", input);
  return data;
}

export async function updateNote(id: number, input: NoteInput): Promise<Note> {
  const { data } = await apiClient.patch(`/notepad/${id}/`, input);
  return data;
}

export async function deleteNote(id: number): Promise<void> {
  await apiClient.delete(`/notepad/${id}/`);
}
