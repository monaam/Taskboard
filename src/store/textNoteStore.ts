import { create } from 'zustand';
import { TextNoteState, ChecklistColor } from '../types';
import { apiClient } from '../api/client';

const generateId = () => crypto.randomUUID();

// Transform API response
const transformTextNote = (data: any) => ({
  id: data.id,
  text: data.text,
  x: data.x,
  y: data.y,
  fontSize: data.fontSize,
  color: data.color || 'default',
  createdAt: new Date(data.createdAt).getTime(),
  updatedAt: new Date(data.updatedAt).getTime(),
});

export const useTextNoteStore = create<TextNoteState & {
  loadTextNotes: () => Promise<void>;
  isLoaded: boolean;
}>()((set) => ({
  textNotes: [],
  isLoaded: false,

  loadTextNotes: async () => {
    try {
      const data = await apiClient.getTextNotes();
      set({ textNotes: data.map(transformTextNote), isLoaded: true });
    } catch (error) {
      console.error('Failed to load text notes:', error);
      set({ isLoaded: true });
    }
  },

  createTextNote: async (text: string, x?: number, y?: number) => {
    const position = { x: x ?? 100, y: y ?? 100 };

    try {
      const data = await apiClient.createTextNote({ text, ...position });
      const note = transformTextNote(data);
      set((state) => ({ textNotes: [...state.textNotes, note] }));
    } catch (error) {
      console.error('Failed to create text note:', error);
    }
  },

  updateTextNoteText: async (noteId: string, text: string) => {
    set((state) => ({
      textNotes: state.textNotes.map((n) =>
        n.id === noteId ? { ...n, text, updatedAt: Date.now() } : n
      ),
    }));
    try {
      await apiClient.updateTextNote(noteId, { text });
    } catch (error) {
      console.error('Failed to update text note:', error);
    }
  },

  updateTextNotePosition: async (noteId: string, x: number, y: number) => {
    set((state) => ({
      textNotes: state.textNotes.map((n) =>
        n.id === noteId ? { ...n, x, y, updatedAt: Date.now() } : n
      ),
    }));
    try {
      await apiClient.updateTextNote(noteId, { x, y });
    } catch (error) {
      console.error('Failed to update text note position:', error);
    }
  },

  updateTextNoteFontSize: async (noteId: string, fontSize: number) => {
    const clampedSize = Math.max(12, Math.min(120, fontSize));
    set((state) => ({
      textNotes: state.textNotes.map((n) =>
        n.id === noteId ? { ...n, fontSize: clampedSize, updatedAt: Date.now() } : n
      ),
    }));
    try {
      await apiClient.updateTextNote(noteId, { fontSize: clampedSize });
    } catch (error) {
      console.error('Failed to update text note font size:', error);
    }
  },

  updateTextNoteColor: async (noteId: string, color: ChecklistColor) => {
    set((state) => ({
      textNotes: state.textNotes.map((n) =>
        n.id === noteId ? { ...n, color, updatedAt: Date.now() } : n
      ),
    }));
    try {
      await apiClient.updateTextNote(noteId, { color });
    } catch (error) {
      console.error('Failed to update text note color:', error);
    }
  },

  deleteTextNote: async (noteId: string) => {
    set((state) => ({
      textNotes: state.textNotes.filter((n) => n.id !== noteId),
    }));
    try {
      await apiClient.deleteTextNote(noteId);
    } catch (error) {
      console.error('Failed to delete text note:', error);
    }
  },
}));
