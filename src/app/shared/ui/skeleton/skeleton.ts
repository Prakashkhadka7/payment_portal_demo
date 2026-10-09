import { Component, computed, input } from '@angular/core';

/**
 * Shimmering placeholder rows shown while content loads, so the layout does not jump. Purely
 * decorative: announce loading via the surrounding region (`aria-busy`) or a live region.
 */
@Component({
  selector: 'app-skeleton',
  template: `
    @for (row of rowIndexes(); track row) {
      <div class="skeleton__row">
        @for (column of columnIndexes(); track column) {
          <span class="skeleton__bar"></span>
        }
      </div>
    }
  `,
  styleUrl: './skeleton.scss',
  host: { 'aria-hidden': 'true' },
})
export class Skeleton {
  readonly rows = input(5);
  readonly columns = input(4);
  protected readonly rowIndexes = computed(() => Array.from({ length: this.rows() }, (_, i) => i));
  protected readonly columnIndexes = computed(() =>
    Array.from({ length: this.columns() }, (_, i) => i),
  );
}
