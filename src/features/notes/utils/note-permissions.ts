import { PERMISSIONS } from '@/src/constants/permissions';
import type { Note, SharePermission, UserLight } from '@/src/types/note';

const idOf = (value?: string | UserLight | null) => (typeof value === 'string' ? value : value?._id);

export type NotePermissionSet = {
  isOwner: boolean;
  isAssignee: boolean;
  sharePermission?: SharePermission;
  canRead: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canComment: boolean;
  canDelete: boolean;
  canHardDelete: boolean;
  canArchive: boolean;
  canRestore: boolean;
  canPin: boolean;
  canShare: boolean;
  canManageShare: boolean;
  canDuplicate: boolean;
  canConvertToTask: boolean;
  canUpdateChecklist: boolean;
};

type PermissionFn = (permission?: string | null) => boolean;

export const getNotePermissions = (note: Note | null | undefined, currentUserId: string | undefined, hasPermission: PermissionFn): NotePermissionSet => {
  const ownerId = idOf(note?.owner);
  const isOwner = Boolean(note && currentUserId && ownerId === currentUserId);
  const isAssignee = Boolean(note?.assignees?.some((assignee) => idOf(assignee.user) === currentUserId));
  const sharePermission = note?.sharedWith?.find((share) => idOf(share.user) === currentUserId)?.permission;

  const globalRead = hasPermission(PERMISSIONS.NOTE.READ);
  const globalWrite = hasPermission(PERMISSIONS.NOTE.WRITE);
  const globalDelete = hasPermission(PERMISSIONS.NOTE.DELETE);
  const globalPin = hasPermission(PERMISSIONS.NOTE.PIN);
  const globalShare = hasPermission(PERMISSIONS.NOTE.SHARE);
  const globalManageShare = hasPermission(PERMISSIONS.NOTE.MANAGE_SHARED);

  const canEditByDocumentRule = isOwner || isAssignee || sharePermission === 'edit';
  const canOwnerMutate = Boolean(isOwner && !note?.isDeleted);

  return {
    isOwner,
    isAssignee,
    sharePermission,
    canRead: globalRead,
    canCreate: globalWrite,
    canEdit: Boolean(globalWrite && canEditByDocumentRule && !note?.isDeleted),
    canComment: Boolean(globalWrite && !note?.isDeleted),
    canDelete: Boolean(globalDelete && canOwnerMutate),
    canHardDelete: Boolean(globalDelete && isOwner && note?.isDeleted),
    canArchive: Boolean(globalWrite && canOwnerMutate && note?.status !== 'archived'),
    canRestore: Boolean(globalWrite && isOwner && (note?.status === 'archived' || note?.isDeleted)),
    canPin: Boolean(globalPin && canOwnerMutate),
    canShare: Boolean(globalShare && canOwnerMutate),
    canManageShare: Boolean(globalManageShare && canOwnerMutate),
    canDuplicate: Boolean(globalWrite && note && !note.isDeleted),
    canConvertToTask: Boolean(globalWrite && canOwnerMutate && note?.itemType === 'note'),
    canUpdateChecklist: Boolean(globalWrite && (isOwner || isAssignee) && !note?.isDeleted),
  };
};

export const permissionLabel = (note: Note, currentUserId?: string) => {
  const ownerId = idOf(note.owner);
  if (currentUserId && ownerId === currentUserId) return 'Owner';
  const shared = note.sharedWith?.find((share) => idOf(share.user) === currentUserId);
  if (shared?.permission) return `Shared ${shared.permission}`;
  if (note.assignees?.some((assignee) => idOf(assignee.user) === currentUserId)) return 'Assigned';
  if (note.visibility === 'organization') return 'Organization';
  if (note.visibility === 'department') return 'Department';
  if (note.visibility === 'team') return 'Team';
  return note.visibility === 'private' ? 'Private' : 'Accessible';
};

export const userInitials = (user?: UserLight | string | null) => {
  if (!user || typeof user === 'string') return '?';
  return (user.name || user.email || '?')
    .split(' ')
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
};
