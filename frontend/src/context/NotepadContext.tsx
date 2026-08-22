import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  points: Point[];
  color: string;
  width: number;
  erase: boolean;
}

export interface TextNote {
  id: string;
  x: number;
  y: number;
  text: string;
  width?: number;
  height?: number;
}

interface StoredNote {
  id: string;
  name: string;
  updatedAt: number;
  strokes: Stroke[];
  textNotes: TextNote[];
}

interface NoteMeta {
  id: string;
  name: string;
  updatedAt: number;
}

const NOTES_KEY = "examsapp9_notepads_v1";
const ACTIVE_KEY = "examsapp9_active_notepad_id";

function loadAllNotes(): StoredNote[] {
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistAllNotes(notes: StoredNote[]) {
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}

function blankNote(name: string): StoredNote {
  return {
    id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    updatedAt: Date.now(),
    strokes: [],
    textNotes: [],
  };
}

interface NotepadContextValue {
  notes: NoteMeta[];
  activeNoteId: string;
  activeStrokes: Stroke[];
  textNotes: TextNote[];
  openSignal: number;
  requestOpenNotepad: () => void;
  pendingEquation: string | null;
  requestInsertEquation: (latex: string) => void;
  clearPendingEquation: () => void;
  insertEquationIntoNote: (noteId: string, latex: string) => void;
  insertEquationIntoNewNote: (latex: string) => void;
  saveStrokes: (strokes: Stroke[]) => void;
  addTextNote: (text: string, x?: number, y?: number) => void;
  updateTextNote: (id: string, patch: Partial<TextNote>) => void;
  removeTextNote: (id: string) => void;
  clearTextNotes: () => void;
  createNote: () => void;
  switchNote: (id: string) => void;
  renameNote: (id: string, name: string) => void;
  deleteNote: (id: string) => void;
}

const NotepadCtx = createContext<NotepadContextValue | null>(null);

export function NotepadProvider({ children }: { children: ReactNode }) {
  const allNotesRef = useRef<StoredNote[]>([]);
  const [activeNoteId, setActiveNoteId] = useState("");
  const [activeStrokes, setActiveStrokes] = useState<Stroke[]>([]);
  const [textNotes, setTextNotes] = useState<TextNote[]>([]);
  const [notesVersion, setNotesVersion] = useState(0);
  const [openSignal, setOpenSignal] = useState(0);
  const [pendingEquation, setPendingEquation] = useState<string | null>(null);

  useEffect(() => {
    let all = loadAllNotes();
    if (all.length === 0) {
      all = [blankNote("Նշում 1")];
      persistAllNotes(all);
    }
    allNotesRef.current = all;
    const storedActive = localStorage.getItem(ACTIVE_KEY);
    const active = all.find((n) => n.id === storedActive) ?? all[0];
    setActiveNoteId(active.id);
    setActiveStrokes(active.strokes);
    setTextNotes(active.textNotes);
    setNotesVersion((v) => v + 1);
  }, []);

  function persist() {
    persistAllNotes(allNotesRef.current);
    setNotesVersion((v) => v + 1);
  }

  function updateActive(patch: Partial<StoredNote>) {
    const idx = allNotesRef.current.findIndex((n) => n.id === activeNoteId);
    if (idx === -1) return;
    allNotesRef.current[idx] = { ...allNotesRef.current[idx], ...patch, updatedAt: Date.now() };
    persist();
  }

  const saveStrokes = useCallback((strokes: Stroke[]) => {
    setActiveStrokes(strokes);
    updateActive({ strokes });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeNoteId]);

  const addTextNote = useCallback((text: string, x?: number, y?: number) => {
    const id = `text-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setTextNotes((prev) => {
      const next = [
        ...prev,
        { id, x: x ?? 24 + (prev.length % 6) * 18, y: y ?? 24 + (prev.length % 6) * 18, text },
      ];
      updateActive({ textNotes: next });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeNoteId]);

  const updateTextNote = useCallback((id: string, patch: Partial<TextNote>) => {
    setTextNotes((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, ...patch } : n));
      updateActive({ textNotes: next });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeNoteId]);

  const removeTextNote = useCallback((id: string) => {
    setTextNotes((prev) => {
      const next = prev.filter((n) => n.id !== id);
      updateActive({ textNotes: next });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeNoteId]);

  const clearTextNotes = useCallback(() => {
    setTextNotes([]);
    updateActive({ textNotes: [] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeNoteId]);

  const createNote = useCallback(() => {
    const n = blankNote(`Նշում ${allNotesRef.current.length + 1}`);
    allNotesRef.current = [...allNotesRef.current, n];
    persist();
    localStorage.setItem(ACTIVE_KEY, n.id);
    setActiveNoteId(n.id);
    setActiveStrokes(n.strokes);
    setTextNotes(n.textNotes);
  }, []);

  const switchNote = useCallback((id: string) => {
    const n = allNotesRef.current.find((x) => x.id === id);
    if (!n) return;
    localStorage.setItem(ACTIVE_KEY, n.id);
    setActiveNoteId(n.id);
    setActiveStrokes(n.strokes);
    setTextNotes(n.textNotes);
  }, []);

  const renameNote = useCallback((id: string, name: string) => {
    const idx = allNotesRef.current.findIndex((n) => n.id === id);
    if (idx === -1) return;
    allNotesRef.current[idx] = { ...allNotesRef.current[idx], name };
    persist();
  }, []);

  const deleteNote = useCallback((id: string) => {
    const remaining = allNotesRef.current.filter((n) => n.id !== id);
    if (remaining.length === 0) remaining.push(blankNote("Նշում 1"));
    allNotesRef.current = remaining;
    persist();
    if (id === activeNoteId) {
      const next = remaining[0];
      localStorage.setItem(ACTIVE_KEY, next.id);
      setActiveNoteId(next.id);
      setActiveStrokes(next.strokes);
      setTextNotes(next.textNotes);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeNoteId]);

  const requestOpenNotepad = useCallback(() => {
    setOpenSignal((v) => v + 1);
  }, []);

  const clearPendingEquation = useCallback(() => {
    setPendingEquation(null);
  }, []);

  const requestInsertEquation = useCallback((latex: string) => {
    setPendingEquation(latex);
    setOpenSignal((v) => v + 1);
  }, []);

  const insertEquationIntoNote = useCallback((noteId: string, latex: string) => {
    const idx = allNotesRef.current.findIndex((n) => n.id === noteId);
    if (idx === -1) return;
    const target = allNotesRef.current[idx];
    const newTextNote: TextNote = {
      id: `text-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      x: 24 + (target.textNotes.length % 6) * 18,
      y: 24 + (target.textNotes.length % 6) * 18,
      text: latex,
    };
    const nextTextNotes = [...target.textNotes, newTextNote];
    allNotesRef.current[idx] = { ...target, textNotes: nextTextNotes, updatedAt: Date.now() };
    persist();
    localStorage.setItem(ACTIVE_KEY, noteId);
    setActiveNoteId(noteId);
    setActiveStrokes(allNotesRef.current[idx].strokes);
    setTextNotes(nextTextNotes);
    setPendingEquation(null);
  }, []);

  const insertEquationIntoNewNote = useCallback((latex: string) => {
    const n = blankNote(`Նշում ${allNotesRef.current.length + 1}`);
    const newTextNote: TextNote = {
      id: `text-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      x: 24,
      y: 24,
      text: latex,
    };
    n.textNotes = [newTextNote];
    allNotesRef.current = [...allNotesRef.current, n];
    persist();
    localStorage.setItem(ACTIVE_KEY, n.id);
    setActiveNoteId(n.id);
    setActiveStrokes(n.strokes);
    setTextNotes(n.textNotes);
    setPendingEquation(null);
  }, []);

  const notes = useMemo<NoteMeta[]>(
    () => allNotesRef.current.map((n) => ({ id: n.id, name: n.name, updatedAt: n.updatedAt })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [notesVersion],
  );

  const value = useMemo<NotepadContextValue>(
    () => ({
      notes,
      activeNoteId,
      activeStrokes,
      textNotes,
      openSignal,
      requestOpenNotepad,
      pendingEquation,
      requestInsertEquation,
      clearPendingEquation,
      insertEquationIntoNote,
      insertEquationIntoNewNote,
      saveStrokes,
      addTextNote,
      updateTextNote,
      removeTextNote,
      clearTextNotes,
      createNote,
      switchNote,
      renameNote,
      deleteNote,
    }),
    [
      notes, activeNoteId, activeStrokes, textNotes, openSignal, requestOpenNotepad,
      pendingEquation, requestInsertEquation, clearPendingEquation, insertEquationIntoNote,
      insertEquationIntoNewNote, saveStrokes, addTextNote, updateTextNote, removeTextNote,
      clearTextNotes, createNote, switchNote, renameNote, deleteNote,
    ],
  );

  return <NotepadCtx.Provider value={value}>{children}</NotepadCtx.Provider>;
}

export function useNotepad() {
  const ctx = useContext(NotepadCtx);
  if (!ctx) throw new Error("useNotepad must be used within a NotepadProvider");
  return ctx;
}

export function useNotepadOptional() {
  return useContext(NotepadCtx);
}