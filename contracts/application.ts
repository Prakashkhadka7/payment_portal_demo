import type { IsoDate, IsoDateTime, SortDirection, UserRef } from './common';

export type ApplicationStatus = 'DRAFT' | 'SUBMITTED' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export type ReviewDecision = Extract<ApplicationStatus, 'APPROVED' | 'REJECTED'>;

export type BusinessType =
  'SOLE_PROPRIETOR' | 'PARTNERSHIP' | 'PRIVATE_LIMITED' | 'PUBLIC_LIMITED' | 'NON_PROFIT';

export type IndustryCategory =
  | 'RETAIL'
  | 'FOOD_AND_BEVERAGE'
  | 'TRAVEL'
  | 'EDUCATION'
  | 'HEALTHCARE'
  | 'DIGITAL_GOODS'
  | 'PROFESSIONAL_SERVICES';

export type CurrencyCode = 'NPR' | 'USD' | 'EUR' | 'GBP';

export type ApplicationAction = 'edit' | 'submit' | 'assign' | 'review' | 'reveal-sensitive';

export interface BusinessDetails {
  readonly legalName: string;
  readonly tradingName: string;
  readonly businessType: BusinessType | null;
  readonly registrationNumber: string;
  readonly industry: IndustryCategory | null;
  readonly website: string;
  readonly establishedOn: IsoDate | null;
}

export interface ContactDetails {
  readonly contactName: string;
  readonly email: string;
  readonly phone: string;
  readonly addressLine1: string;
  readonly addressLine2: string;
  readonly city: string;
  readonly postalCode: string;
  readonly country: string;
}

export interface OwnerDetails {
  readonly fullName: string;
  readonly title: string;
  readonly ownershipPercentage: number | null;
}

export interface BankingDetails {
  readonly accountHolderName: string;
  readonly bankName: string;
  readonly currency: CurrencyCode | null;
  readonly monthlyVolume: number | null;
  readonly averageTicketSize: number | null;
}

export interface MaskedValue {
  readonly masked: string;
}

export interface OwnerView extends OwnerDetails {
  readonly id: string;
  readonly taxId: MaskedValue | null;
}

export interface BankingView extends BankingDetails {
  readonly iban: MaskedValue | null;
}

export interface ApplicationDataView {
  readonly business: BusinessDetails;
  readonly contact: ContactDetails;
  readonly owners: readonly OwnerView[];
  readonly banking: BankingView;
}

export interface OwnerInput extends OwnerDetails {
  readonly id?: string;
  readonly taxId?: string;
}

export interface BankingInput extends BankingDetails {
  readonly iban?: string;
}

export interface ApplicationDataInput {
  readonly business: BusinessDetails;
  readonly contact: ContactDetails;
  readonly owners: readonly OwnerInput[];
  readonly banking: BankingInput;
}

// History (audit trail + risk decisions)

export type SensitiveFieldRef =
  { readonly field: 'iban' } | { readonly field: 'ownerTaxId'; readonly ownerId: string };

interface ApplicationEventBase {
  readonly id: string;
  readonly at: IsoDateTime;
  readonly actor: UserRef;
}

export type ApplicationEvent =
  | (ApplicationEventBase & { readonly type: 'CREATED' })
  | (ApplicationEventBase & { readonly type: 'SUBMITTED' })
  | (ApplicationEventBase & { readonly type: 'ASSIGNED'; readonly reviewer: UserRef })
  | (ApplicationEventBase & {
      readonly type: 'DECISION';
      readonly decision: ReviewDecision;
      readonly riskLevel: RiskLevel;
      readonly comment: string;
    })
  | (ApplicationEventBase & {
      readonly type: 'SENSITIVE_REVEALED';
      readonly target: SensitiveFieldRef;
    });

export type ApplicationEventType = ApplicationEvent['type'];

// Resources

export interface ApplicationSummary {
  readonly id: string;
  readonly reference: string;
  readonly status: ApplicationStatus;
  readonly legalName: string;
  readonly tradingName: string;
  readonly createdBy: UserRef;
  readonly assignedReviewer: UserRef | null;
  readonly latestRiskLevel: RiskLevel | null;
  readonly updatedAt: IsoDateTime;
  readonly allowedActions: readonly ApplicationAction[];
}

export interface ApplicationDetail {
  readonly id: string;
  readonly reference: string;
  readonly status: ApplicationStatus;
  readonly version: number;
  readonly createdBy: UserRef;
  readonly assignedReviewer: UserRef | null;
  readonly createdAt: IsoDateTime;
  readonly updatedAt: IsoDateTime;
  readonly submittedAt: IsoDateTime | null;
  readonly data: ApplicationDataView;
  readonly history: readonly ApplicationEvent[];
  readonly allowedActions: readonly ApplicationAction[];
}

export type ApplicationStatusCounts = Readonly<Record<ApplicationStatus, number>>;

export type ApplicationSortField = 'updatedAt' | 'legalName' | 'status';

/** Query parameters of `GET /applications`. */
export interface ApplicationListQuery {
  readonly page: number;
  readonly pageSize: number;
  readonly status?: ApplicationStatus;
  readonly search?: string;
  readonly sortBy?: ApplicationSortField;
  readonly sortDirection?: SortDirection;
}

export interface CreateApplicationRequest {
  readonly data: ApplicationDataInput;
}

export interface SaveDraftRequest {
  readonly version: number;
  readonly data: ApplicationDataInput;
}

export interface AssignReviewerRequest {
  readonly reviewerId: string;
}

export interface RecordDecisionRequest {
  readonly decision: ReviewDecision;
  readonly riskLevel: RiskLevel;
  readonly comment: string;
}

export type RevealSensitiveRequest = SensitiveFieldRef;

export interface RevealSensitiveResponse {
  readonly value: string;
}
