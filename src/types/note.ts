export type ItemType = 'note' | 'task' | 'idea' | 'journal' | 'project' | 'meeting' | 'meeting_note';
export type NoteStatus = 'draft' | 'open' | 'in_progress' | 'in_review' | 'done' | 'archived' | 'cancelled' | 'active' | 'completed' | 'deferred';
export type Priority = 'none' | 'low' | 'medium' | 'high' | 'urgent';
export type Visibility = 'private' | 'assignees' | 'team' | 'department' | 'organization';
export type SharePermission = 'view' | 'comment' | 'edit';
export type AssignmentRole = 'owner' | 'collaborator' | 'reviewer' | 'observer';
export type AssignmentStatus = 'pending' | 'accepted' | 'declined' | 'in_progress' | 'done' | 'verified';

export interface UserLight {
  _id: string;
  name: string;
  email?: string;
  avatar?: string;
}

export interface NoteAssignee {
  _id?: string;
  user?: string | UserLight;
  assignedBy?: string | UserLight;
  role?: AssignmentRole;
  status?: AssignmentStatus;
  acceptedAt?: string;
  completedAt?: string;
  estimatedHours?: number;
  loggedHours?: number;
  notes?: string;
}

export interface ChecklistItem {
  _id?: string;
  title: string;
  completed: boolean;
  completedAt?: string;
  completedBy?: string | UserLight;
  assignedTo?: string | UserLight;
  dueDate?: string;
  order?: number;
}

export interface NoteAttachment {
  _id?: string;
  assetId?: string;
  url: string;
  publicId?: string;
  fileName: string;
  fileType?: string;
  size?: number;
  uploadedBy?: string | UserLight;
  uploadedAt?: string;
}

export interface NoteLabel {
  _id?: string;
  name: string;
  color?: string;
}

export interface NoteComment {
  _id: string;
  noteId?: string;
  author?: UserLight;
  content: string;
  parentCommentId?: string | null;
  threadDepth?: number;
  reactions?: { emoji: string; users: (string | UserLight)[] }[];
  mentions?: (string | UserLight)[];
  attachments?: NoteAttachment[];
  isEdited?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface NoteActivity {
  _id: string;
  noteId?: string;
  actor?: UserLight;
  action: string;
  changes?: { field?: string; oldValue?: unknown; newValue?: unknown };
  meta?: unknown;
  createdAt: string;
}

export interface Note {
  _id: string;
  organizationId?: string;
  title: string;
  content?: string;
  summary?: string;
  itemType: ItemType;
  noteType?: string;
  status: NoteStatus;
  priority: Priority;
  category?: string;
  tags?: string[];
  labels?: NoteLabel[];
  visibility?: Visibility;
  owner?: UserLight;
  createdBy?: UserLight;
  updatedBy?: UserLight;
  assignees?: NoteAssignee[];
  watchers?: (string | UserLight)[];
  sharedWith?: { user?: string | UserLight; permission?: SharePermission; sharedAt?: string; sharedBy?: string | UserLight }[];
  visibleToDepartments?: string[];
  checklist?: ChecklistItem[];
  progress?: number;
  attachments?: NoteAttachment[];
  commentCount?: number;
  viewCount?: number;
  relatedNotes?: (string | Pick<Note, '_id' | 'title' | 'itemType' | 'status' | 'priority'>)[];
  projectId?: string | { _id: string; name?: string };
  meetingId?: string;
  startDate?: string;
  dueDate?: string;
  completedAt?: string;
  archivedAt?: string;
  estimatedHours?: number;
  loggedHours?: number;
  customFields?: { key: string; value: unknown; fieldType?: string }[];
  externalRefs?: { service?: string; refId?: string; url?: string }[];
  isPinned?: boolean;
  isTemplate?: boolean;
  isDeleted?: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotesListResponse {
  notes: Note[];
  pagination?: {
    page?: number;
    limit?: number;
    total?: number;
    pages?: number;
    totalPages?: number;
  };
}

export interface NoteDetailResponse {
  note: Note | null;
  activityLog: NoteActivity[];
}

export interface NotesCommentResponse {
  comments: NoteComment[];
  total?: number;
  page?: number;
  pages?: number;
}
