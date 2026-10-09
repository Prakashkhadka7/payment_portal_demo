import type { ApplicationEvent } from '@contracts';

/** Human-readable line for an audit-trail event. */
export function describeEvent(event: ApplicationEvent): string {
  switch (event.type) {
    case 'CREATED':
      return 'Created the draft';
    case 'SUBMITTED':
      return 'Submitted for review';
    case 'ASSIGNED':
      return `Assigned to ${event.reviewer.displayName}`;
    case 'DECISION':
      return event.decision === 'APPROVED'
        ? 'Approved the application'
        : 'Rejected the application';
    case 'SENSITIVE_REVEALED':
      return event.target.field === 'iban' ? 'Viewed the IBAN' : "Viewed an owner's tax ID";
  }
}
