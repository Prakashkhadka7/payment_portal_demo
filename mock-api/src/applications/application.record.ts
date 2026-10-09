import type {
  ApplicationEvent,
  ApplicationStatus,
  BankingDetails,
  BusinessDetails,
  ContactDetails,
  IsoDateTime,
  OwnerDetails,
} from '../../../contracts/index.ts';

/** Server-side storage shapes. Unlike the API read model they hold sensitive values in clear. */

export interface OwnerRecord extends OwnerDetails {
  readonly id: string;
  /** Empty string when not provided yet. */
  readonly taxId: string;
}

export interface BankingRecord extends BankingDetails {
  /** Normalised (upper-case, no spaces). Empty string when not provided yet. */
  readonly iban: string;
}

export interface ApplicationDataRecord {
  readonly business: BusinessDetails;
  readonly contact: ContactDetails;
  readonly owners: readonly OwnerRecord[];
  readonly banking: BankingRecord;
}

export interface ApplicationRecord {
  readonly id: string;
  readonly reference: string;
  readonly status: ApplicationStatus;
  readonly version: number;
  readonly createdById: string;
  readonly assignedReviewerId: string | null;
  readonly createdAt: IsoDateTime;
  readonly updatedAt: IsoDateTime;
  readonly submittedAt: IsoDateTime | null;
  readonly data: ApplicationDataRecord;
  readonly history: readonly ApplicationEvent[];
}
