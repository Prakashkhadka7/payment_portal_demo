import { HttpErrorResponse } from '@angular/common/http';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { of, throwError } from 'rxjs';
import { createSession } from '../../../../testing/auth-fixtures';
import { Login } from './login';

describe('Login', () => {
  let fixture: ComponentFixture<Login>;
  let element: HTMLElement;
  let router: Router;
  const auth = { login: vi.fn() };

  beforeEach(async () => {
    auth.login.mockReset();
    TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    });
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    fixture = TestBed.createComponent(Login);
    element = fixture.nativeElement;
    await fixture.whenStable();
  });

  const type = (selector: string, value: string): void => {
    const input = element.querySelector<HTMLInputElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };

  const submit = async (): Promise<void> => {
    element.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  };

  const fillValidCredentials = (): void => {
    type('input[autocomplete="username"]', 'sales.test');
    type('input[autocomplete="current-password"]', 'secret-value');
  };

  it('does not call the API and shows field errors when the form is empty', async () => {
    await submit();

    expect(auth.login).not.toHaveBeenCalled();
    expect(element.textContent).toContain('Username is required');
    expect(element.textContent).toContain('Password is required');
  });

  it('signs in and goes to the validated return URL', async () => {
    auth.login.mockReturnValue(of(createSession()));
    fixture.componentRef.setInput('returnUrl', '/applications?status=DRAFT');
    fillValidCredentials();

    await submit();

    expect(auth.login).toHaveBeenCalledWith({ username: 'sales.test', password: 'secret-value' });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/applications?status=DRAFT');
  });

  it('ignores an external return URL', async () => {
    auth.login.mockReturnValue(of(createSession()));
    fixture.componentRef.setInput('returnUrl', 'https://evil.example');
    fillValidCredentials();

    await submit();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
  });

  describe('when the credentials are rejected', () => {
    const passwordInput = (): HTMLInputElement =>
      element.querySelector<HTMLInputElement>('input[autocomplete="current-password"]')!;
    const invalidFields = (): number =>
      element.querySelectorAll('input[aria-invalid="true"]').length;

    beforeEach(async () => {
      auth.login.mockReturnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 401,
              error: { code: 'UNAUTHORIZED', message: 'Invalid username or password' },
            }),
        ),
      );
      fillValidCredentials();
      await submit();
    });

    it('keeps what the user typed and focuses the password to fix it', () => {
      expect(passwordInput().value).toBe('secret-value');
      expect(document.activeElement).toBe(passwordInput());
      expect(router.navigateByUrl).not.toHaveBeenCalled();
    });

    it('flags both fields with one generic message that does not reveal which was wrong', () => {
      expect(invalidFields()).toBe(2);
      expect(element.querySelectorAll('mat-error')).toHaveLength(1);
      expect(element.querySelector('mat-error')?.textContent).toContain(
        'Invalid username or password',
      );
    });

    it('clears the error on both fields as soon as either one is edited', async () => {
      type('input[autocomplete="current-password"]', 'secret-value-2');
      await fixture.whenStable();

      expect(invalidFields()).toBe(0);
      expect(element.querySelector('mat-error')).toBeNull();
    });
  });

  it('shows other failures as a banner without flagging the fields', async () => {
    auth.login.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    fillValidCredentials();

    await submit();

    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      'Unable to reach the server',
    );
    expect(element.querySelectorAll('input[aria-invalid="true"]')).toHaveLength(0);
  });

  it('warns while Caps Lock is on', async () => {
    const event = new KeyboardEvent('keyup', { key: 'A', modifierCapsLock: true });

    element.querySelector('input[autocomplete="current-password"]')!.dispatchEvent(event);
    await fixture.whenStable();

    expect(element.textContent).toContain('Caps Lock is on');
  });

  it('toggles password visibility with an accessible button', async () => {
    const toggle = element.querySelector<HTMLButtonElement>('button[aria-label="Show password"]')!;

    toggle.click();
    await fixture.whenStable();

    expect(
      element.querySelector('input[autocomplete="current-password"]')!.getAttribute('type'),
    ).toBe('text');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
  });
});
