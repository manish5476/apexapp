import apiClient from './client';
import type { Note, NoteActivity, NoteAttachment, NoteComment, NoteDetailResponse, NotesCommentResponse, NotesListResponse, SharePermission } from '@/src/types/note';

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
const normalizeComments = (payload: any): NotesCommentResponse => ({
  comments: extractArray<NoteComment>(payload?.data?.comments),
  total: payload?.data?.total,
  page: payload?.data?.page,
  pages: payload?.data?.pages,
});

const normalizeActivity = (payload: any): NoteActivity[] =>
  extractArray<NoteActivity>(payload?.data?.history).length > 0
    ? extractArray<NoteActivity>(payload?.data?.history)
    : extractArray<NoteActivity>(payload?.data?.activityLog);

export const NotesService = {
  getNotes: async (params?: Record<string, unknown>) => normalizeNotesList(await apiClient.get(endpoint, { params: params ?? {} })),
  getSharedWithMe: async () => normalizeNotesList(await apiClient.get(`${endpoint}/shared/with-me`)),
  getSharedByMe: async () => normalizeNotesList(await apiClient.get(`${endpoint}/shared/by-me`)),
  getTrash: async () => normalizeNotesList(await apiClient.get(`${endpoint}/trash/bin`)),
  searchNotes: async (query: string) => normalizeNotesList(await apiClient.get(`${endpoint}/search`, { params: { q: query } })),
  getNoteById: async (id: string): Promise<NoteDetailResponse> => {
    const response: any = await apiClient.get(`${endpoint}/${id}`);
    return {
      note: normalizeNote(response),
      activityLog: response?.data?.activityLog ?? response?.activityLog ?? [],
    };
  },
  createNote: async (data: Partial<Note>) => normalizeNote(await apiClient.post(endpoint, data)),
  updateNote: async (id: string, data: Partial<Note>) => normalizeNote(await apiClient.patch(`${endpoint}/${id}`, data)),
  deleteNote: (id: string) => apiClient.delete(`${endpoint}/${id}`),
  hardDeleteNote: (id: string) => apiClient.delete(`${endpoint}/${id}/permanent`),
  togglePinNote: async (id: string) => normalizeNote(await apiClient.patch(`${endpoint}/${id}/pin`, {})),
  archiveNote: async (id: string) => normalizeNote(await apiClient.patch(`${endpoint}/${id}/archive`, {})),
  restoreNote: async (id: string) => normalizeNote(await apiClient.patch(`${endpoint}/${id}/restore`, {})),
  restoreFromTrash: async (id: string) => normalizeNote(await apiClient.post(`${endpoint}/trash/${id}/restore`, {})),
  duplicateNote: async (id: string) => normalizeNote(await apiClient.post(`${endpoint}/${id}/duplicate`, {})),
  convertToTask: async (id: string, data?: { dueDate?: string; priority?: string }) =>
    normalizeNote(await apiClient.post(`${endpoint}/${id}/convert-to-task`, data ?? {})),
  linkNote: async (sourceNoteId: string, targetNoteId: string) =>
    normalizeNote(await apiClient.post(`${endpoint}/${sourceNoteId}/link`, { targetNoteId })),
  unlinkNote: async (sourceNoteId: string, targetNoteId: string) =>
    normalizeNote(await apiClient.post(`${endpoint}/${sourceNoteId}/unlink`, { targetNoteId })),
  shareNote: async (id: string, userIds: string[], permission: SharePermission = 'view') =>
    normalizeNote(await apiClient.post(`${endpoint}/${id}/share`, { userIds, permission })),
  updateSharePermissions: (id: string, userId: string, permission: SharePermission) =>
    apiClient.patch(`${endpoint}/${id}/share/permissions`, { userId, permission }),
  removeSharedUser: (id: string, userId: string) => apiClient.delete(`${endpoint}/${id}/share/${userId}`),
  addChecklistItem: async (noteId: string, title: string) =>
    normalizeNote(await apiClient.post(`${endpoint}/${noteId}/checklist`, { title })),
  toggleChecklistItem: async (noteId: string, subtaskId: string, completed: boolean) =>
    normalizeNote(await apiClient.patch(`${endpoint}/${noteId}/checklist/${subtaskId}`, { completed })),
  removeChecklistItem: async (noteId: string, subtaskId: string) =>
    normalizeNote(await apiClient.delete(`${endpoint}/${noteId}/checklist/${subtaskId}`)),
  getComments: async (id: string, params?: Record<string, unknown>) => normalizeComments(await apiClient.get(`${endpoint}/${id}/comments`, { params: params ?? {} })),
  addComment: async (id: string, content: string) => {
    const response: any = await apiClient.post(`${endpoint}/${id}/comments`, { content });
    return response?.data?.comment ?? response?.comment ?? null;
  },
  reactToComment: (id: string, commentId: string, emoji: string) =>
    apiClient.post(`${endpoint}/${id}/comments/${commentId}/react`, { emoji }),
  getNoteHistory: async (id: string) => normalizeActivity(await apiClient.get(`${endpoint}/${id}/history`)),
  uploadMedia: async (attachments: { uri: string; name: string; type: string }[]) => {
    const formData = new FormData();
    attachments.forEach((file) => formData.append('attachments', file as any));
    const response: any = await apiClient.post(`${endpoint}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return extractArray<NoteAttachment>(response?.data);
  },
};
