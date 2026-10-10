import { randomUUID } from 'node:crypto';
import type {
  ApplicationAction,
  ApplicationDataInput,
  ApplicationDetail,
  ApplicationEvent,
  ApplicationListQuery,
  ApplicationStatus,
  ApplicationStatusCounts,
  ApplicationSummary,
  Page,
  RecordDecisionRequest,
  RevealSensitiveResponse,
  SensitiveFieldRef,
} from '../../../contracts/index.ts';
import {
  badRequest,
  conflict,
  forbidden,
  notFound,
  validationFailed,
} from '../shared/http-error.ts';
import { normalizeIban } from '../shared/iban.ts';
import type { SessionUser, UserRepository } from '../users/user.repository.ts';
import { APPLICATION_STATUSES } from './application.enums.ts';
import { toDetail, toSummary } from './application.mapper.ts';
import { allowedActions, canView } from './application.policy.ts';
import type { ApplicationDataRecord, ApplicationRecord } from './application.record.ts';
import type { ApplicationRepository } from './application.repository.ts';
import { validateForSubmission } from './application-submit.validator.ts';

const MIN_DECISION_COMMENT_LENGTH = 10;

/** Distributes `Omit` over each member of a union, keeping the discriminant intact. */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
type NewEvent = DistributiveOmit<ApplicationEvent, 'id' | 'at' | 'actor'>;

export interface ApplicationsServiceDeps {
  readonly applications: ApplicationRepository;
  readonly users: UserRepository;
  readonly now?: () => Date;
}

/** Use cases for merchant applications. Every method enforces visibility and record policy. */
export class ApplicationsService {
  private readonly applications: ApplicationRepository;
  private readonly users: UserRepository;
  private readonly now: () => Date;

  constructor({ applications, users, now }: ApplicationsServiceDeps) {
    this.applications = applications;
    this.users = users;
    this.now = now ?? (() => new Date());
  }

