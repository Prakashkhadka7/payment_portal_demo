import type { ApplicationRecord } from './application.record.ts';

/** In-memory store. Swappable for a real database behind the same interface. */
export class ApplicationRepository {
  private readonly records = new Map<string, ApplicationRecord>();
  private sequence: number;

  constructor(seed: readonly ApplicationRecord[]) {
    seed.forEach((record) => this.records.set(record.id, record));
    this.sequence = seed.length;
  }

  all(): ApplicationRecord[] {
    return [...this.records.values()];
  }

  findById(id: string): ApplicationRecord | undefined {
    return this.records.get(id);
  }

  save(record: ApplicationRecord): ApplicationRecord {
    this.records.set(record.id, record);
    return record;
  }

  nextReference(year: number): string {
    this.sequence += 1;
    return `MA-${year}-${String(this.sequence).padStart(4, '0')}`;
  }
}
