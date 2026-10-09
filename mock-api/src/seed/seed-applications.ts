import type {
  ApplicationEvent,
  ApplicationStatus,
  BusinessType,
  IndustryCategory,
  ReviewDecision,
  RiskLevel,
  UserRef,
} from '../../../contracts/index.ts';
import type { ApplicationRecord, OwnerRecord } from '../applications/application.record.ts';
import { createRandom, digits, fictitiousIban, pick } from './fake-data.ts';
import { SEED_USERS } from './seed-users.ts';

/**
 * Fictional merchant applications. All personal data is invented: `example.com` emails, Ofcom's
 * reserved drama phone range, obviously fake surnames and checksum-valid but made-up IBANs.
 */

const SEED = 20_261_008;
const COUNT = 42;
const DAY_MS = 86_400_000;
const START = Date.parse('2026-08-01T09:00:00.000Z');

const STATUS_CYCLE: readonly ApplicationStatus[] = [
  'DRAFT',
  'SUBMITTED',
  'IN_REVIEW',
  'APPROVED',
  'IN_REVIEW',
  'REJECTED',
  'APPROVED',
];
const CREATORS = [SEED_USERS.salesAsha, SEED_USERS.salesBikash, SEED_USERS.multiMaya];
const REVIEWERS = [SEED_USERS.reviewerRita, SEED_USERS.reviewerRohan, SEED_USERS.multiMaya];
const ADMIN = SEED_USERS.adminAnil;

const PLACES = [
  'Everest',
  'Annapurna',
  'Lumbini',
  'Pokhara Lakeside',
  'Himal',
  'Bagmati',
  'Koshi',
  'Rara',
];
const TRADES: readonly { readonly name: string; readonly industry: IndustryCategory }[] = [
  { name: 'Demo Crafts', industry: 'RETAIL' },
  { name: 'Sample Kitchen', industry: 'FOOD_AND_BEVERAGE' },
  { name: 'Test Treks', industry: 'TRAVEL' },
  { name: 'Example Academy', industry: 'EDUCATION' },
  { name: 'Mock Pharmacy', industry: 'HEALTHCARE' },
  { name: 'Placeholder Apps', industry: 'DIGITAL_GOODS' },
  { name: 'Fictional Consulting', industry: 'PROFESSIONAL_SERVICES' },
];
const BUSINESS_TYPES: readonly BusinessType[] = [
  'SOLE_PROPRIETOR',
  'PARTNERSHIP',
  'PRIVATE_LIMITED',
];
const LEGAL_SUFFIX: Readonly<Record<BusinessType, string>> = {
  SOLE_PROPRIETOR: '',
  PARTNERSHIP: ' & Partners',
  PRIVATE_LIMITED: ' Pvt. Ltd.',
  PUBLIC_LIMITED: ' Ltd.',
  NON_PROFIT: ' Foundation',
};
const FIRST_NAMES = ['Aarav', 'Sita', 'Kiran', 'Nisha', 'Ramesh', 'Gita', 'Sanjay', 'Puja'];
const LAST_NAMES = ['Example', 'Sample', 'Testman', 'Demo'];
const CITIES = ['Kathmandu', 'Pokhara', 'Lalitpur', 'Bhaktapur', 'Biratnagar'];
const DECISION_NOTES: Readonly<Record<ReviewDecision, readonly string[]>> = {
  APPROVED: [
    'Documents verified and ticket sizes consistent with the trade.',
    'Low chargeback exposure; ownership structure is clear.',
  ],
  REJECTED: [
    'Projected volume is inconsistent with trading history.',
    'Unable to verify beneficial ownership from supplied records.',
  ],
};

export function createSeedApplications(): ApplicationRecord[] {
  const random = createRandom(SEED);
  return Array.from({ length: COUNT }, (_, index) => createApplication(random, index));
}