  list(user: SessionUser, query: ApplicationListQuery): Page<ApplicationSummary> {
    const search = query.search?.toLowerCase();
    const direction = query.sortDirection === 'asc' ? 1 : -1;

    const matches = this.applications
      .all()
      .filter((app) => canView(user, app))
      .filter((app) => !query.status || app.status === query.status)
      .filter((app) => !search || searchableText(app).includes(search))
      .sort((a, b) => compareBy(query.sortBy ?? 'updatedAt', a, b) * direction);

    const start = (query.page - 1) * query.pageSize;
    return {
      items: matches
        .slice(start, start + query.pageSize)
        .map((app) => toSummary(app, user, this.users)),
      total: matches.length,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  /** Counts per status of the applications this user may see (same scope as the list). */
  statusCounts(user: SessionUser): ApplicationStatusCounts {
    const counts = Object.fromEntries(APPLICATION_STATUSES.map((status) => [status, 0])) as Record<
      ApplicationStatus,
      number
    >;
    this.applications
      .all()
      .filter((app) => canView(user, app))
      .forEach((app) => (counts[app.status] += 1));
    return counts;
  }

  get(user: SessionUser, id: string): ApplicationDetail {
    return toDetail(this.findVisible(user, id), user, this.users);
  }

  create(user: SessionUser, input: ApplicationDataInput): ApplicationDetail {
    const now = this.now();
    const record: ApplicationRecord = {
      id: randomUUID(),
      reference: this.applications.nextReference(now.getUTCFullYear()),
      status: 'DRAFT',
      version: 1,
      createdById: user.id,
      assignedReviewerId: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      submittedAt: null,
      data: mergeData(null, input),
      history: [this.event(user, { type: 'CREATED' })],
    };
    return toDetail(this.applications.save(record), user, this.users);
  }

  saveDraft(
    user: SessionUser,
    id: string,
    version: number,
    input: ApplicationDataInput,
  ): ApplicationDetail {
    const app = this.findAllowed(user, id, 'edit');
    if (app.version !== version) {
      throw conflict('This application was changed elsewhere. Reload to get the latest version.');
    }
    return this.update(user, app, {
      data: mergeData(app.data, input),
      updatedAt: this.now().toISOString(),
    });
  }

  submit(user: SessionUser, id: string): ApplicationDetail {
    const app = this.findAllowed(user, id, 'submit');
    const errors = validateForSubmission(app.data, this.now().toISOString().slice(0, 10));
    if (Object.keys(errors).length > 0) {
      throw validationFailed(errors);
    }
    const now = this.now().toISOString();
    return this.update(user, app, {
      status: 'SUBMITTED',
      submittedAt: now,
      updatedAt: now,
      history: [...app.history, this.event(user, { type: 'SUBMITTED' })],
    });
  }

  assign(user: SessionUser, id: string, reviewerId: string): ApplicationDetail {
    const app = this.findAllowed(user, id, 'assign');
    const reviewer = this.users.findById(reviewerId);
    if (!reviewer?.roles.includes('REVIEWER')) {
      throw badRequest('reviewerId must reference a reviewer');
    }
    if (reviewer.id === app.createdById) {
      throw badRequest('A reviewer cannot review an application they created');
    }
    return this.update(user, app, {
      status: 'IN_REVIEW',
      assignedReviewerId: reviewer.id,
      updatedAt: this.now().toISOString(),
      history: [
        ...app.history,
        this.event(user, { type: 'ASSIGNED', reviewer: this.users.toRef(reviewer.id) }),
      ],
    });
  }

  decide(user: SessionUser, id: string, request: RecordDecisionRequest): ApplicationDetail {
    const app = this.findAllowed(user, id, 'review');
    if (request.comment.length < MIN_DECISION_COMMENT_LENGTH) {
      throw validationFailed({
        comment: `Must be at least ${MIN_DECISION_COMMENT_LENGTH} characters`,
      });
    }
    return this.update(user, app, {
      status: request.decision,
      updatedAt: this.now().toISOString(),
      history: [...app.history, this.event(user, { type: 'DECISION', ...request })],
    });
  }

  /** Returns one sensitive value in clear and records who saw it in the audit trail. */
  reveal(user: SessionUser, id: string, target: SensitiveFieldRef): RevealSensitiveResponse {
    const app = this.findAllowed(user, id, 'reveal-sensitive');
    const value =
      target.field === 'iban'
        ? app.data.banking.iban
        : app.data.owners.find((owner) => owner.id === target.ownerId)?.taxId;
    if (!value) {
      throw notFound('Sensitive value');
    }
    // Audit only: the version is untouched so a reveal never conflicts with draft auto-save.
    this.applications.save({
      ...app,
      history: [...app.history, this.event(user, { type: 'SENSITIVE_REVEALED', target })],
    });
    return { value };
  }

  /** Out-of-scope records answer 404 rather than 403, so their existence is not disclosed. */
  private findVisible(user: SessionUser, id: string): ApplicationRecord {
    const app = this.applications.findById(id);
    if (!app || !canView(user, app)) {
      throw notFound('Application');
    }
    return app;
  }

  private findAllowed(user: SessionUser, id: string, action: ApplicationAction): ApplicationRecord {
    const app = this.findVisible(user, id);
    if (!allowedActions(user, app).includes(action)) {
      throw forbidden(`You cannot ${action} this application in its current state`);
    }
    return app;
  }

  private update(
    user: SessionUser,
    app: ApplicationRecord,
    changes: Partial<ApplicationRecord>,
  ): ApplicationDetail {
    const saved = this.applications.save({ ...app, ...changes, version: app.version + 1 });
    return toDetail(saved, user, this.users);
  }

  private event(user: SessionUser, event: NewEvent): ApplicationEvent {
    return {
      ...event,
      id: randomUUID(),
      at: this.now().toISOString(),
      actor: this.users.toRef(user.id),
    };
  }
}

/**
 * Applies draft input over stored data. Sensitive values omitted from the input keep their
 * stored value; owners are matched by id so each keeps its own tax id.
 */
function mergeData(
  existing: ApplicationDataRecord | null,
  input: ApplicationDataInput,
): ApplicationDataRecord {
  const existingOwners = new Map(existing?.owners.map((owner) => [owner.id, owner]));
  const { iban, ...banking } = input.banking;

  return {
    business: input.business,
    contact: input.contact,
    owners: input.owners.map(({ id, taxId, ...owner }) => {
      const previous = id ? existingOwners.get(id) : undefined;
      return {
        ...owner,
        id: previous?.id ?? randomUUID(),
        taxId: taxId ?? previous?.taxId ?? '',
      };
    }),
    banking: {
      ...banking,
      iban: iban !== undefined ? normalizeIban(iban) : (existing?.banking.iban ?? ''),
    },
  };
}

function searchableText(app: ApplicationRecord): string {
  const { legalName, tradingName } = app.data.business;
  return `${app.reference} ${legalName} ${tradingName}`.toLowerCase();
}

function compareBy(
  field: NonNullable<ApplicationListQuery['sortBy']>,
  a: ApplicationRecord,
  b: ApplicationRecord,
): number {
  switch (field) {
    case 'legalName':
      return a.data.business.legalName.localeCompare(b.data.business.legalName);
    case 'status':
      return APPLICATION_STATUSES.indexOf(a.status) - APPLICATION_STATUSES.indexOf(b.status);
    case 'updatedAt':
      return a.updatedAt.localeCompare(b.updatedAt);
  }
}
