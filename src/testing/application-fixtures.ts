import type { ApplicationSummary, Page } from '@contracts';

/** Builds a fictional application summary for tests; override only what a test cares about. */
export function createSummary(overrides: Partial<ApplicationSummary> = {}): ApplicationSummary {
  const id = overrides.id ?? 'app-0001';
  return {
    id,
    reference: `MA-2026-${id.slice(-4)}`,
    status: 'SUBMITTED',
    legalName: 'Everest Demo Crafts Pvt. Ltd.',
    tradingName: 'Everest Demo Crafts',
    createdBy: { id: 'u-sales', displayName: 'Test Sales' },
    assignedReviewer: null,
    latestRiskLevel: null,
    updatedAt: '2026-09-29T10:00:00.000Z',
    allowedActions: [],
    ...overrides,
  };
}

export function createPage(
  items: ApplicationSummary[],
  overrides: Partial<Page<ApplicationSummary>> = {},
): Page<ApplicationSummary> {
  return { items, total: items.length, page: 1, pageSize: 10, ...overrides };
}