function createApplication(random: () => number, index: number): ApplicationRecord {
  const status = STATUS_CYCLE[index % STATUS_CYCLE.length];
  const creator = CREATORS[index % CREATORS.length];
  const reviewer = needsReviewer(status)
    ? pick(
        random,
        REVIEWERS.filter((user) => user.id !== creator.id),
      )
    : null;
  const place = pick(random, PLACES);
  const trade = pick(random, TRADES);
  const businessType = pick(random, BUSINESS_TYPES);
  const isDraft = status === 'DRAFT';

  const createdAt = START + index * 1.4 * DAY_MS;
  const timeline = (step: number): string =>
    new Date(createdAt + step * 0.6 * DAY_MS).toISOString();
  const history = buildHistory(random, index, status, creator, reviewer, timeline);
  const tradingName = `${place} ${trade.name}`;
  const monthlyVolume = 50_000 + Math.floor(random() * 40) * 25_000;

  return {
    id: `app-${String(index + 1).padStart(4, '0')}`,
    reference: `MA-2026-${String(index + 1).padStart(4, '0')}`,
    status,
    version: history.length,
    createdById: creator.id,
    assignedReviewerId: reviewer?.id ?? null,
    createdAt: timeline(0),
    updatedAt: history[history.length - 1].at,
    submittedAt: isDraft ? null : timeline(1),
    data: {
      business: {
        legalName: `${tradingName}${LEGAL_SUFFIX[businessType]}`,
        tradingName,
        businessType,
        registrationNumber: `REG-${digits(random, 6)}`,
        industry: trade.industry,
        website: isDraft ? '' : `https://${place.toLowerCase().replace(/\s+/g, '-')}.example.com`,
        establishedOn: `20${10 + Math.floor(random() * 15)}-0${1 + Math.floor(random() * 9)}-15`,
      },
      contact: {
        contactName: `${pick(random, FIRST_NAMES)} ${pick(random, LAST_NAMES)}`,
        email: `merchant${index + 1}@example.com`,
        phone: `+44 7700 900${String(index).padStart(3, '0')}`,
        addressLine1: `${10 + index} Demo Street`,
        addressLine2: '',
        city: pick(random, CITIES),
        postalCode: `44${digits(random, 3)}`,
        country: 'NP',
      },
      owners: createOwners(random, isDraft),
      banking: {
        accountHolderName: tradingName,
        bankName: isDraft ? '' : 'Sample Bank Ltd.',
        currency: 'NPR',
        monthlyVolume: isDraft ? null : monthlyVolume,
        averageTicketSize: isDraft ? null : 500 + Math.floor(random() * 30) * 100,
        iban: isDraft ? '' : fictitiousIban(random),
      },
    },
    history,
  };
}

function createOwners(random: () => number, isDraft: boolean): OwnerRecord[] {
  const shares = random() < 0.5 ? [100] : [60, 40];
  return shares.map((share, index) => ({
    id: `owner-${digits(random, 8)}-${index}`,
    fullName: `${pick(random, FIRST_NAMES)} ${pick(random, LAST_NAMES)}`,
    title: index === 0 ? 'Director' : 'Partner',
    ownershipPercentage: share,
    taxId: isDraft ? '' : `TIN-${digits(random, 9)}`,
  }));
}

function needsReviewer(status: ApplicationStatus): boolean {
  return status === 'IN_REVIEW' || status === 'APPROVED' || status === 'REJECTED';
}

function buildHistory(
  random: () => number,
  index: number,
  status: ApplicationStatus,
  creator: UserRef,
  reviewer: UserRef | null,
  timeline: (step: number) => string,
): ApplicationEvent[] {
  const ref = (user: UserRef): UserRef => ({ id: user.id, displayName: user.displayName });
  const id = (step: number): string => `evt-${index + 1}-${step}`;
  const events: ApplicationEvent[] = [
    { id: id(0), at: timeline(0), actor: ref(creator), type: 'CREATED' },
  ];

  if (status !== 'DRAFT') {
    events.push({ id: id(1), at: timeline(1), actor: ref(creator), type: 'SUBMITTED' });
  }
  if (reviewer) {
    events.push({
      id: id(2),
      at: timeline(2),
      actor: ref(ADMIN),
      type: 'ASSIGNED',
      reviewer: ref(reviewer),
    });
  }
  if (reviewer && (status === 'APPROVED' || status === 'REJECTED')) {
    const riskLevel: RiskLevel =
      status === 'APPROVED'
        ? pick(random, ['LOW', 'MEDIUM'] as const)
        : pick(random, ['MEDIUM', 'HIGH'] as const);
    events.push({
      id: id(3),
      at: timeline(3),
      actor: ref(reviewer),
      type: 'DECISION',
      decision: status,
      riskLevel,
      comment: pick(random, DECISION_NOTES[status]),
    });
  }
  return events;
}
