import apiClient from './client';

export interface Note {
  _id: string;
  title: string;
  content: string;
  itemType: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  owner?: {
    _id: string;
    name: string;
    avatar?: string;
  };
}

export const NotesService = {
  getRecentNotes: (limit = 5) => apiClient.get('/v1/notes', { params: { limit, sort: '-createdAt' } }),
  createNote: (data: Partial<Note>) => apiClient.post('/v1/notes', data),
};
