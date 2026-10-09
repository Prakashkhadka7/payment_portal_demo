import type {
  ApplicationDetail,
  ApplicationSummary,
  MaskedValue,
  RiskLevel,
} from '../../../contracts/index.ts';
import type { SessionUser, UserRepository } from '../users/user.repository.ts';
import { allowedActions } from './application.policy.ts';
import type { ApplicationRecord } from './application.record.ts';

const MASK = '••••';
const VISIBLE_SUFFIX_LENGTH = 4;
const MIN_LENGTH_FOR_SUFFIX = 8;

/** Sensitive values leave the server masked; only the reveal endpoint returns them in clear. */
export function maskSensitive(value: string): MaskedValue | null {
  if (!value) {
    return null;
  }
  const suffix = value.length >= MIN_LENGTH_FOR_SUFFIX ? value.slice(-VISIBLE_SUFFIX_LENGTH) : '';
  return { masked: suffix ? `${MASK} ${suffix}` : MASK };
}

export function toSummary(
  app: ApplicationRecord,
  user: SessionUser,
  users: UserRepository,
): ApplicationSummary {
  return {
    id: app.id,
    reference: app.reference,
    status: app.status,
    legalName: app.data.business.legalName,
    tradingName: app.data.business.tradingName,
    createdBy: users.toRef(app.createdById),
    assignedReviewer: app.assignedReviewerId ? users.toRef(app.assignedReviewerId) : null,
    latestRiskLevel: latestRiskLevel(app),
    updatedAt: app.updatedAt,
    allowedActions: allowedActions(user, app),
  };
}

export function toDetail(
  app: ApplicationRecord,
  user: SessionUser,
  users: UserRepository,
): ApplicationDetail {
  const { business, contact, owners, banking } = app.data;
  return {
    id: app.id,
    reference: app.reference,
    status: app.status,
    version: app.version,
    createdBy: users.toRef(app.createdById),
    assignedReviewer: app.assignedReviewerId ? users.toRef(app.assignedReviewerId) : null,
    createdAt: app.createdAt,
    updatedAt: app.updatedAt,
    submittedAt: app.submittedAt,
    data: {
      business,
      contact,
      owners: owners.map(({ taxId, ...owner }) => ({ ...owner, taxId: maskSensitive(taxId) })),
      banking: { ...banking, iban: maskSensitive(banking.iban) },
    },
    history: app.history,
    allowedActions: allowedActions(user, app),
  };
}

function latestRiskLevel(app: ApplicationRecord): RiskLevel | null {
  const decision = app.history.findLast((event) => event.type === 'DECISION');
  return decision?.type === 'DECISION' ? decision.riskLevel : null;
}
