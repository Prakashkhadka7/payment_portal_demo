import { TestBed } from '@angular/core/testing';
import { Skeleton } from './skeleton';

describe('Skeleton', () => {
  it('renders the requested grid of placeholder bars', async () => {
    const fixture = TestBed.createComponent(Skeleton);
    fixture.componentRef.setInput('rows', 3);
    fixture.componentRef.setInput('columns', 5);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelectorAll('.skeleton__row')).toHaveLength(3);
    expect(element.querySelectorAll('.skeleton__bar')).toHaveLength(15);
  });

  it('is hidden from assistive technology', () => {
    const fixture = TestBed.createComponent(Skeleton);

    expect(fixture.nativeElement.getAttribute('aria-hidden')).toBe('true');
  });
});
