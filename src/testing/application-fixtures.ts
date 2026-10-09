import type { ApplicationDetail, ApplicationSummary, Page } from '@contracts';

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

/** A complete, valid set of form values for a new application (fictional data). */
export const VALID_FORM_VALUE = {
  business: {
    legalName: 'Spec Traders Pvt. Ltd.',
    tradingName: 'Spec Traders',
    businessType: 'PRIVATE_LIMITED' as const,
    registrationNumber: 'REG-000001',
    industry: 'RETAIL' as const,
    website: 'https://spec.example.com',
    establishedOn: new Date(2020, 0, 15),
  },
  contact: {
    contactName: 'Test Contact',
    email: 'contact@example.com',
    phone: '+977 1 4412345',
    addressLine1: '1 Spec Street',
    addressLine2: '',
    city: 'Kathmandu',
    postalCode: '44600',
    country: 'NP',
  },
  owners: [
    {
      fullName: 'Owner Example',
      title: 'Director',
      ownershipPercentage: 100,
      taxId: 'TIN-123456789',
    },
  ],
  banking: {
    accountHolderName: 'Spec Traders',
    bankName: 'Sample Bank Ltd.',
    currency: 'NPR' as const,
    monthlyVolume: 100_000,
    averageTicketSize: 1_000,
    iban: 'GB82WEST12345698765432',
  },
};

/** A saved draft as the API returns it: sensitive values masked. */
export function createDetail(overrides: Partial<ApplicationDetail> = {}): ApplicationDetail {
  return {
    id: 'app-0001',
    reference: 'MA-2026-0001',
    status: 'DRAFT',
    version: 1,
    createdBy: { id: 'u-sales', displayName: 'Test Sales' },
    assignedReviewer: null,
    createdAt: '2026-10-01T09:00:00.000Z',
    updatedAt: '2026-10-01T09:00:00.000Z',
    submittedAt: null,
    data: {
      business: { ...VALID_FORM_VALUE.business, establishedOn: '2020-01-15' },
      contact: VALID_FORM_VALUE.contact,
      owners: [
        {
          id: 'owner-1',
          fullName: 'Owner Example',
          title: 'Director',
          ownershipPercentage: 100,
          taxId: { masked: '•••• 6789' },
        },
      ],
      banking: { ...VALID_FORM_VALUE.banking, iban: { masked: '•••• 5432' } },
    },
    history: [],
    allowedActions: ['edit', 'submit', 'reveal-sensitive'],
    ...overrides,
  };
}
