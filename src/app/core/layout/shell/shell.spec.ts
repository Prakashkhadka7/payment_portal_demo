import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { AuthStore } from '@core/auth/auth.store';
import type { Role } from '@contracts';
import { ConfirmDialogService } from '@shared/ui/confirm-dialog/confirm-dialog.service';
import { of } from 'rxjs';
import { createSession } from '../../../../testing/auth-fixtures';
import { Shell } from './shell';

describe('Shell', () => {
  let fixture: ComponentFixture<Shell>;
  const auth = { logout: vi.fn() };
  const confirmDialog = { confirm: vi.fn() };

  const render = async (roles: readonly Role[]): Promise<HTMLElement> => {
    TestBed.configureTestingModule({
      imports: [Shell],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: ConfirmDialogService, useValue: confirmDialog },
      ],
    });
    TestBed.inject(AuthStore).setSession(createSession(roles));
    fixture = TestBed.createComponent(Shell);
    await fixture.whenStable();
    return fixture.nativeElement;
  };

  const navLabels = (element: HTMLElement): string[] =>
    [...element.querySelectorAll('.nav-link__label')].map(
      (title) => title.textContent?.trim() ?? '',
    );

  it('shows the create entry to users who can create applications', async () => {
    const element = await render(['SALES']);

    expect(navLabels(element)).toEqual(['Applications', 'New application']);
  });

  it('hides navigation the user has no permission for', async () => {
    const element = await render(['REVIEWER']);

    expect(navLabels(element)).toEqual(['Applications']);
  });

  it('shows who is signed in and their roles', async () => {
    const element = await render(['SALES', 'REVIEWER']);

    expect(element.querySelector('.user-card__name')?.textContent).toContain(
      'Test SALES + REVIEWER',
    );
    expect(element.querySelector('.user-card__roles')?.textContent).toContain('Sales · Reviewer');
  });

  describe('signing out', () => {
    beforeEach(() => {
      auth.logout.mockReset();
      confirmDialog.confirm.mockReset();
    });

    const clickSignOut = (element: HTMLElement): void =>
      element.querySelector<HTMLButtonElement>('button[aria-label="Sign out"]')!.click();

    it('asks for confirmation and signs out once confirmed', async () => {
      confirmDialog.confirm.mockReturnValue(of(true));
      const element = await render(['ADMIN']);

      clickSignOut(element);

      expect(confirmDialog.confirm).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Sign out?', confirmLabel: 'Sign out' }),
      );
      expect(auth.logout).toHaveBeenCalledTimes(1);
    });

    it('stays signed in when the user cancels', async () => {
      confirmDialog.confirm.mockReturnValue(of(false));
      const element = await render(['ADMIN']);

      clickSignOut(element);

      expect(auth.logout).not.toHaveBeenCalled();
    });
  });
});
