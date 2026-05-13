import { Note, NoteActivity, NoteComment, NoteDetailResponse, NotesCommentResponse, NotesListResponse } from '@/src/types/note';
import apiClient from './client';

export const NotesService = {
  // Query & List
  getNotes: (params: Record<string, unknown> = {}) =>
    apiClient.get<NotesListResponse>('/v1/notes', { params }).then((res) => res.data),

  getRecentNotes: (limit = 5) =>
    apiClient.get<NotesListResponse>('/v1/notes', { params: { limit, sort: '-createdAt' } }).then((res) => res.data),

  getSharedWithMe: () =>
    apiClient.get<NotesListResponse>('/v1/notes/shared/with-me').then((res) => res.data),

  getNoteById: (id: string) =>
    apiClient.get<NoteDetailResponse>(`/v1/notes/${id}`).then((res) => res.data),

  // Create, Update, Delete
  createNote: (data: Partial<Note>) =>
    apiClient.post<Note>('/v1/notes', data).then((res) => res.data),

  updateNote: (id: string, data: Partial<Note>) =>
    apiClient.patch<Note>(`/v1/notes/${id}`, data).then((res) => res.data),

  deleteNote: (id: string) =>
    apiClient.delete(`/v1/notes/${id}`).then((res) => res.data),

  // Checklist
  addChecklistItem: (id: string, title: string) =>
    apiClient.post<Note>(`/v1/notes/${id}/checklist`, { title }).then((res) => res.data),

  toggleChecklistItem: (id: string, itemId: string, completed: boolean) =>
    apiClient.patch<Note>(`/v1/notes/${id}/checklist/${itemId}`, { completed }).then((res) => res.data),

  // Comments
  getComments: (id: string) =>
    apiClient.get<NotesCommentResponse>(`/v1/notes/${id}/comments`).then((res) => res.data),

  addComment: (id: string, content: string) =>
    apiClient.post<NoteComment>(`/v1/notes/${id}/comments`, { content }).then((res) => res.data),

  // Quick Actions
  togglePinNote: (id: string) =>
    apiClient.patch<Note>(`/v1/notes/${id}/pin`).then((res) => res.data),

  archiveNote: (id: string) =>
    apiClient.patch<Note>(`/v1/notes/${id}/archive`).then((res) => res.data),

  restoreNote: (id: string) =>
    apiClient.patch<Note>(`/v1/notes/${id}/restore`).then((res) => res.data),

  restoreFromTrash: (id: string) =>
    apiClient.post<Note>(`/v1/notes/trash/${id}/restore`).then((res) => res.data),

  duplicateNote: (id: string) =>
    apiClient.post<Note>(`/v1/notes/${id}/duplicate`).then((res) => res.data),

  convertToTask: (id: string) =>
    apiClient.post<Note>(`/v1/notes/${id}/convert-to-task`).then((res) => res.data),

  // Media
  uploadMedia: async (files: { uri: string; name: string; type: string }[]) => {
    const formData = new FormData();
    files.forEach((file) => {
      // @ts-ignore
      formData.append('attachments', {
        uri: file.uri,
        name: file.name,
        type: file.type,
      });
    });

    const response = await apiClient.post('/v1/notes/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};
