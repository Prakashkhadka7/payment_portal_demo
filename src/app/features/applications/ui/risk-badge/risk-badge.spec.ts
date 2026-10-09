import { TestBed } from '@angular/core/testing';
import type { RiskLevel } from '@contracts';
import { RiskBadge } from './risk-badge';

describe('RiskBadge', () => {
  const render = async (level: RiskLevel | null): Promise<HTMLElement> => {
    const fixture = TestBed.createComponent(RiskBadge);
    fixture.componentRef.setInput('level', level);
    await fixture.whenStable();
    return fixture.nativeElement;
  };

  it('shows the risk level as text, with decorative bars', async () => {
    const element = await render('HIGH');

    expect(element.textContent?.trim()).toBe('High');
    expect(element.querySelector('.risk--high')).not.toBeNull();
    expect(element.querySelector('.risk__bars')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('shows an accessible placeholder when no decision exists yet', async () => {
    const element = await render(null);

    expect(element.querySelector('[aria-label="No risk decision yet"]')).not.toBeNull();
  });
});
