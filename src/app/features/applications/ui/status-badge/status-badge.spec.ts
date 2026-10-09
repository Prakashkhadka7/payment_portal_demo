import { TestBed } from '@angular/core/testing';
import type { ApplicationStatus } from '@contracts';
import { StatusBadge } from './status-badge';

describe('StatusBadge', () => {
  const render = async (status: ApplicationStatus): Promise<HTMLElement> => {
    const fixture = TestBed.createComponent(StatusBadge);
    fixture.componentRef.setInput('status', status);
    await fixture.whenStable();
    return fixture.nativeElement;
  };

  it.each<[ApplicationStatus, string]>([
    ['DRAFT', 'Draft'],
    ['SUBMITTED', 'Submitted'],
    ['IN_REVIEW', 'In review'],
    ['APPROVED', 'Approved'],
    ['REJECTED', 'Rejected'],
  ])('shows %s as the readable label "%s"', async (status, label) => {
    const element = await render(status);

    expect(element.textContent?.trim()).toBe(label);
  });

  it('applies a status-specific style and keeps the colour dot decorative', async () => {
    const element = await render('IN_REVIEW');

    expect(element.classList).toContain('badge--in_review');
    expect(element.querySelector('.badge__dot')?.getAttribute('aria-hidden')).toBe('true');
  });
});
