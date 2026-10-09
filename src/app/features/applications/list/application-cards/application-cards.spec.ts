import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { createSummary } from '../../../../../testing/application-fixtures';
import { ApplicationCards } from './application-cards';

describe('ApplicationCards', () => {
  it('shows only the fields allowed for the role and the edit link only when permitted', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(ApplicationCards);
    fixture.componentRef.setInput('items', [
      createSummary({ id: 'app-0001', status: 'DRAFT', allowedActions: ['edit'] }),
      createSummary({ id: 'app-0002' }),
    ]);
    fixture.componentRef.setInput('columns', ['reference', 'merchant', 'status', 'reviewer']);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelectorAll('li.card')).toHaveLength(2);
    expect(element.textContent).toContain('Reviewer');
    expect(element.textContent).not.toContain('Submitted by');
    expect(element.querySelectorAll('a.card__edit')).toHaveLength(1);
  });
});
