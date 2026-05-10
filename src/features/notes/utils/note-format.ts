import type { Note } from '@/src/types/note';

export const stripMarkup = (value?: string) => (value ?? '').replace(/<[^>]*>/g, '').replace(/[#*`>\-]/g, '').trim();

export const notePreview = (note: Note, fallback = 'No content added yet.') => {
  const text = stripMarkup(note.summary || note.content);
  return text || fallback;
};

export const formatRelativeDate = (value?: string) => {
  if (!value) return 'Recently';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

export const titleCase = (value?: string) => (value || '').replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());

export const priorityColor = (priority?: string, theme?: { error: string; warning: string; info: string; success: string; textTertiary: string }) => {
  if (!theme) return '#64748b';
  if (priority === 'urgent') return theme.error;
  if (priority === 'high') return theme.warning;
  if (priority === 'medium') return theme.info;
  if (priority === 'low') return theme.success;
  return theme.textTertiary;
};
