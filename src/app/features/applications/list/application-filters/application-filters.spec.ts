import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { ApplicationFilters, SEARCH_DEBOUNCE_MS } from './application-filters';

describe('ApplicationFilters', () => {
  let fixture: ComponentFixture<ApplicationFilters>;
  let element: HTMLElement;
  let searches: string[];

  // Render with real timers (Angular's scheduler needs them), then fake time only where the
  // debounce is being measured.
  beforeEach(async () => {
    fixture = TestBed.createComponent(ApplicationFilters);
    element = fixture.nativeElement;
    searches = [];
    fixture.componentInstance.searchChange.subscribe((value) => searches.push(value));
    await fixture.whenStable();
  });

  afterEach(() => vi.useRealTimers());

  const searchInput = (): HTMLInputElement => element.querySelector('input[type="search"]')!;
  const typeSearch = (value: string): void => {
    searchInput().value = value;
    searchInput().dispatchEvent(new Event('input'));
  };

  it('emits the search only after the user pauses typing', () => {
    vi.useFakeTimers();
    typeSearch('ev');
    vi.advanceTimersByTime(100);
    typeSearch('ever');
    vi.advanceTimersByTime(100);
    typeSearch('everest ');

    expect(searches).toEqual([]);

    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);

    expect(searches).toEqual(['everest']);
  });

  it('does not emit again when the trimmed text has not changed', () => {
    vi.useFakeTimers();
    typeSearch('koshi');
    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    typeSearch('koshi  ');
    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);

    expect(searches).toEqual(['koshi']);
  });

  it('reflects a search set from outside (e.g. back navigation) without emitting', async () => {
    fixture.componentRef.setInput('search', 'rara');
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, SEARCH_DEBOUNCE_MS + 50));

    expect(searchInput().value).toBe('rara');
    expect(searches).toEqual([]);
  });

  it('offers "Clear filters" only while filters are active', async () => {
    expect(element.textContent).not.toContain('Clear filters');

    fixture.componentRef.setInput('hasActiveFilters', true);
    await fixture.whenStable();

    expect(element.textContent).toContain('Clear filters');
  });
});
