# Notes Mobile Audit

## Backend Source

Inspected files:

- `D:\Apex\apex-crm-backend\src\modules\Notes\noteModel.js`
- `D:\Apex\apex-crm-backend\src\modules\Notes\note.controller.js`
- `D:\Apex\apex-crm-backend\src\modules\Notes\noteComment.model.js`
- `D:\Apex\apex-crm-backend\src\modules\Notes\noteActivity.model.js`
- `D:\Apex\apex-crm-backend\src\routes\v1\note.routes.js`
- `D:\Apex\apex-crm-backend\src\core\middleware\permission.middleware.js`
- `D:\Apex\apex-crm-backend\src\config\permissions.js`

## Entity Structure

The canonical backend model is a unified `Note` work-item document with `itemType` values `note`, `task`, `idea`, `journal`, `project`, and `meeting_note`.

Fields found:

- Identity and audit: `organizationId`, `owner`, `createdBy`, `updatedBy`, `createdAt`, `updatedAt`.
- Content: `title`, `content`, `summary`. Backend comment says content supports rich text or markdown as a string.
- Workflow: `status`, `priority`, `priorityOrder`, `startDate`, `dueDate`, `completedAt`, `archivedAt`.
- Assignment and watchers: `assignees`, `watchers`.
- Categorization: `category`, `tags`, `labels`.
- Checklist: `checklist`, `progress`.
- Location: `location.geoJson`, `location.name`, `address`, `city`, `state`, `country`, `postalCode`, `accuracy`.
- Visibility and sharing: `visibility`, `sharedWith`, `visibleToDepartments`.
- Relationships: `parentId`, `relatedNotes`, `projectId`, `meetingId`.
- Attachments: `attachments` with `assetId`, `url`, `publicId`, `fileName`, `fileType`, `size`, `uploadedBy`, `uploadedAt`.
- Custom and external: `customFields`, `externalRefs`.
- Stats: `commentCount`, `viewCount`, `lastViewedAt`, `lastViewedBy`.
- Soft delete: `isDeleted`, `deletedAt`, `deletedBy`.

Comments and activity are separate collections:

- `NoteComment`: `noteId`, `meetingId`, `organizationId`, `author`, `content`, `parentCommentId`, `threadDepth`, `reactions`, `mentions`, `attachments`, edit history, soft delete fields.
- `NoteActivity`: `noteId`, `meetingId`, `organizationId`, `actor`, `action`, `changes`, `meta`, `ipAddress`, `userAgent`, timestamps.

## Permissions

Route-level permission tags:

- Read: `note:read`
- Create/update: `note:write`
- Delete: `note:delete`
- Analytics: `note:view_analytics`
- Calendar: `note:view_calendar`
- Export: `note:export_data`
- Templates: `note:create_template`, `note:use_template`
- Bulk: `note:bulk_update`, `note:bulk_delete`
- Sharing: `note:share`, `note:manage_shared`
- Pin: `note:pin`

Special users with `isOwner` or `isSuperAdmin` bypass route middleware, but controller queries still enforce document ownership for owner-only actions.

Document access filter for reads includes:

- owner
- assignee
- watcher
- explicitly shared user
- organization visibility
- department visibility when the user department matches

Controller-level write rules used by mobile:

- Edit note: owner, any assignee, or explicit `sharedWith.permission === 'edit'`, plus route `note:write`.
- Checklist/time log: owner or assignee, plus route `note:write`.
- Comment: accessible note plus route `note:write`.
- Delete, hard delete, archive, restore, pin, share, convert to task: owner-only in controller, plus matching route permission.
- Duplicate: any accessible note plus route `note:write`; duplicate is created under the current user.

## API Contracts

Main routes:

- `GET /v1/notes`: query supports `type`, `status`, `priority`, `category`, `date`, `startDate`, `endDate`, `tag`, `search`, `isPinned`, `projectId`, `assignedTo`, `page`, `limit`, `sort`. Response: `{ status, data: { notes, pagination } }`.
- `POST /v1/notes`: body supports content, type, dates, priority, category, tags, visibility, project, attachments, related notes, assignees, watchers, checklist, location, custom fields, labels, estimated hours, recurrence, meeting creation fields. Response: `{ status, data: { note, meeting } }`.
- `GET /v1/notes/:id`: response `{ status, data: { note, activityLog } }`.
- `PATCH /v1/notes/:id`: response `{ status, data: { note } }`.
- `DELETE /v1/notes/:id`: soft delete, `204`.
- `DELETE /v1/notes/:id/permanent`: hard delete from trash, `204`.
- `PATCH /v1/notes/:id/pin`, `/archive`, `/restore`: response `{ status, data: { note } }`.
- `GET /v1/notes/trash/bin`, `POST /v1/notes/trash/:id/restore`, `DELETE /v1/notes/trash/empty`.
- `POST /v1/notes/upload`: multipart field `attachments`, max 5. Controller currently accepts images only. Response data is uploaded attachment metadata.
- `GET /v1/notes/search?q=...`: response `{ status, data: { notes } }`.
- `GET /v1/notes/shared/with-me`, `/shared/by-me`.
- `GET /v1/notes/:id/comments`, `POST /v1/notes/:id/comments`, `DELETE /v1/notes/:id/comments/:commentId`, `POST /v1/notes/:id/comments/:commentId/react`.
- `POST /v1/notes/:id/share`, `PATCH /v1/notes/:id/share/permissions`, `DELETE /v1/notes/:id/share/:userId`.
- `POST /v1/notes/:id/link`, `/unlink`, `/duplicate`, `/convert-to-task`.
- `GET /v1/notes/:id/history`.

## Angular Reference

Inspected:

- `D:\Apex\apex\src\app\core\services\notes.service.ts`
- `D:\Apex\apex\src\app\core\models\note.types.ts`
- Notes list, detail, create, card, shared card, recent activity, calendar components.

Patterns retained:

- Library scopes: all/recent/favorites(shared as pinned)/shared/trash/archive/calendar.
- Search debounced against backend query.
- Pinned notes are treated as favorites because there is no backend favorite field.
- Detail screen shows content, metadata, attachments, checklist, linked notes, comments/activity.
- Angular action rendering is mostly route-permission based; mobile tightens this with controller-level owner/edit rules.

## Mobile Alignment Notes

- No separate backend `favorite` field exists; mobile favorite indicators use `isPinned`.
- No direct backend filter for `visibility`; mobile applies visibility scopes client-side after fetching accessible notes.
- Upload endpoint accepts image files only; mobile attachment picker uses image upload.
- Backend does not return an explicit per-note permission object, so mobile derives UI permissions from the note document plus global permission tags using controller rules.
