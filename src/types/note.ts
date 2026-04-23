export type ItemType = 'note' | 'task' | 'idea' | 'journal' | 'project' | 'meeting' | 'meeting_note';
export type NoteStatus = 'draft' | 'open' | 'in_progress' | 'in_review' | 'done' | 'archived' | 'cancelled';
export type Priority = 'none' | 'low' | 'medium' | 'high' | 'urgent';
export type Visibility = 'private' | 'assignees' | 'team' | 'department' | 'organization';

export interface UserLight {
  _id: string;
  name: string;
  email?: string;
  avatar?: string;
}

export interface ChecklistItem {
  _id?: string;
  title: string;
  completed: boolean;
}

export interface Note {
  _id: string;
  title: string;
  content?: string;
  summary?: string;
  itemType: ItemType;
  noteType?: string;
  status: NoteStatus;
  priority: Priority;
  category?: string;
  tags?: string[];
  visibility?: Visibility;
  owner?: UserLight;
  assignees?: { user?: string | UserLight }[];
  sharedWith?: { user?: string | UserLight; permission?: string }[];
  checklist?: ChecklistItem[];
  isPinned?: boolean;
  isTemplate?: boolean;
  isDeleted?: boolean;
  dueDate?: string;
  startDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotesListResponse {
  notes: Note[];
  pagination?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}
