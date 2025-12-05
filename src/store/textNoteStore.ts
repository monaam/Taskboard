import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TextNoteState, ChecklistColor } from '../types';

const generateId = () => crypto.randomUUID();

// Random position generator for new text notes
const getRandomPosition = () => {
  const visibleWidth = 1200;
  const visibleHeight = 800;
  const margin = 50;

  return {
    x: margin + Math.random() * (visibleWidth - margin * 2),
    y: margin + Math.random() * (visibleHeight - margin * 2),
  };
};

export const useTextNoteStore = create<TextNoteState>()(
  persist(
    (set) => ({
      textNotes: [],

      createTextNote: (text: string, x?: number, y?: number) => {
        const position = x !== undefined && y !== undefined
          ? { x, y }
          : getRandomPosition();

        set((state) => ({
          textNotes: [
            ...state.textNotes,
            {
              id: generateId(),
              text,
              x: position.x,
              y: position.y,
              fontSize: 24,
              color: 'default',
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
          ],
        }));
      },

      updateTextNoteText: (noteId: string, text: string) =>
        set((state) => ({
          textNotes: state.textNotes.map((note) =>
            note.id === noteId
              ? { ...note, text, updatedAt: Date.now() }
              : note
          ),
        })),

      updateTextNotePosition: (noteId: string, x: number, y: number) =>
        set((state) => ({
          textNotes: state.textNotes.map((note) =>
            note.id === noteId
              ? { ...note, x, y, updatedAt: Date.now() }
              : note
          ),
        })),

      updateTextNoteFontSize: (noteId: string, fontSize: number) =>
        set((state) => ({
          textNotes: state.textNotes.map((note) =>
            note.id === noteId
              ? { ...note, fontSize: Math.max(12, Math.min(120, fontSize)), updatedAt: Date.now() }
              : note
          ),
        })),

      updateTextNoteColor: (noteId: string, color: ChecklistColor) =>
        set((state) => ({
          textNotes: state.textNotes.map((note) =>
            note.id === noteId
              ? { ...note, color, updatedAt: Date.now() }
              : note
          ),
        })),

      deleteTextNote: (noteId: string) =>
        set((state) => ({
          textNotes: state.textNotes.filter((note) => note.id !== noteId),
        })),
    }),
    {
      name: 'textnote-storage',
    }
  )
);
