import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ApplicationsApi } from '../../data-access/applications.api';
import { REVEAL_DURATION_MS, SensitiveValue } from './sensitive-value';

describe('SensitiveValue', () => {
  const api = { reveal: vi.fn() };
  let fixture: ComponentFixture<SensitiveValue>;
  let element: HTMLElement;

  const render = async (canReveal: boolean): Promise<void> => {
    api.reveal.mockReset().mockReturnValue(of({ value: 'GB82WEST12345698765432' }));
    TestBed.configureTestingModule({ providers: [{ provide: ApplicationsApi, useValue: api }] });
    fixture = TestBed.createComponent(SensitiveValue);
    fixture.componentRef.setInput('applicationId', 'app-1');
    fixture.componentRef.setInput('target', { field: 'iban' });
    fixture.componentRef.setInput('masked', { masked: '•••• 5432' });
    fixture.componentRef.setInput('canReveal', canReveal);
    element = fixture.nativeElement;
    await fixture.whenStable();
  };

  const button = (): HTMLButtonElement | null => element.querySelector('button');

  it('shows only the masked value, with no reveal control, when not permitted', async () => {
    await render(false);

    expect(element.textContent).toContain('•••• 5432');
    expect(button()).toBeNull();
  });

  it('reveals through the audited endpoint and masks again after 30 seconds', async () => {
    await render(true);

    button()!.click();
    fixture.detectChanges();
    expect(api.reveal).toHaveBeenCalledWith('app-1', { field: 'iban' });
    expect(element.textContent).toContain('GB82WEST12345698765432');

    vi.useFakeTimers();
    try {
      button()!.click();
      button()!.click();
      vi.advanceTimersByTime(REVEAL_DURATION_MS);
      fixture.detectChanges();
    } finally {
      vi.useRealTimers();
    }
    expect(element.textContent).toContain('•••• 5432');
    expect(element.textContent).not.toContain('GB82WEST');
  });
});
