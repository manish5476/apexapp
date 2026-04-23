import apiClient from './client';
import type { Note, NotesListResponse } from '@/src/types/note';

const endpoint = '/v1/notes';

const extractArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

const normalizeNotesList = (payload: any): NotesListResponse => ({
  notes:
    extractArray<Note>(payload?.data?.notes).length > 0
      ? extractArray<Note>(payload?.data?.notes)
      : extractArray<Note>(payload?.notes).length > 0
        ? extractArray<Note>(payload?.notes)
        : extractArray<Note>(payload?.data),
  pagination: payload?.pagination ?? payload?.data?.pagination,
});

const normalizeNote = (payload: any): Note | null => payload?.data?.note ?? payload?.note ?? payload?.data ?? null;

export const NotesService = {
  getNotes: async (params?: Record<string, unknown>) => normalizeNotesList(await apiClient.get(endpoint, { params: params ?? {} })),
  getSharedWithMe: async () => normalizeNotesList(await apiClient.get(`${endpoint}/shared/with-me`)),
  searchNotes: async (query: string) => normalizeNotesList(await apiClient.get(`${endpoint}/search`, { params: { q: query } })),
  getNoteById: async (id: string) => {
    const response: any = await apiClient.get(`${endpoint}/${id}`);
    return {
      note: normalizeNote(response),
      activityLog: response?.data?.activityLog ?? response?.activityLog ?? [],
    };
  },
  createNote: async (data: Partial<Note>) => normalizeNote(await apiClient.post(endpoint, data)),
  updateNote: async (id: string, data: Partial<Note>) => normalizeNote(await apiClient.patch(`${endpoint}/${id}`, data)),
  deleteNote: (id: string) => apiClient.delete(`${endpoint}/${id}`),
  togglePinNote: async (id: string) => normalizeNote(await apiClient.patch(`${endpoint}/${id}/pin`, {})),
  archiveNote: async (id: string) => normalizeNote(await apiClient.patch(`${endpoint}/${id}/archive`, {})),
  addChecklistItem: async (noteId: string, title: string) =>
    normalizeNote(await apiClient.post(`${endpoint}/${noteId}/checklist`, { title })),
  toggleChecklistItem: async (noteId: string, subtaskId: string, completed: boolean) =>
    normalizeNote(await apiClient.patch(`${endpoint}/${noteId}/checklist/${subtaskId}`, { completed })),
};
