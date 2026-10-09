import type { ApplicationAction, ApplicationStatus } from '../../../contracts/index.ts';
import type { SessionUser } from '../users/user.repository.ts';
import type { ApplicationRecord } from './application.record.ts';

/**
 * Record-level authorization: the single source of truth for who may see or act on a specific
 * application. The API enforces it on every request and exposes the result as `allowedActions`,
 * so the UI never re-implements these rules.
 */

const ASSIGNABLE_STATUSES: readonly ApplicationStatus[] = ['SUBMITTED', 'IN_REVIEW'];

interface PolicyContext {
  readonly app: ApplicationRecord;
  readonly isAdmin: boolean;
  /** SALES user who created the application while it is still a draft. */
  readonly isOwnDraft: boolean;
  /** REVIEWER assigned to the application, who is not also its creator (separation of duties). */
  readonly isAssignedReviewer: boolean;
}

const ACTION_RULES: Readonly<Record<ApplicationAction, (context: PolicyContext) => boolean>> = {
  edit: ({ isOwnDraft }) => isOwnDraft,
  submit: ({ isOwnDraft }) => isOwnDraft,
  assign: ({ isAdmin, app }) => isAdmin && ASSIGNABLE_STATUSES.includes(app.status),
  review: ({ isAssignedReviewer, app }) => isAssignedReviewer && app.status === 'IN_REVIEW',
  'reveal-sensitive': ({ isAdmin, isAssignedReviewer, isOwnDraft }) =>
    isAdmin || isAssignedReviewer || isOwnDraft,
};

/** ADMIN sees everything, SALES their own applications, REVIEWER those assigned to them. */
export function canView(user: SessionUser, app: ApplicationRecord): boolean {
  const isOwner = app.createdById === user.id;
  const isAssigned = app.assignedReviewerId === user.id;
  return (
    user.roles.includes('ADMIN') ||
    (user.roles.includes('SALES') && isOwner) ||
    (user.roles.includes('REVIEWER') && isAssigned)
  );
}

export function allowedActions(user: SessionUser, app: ApplicationRecord): ApplicationAction[] {
  const isOwner = app.createdById === user.id;
  const context: PolicyContext = {
    app,
    isAdmin: user.roles.includes('ADMIN'),
    isOwnDraft: user.roles.includes('SALES') && isOwner && app.status === 'DRAFT',
    isAssignedReviewer:
      user.roles.includes('REVIEWER') && app.assignedReviewerId === user.id && !isOwner,
  };
  return (Object.keys(ACTION_RULES) as ApplicationAction[]).filter((action) =>
    ACTION_RULES[action](context),
  );
}
