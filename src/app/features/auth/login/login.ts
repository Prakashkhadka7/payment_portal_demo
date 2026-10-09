import {
  Component,
  DestroyRef,
  type ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { safeReturnUrl } from '@core/auth/return-url';
import { toApiError } from '@core/http/api-error';
import { finalize } from 'rxjs';

/** Control error set on both fields when the server rejects the credentials. */
const INVALID_CREDENTIALS = 'invalidCredentials';

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  /** Bound from the `returnUrl` query parameter; validated before use. */
  readonly returnUrl = input<string>();

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly passwordInput = viewChild<ElementRef<HTMLInputElement>>('passwordInput');

  protected readonly form = inject(NonNullableFormBuilder).group({
    username: ['', [Validators.required, Validators.maxLength(100)]],
    password: ['', [Validators.required, Validators.maxLength(200)]],
  });
  protected readonly invalidCredentials = INVALID_CREDENTIALS;
  protected readonly submitting = signal(false);
  /** Failures unrelated to the fields (network, rate limit, outage), shown as a banner. */
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly passwordVisible = signal(false);
  protected readonly capsLockOn = signal(false);

  constructor() {
    // Editing either field means the user is correcting the rejected pair: clear the error on
    // both, otherwise fixing only the password would leave the username flagged.
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.clearCredentialsError());
  }

  protected togglePasswordVisibility(): void {
    this.passwordVisible.update((visible) => !visible);
  }

  /** Mistyped passwords are most often caused by Caps Lock, so warn while it is on. */
  protected detectCapsLock(event: KeyboardEvent): void {
    this.capsLockOn.set(event.getModifierState('CapsLock'));
  }

  protected submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.errorMessage.set(null);

    this.auth
      .login(this.form.getRawValue())
      .pipe(
        finalize(() => this.submitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => void this.router.navigateByUrl(safeReturnUrl(this.returnUrl())),
        error: (error: unknown) => this.handleLoginError(error),
      });
  }

  /**
   * Keeps what the user typed so a typo can be fixed rather than retyped. The message stays
   * generic ("username or password") so it never reveals whether an account exists.
   */
  private handleLoginError(error: unknown): void {
    const apiError = toApiError(error);
    if (apiError.code !== 'UNAUTHORIZED') {
      this.errorMessage.set(apiError.message);
      return;
    }
    const { username, password } = this.form.controls;
    username.setErrors({ [INVALID_CREDENTIALS]: true });
    password.setErrors({ [INVALID_CREDENTIALS]: true });
    this.form.markAllAsTouched();
    this.focusPasswordAtEnd();
  }

  private clearCredentialsError(): void {
    Object.values(this.form.controls)
      .filter((control) => control.hasError(INVALID_CREDENTIALS))
      .forEach((control) => control.updateValueAndValidity({ emitEvent: false }));
  }

  private focusPasswordAtEnd(): void {
    const input = this.passwordInput()?.nativeElement;
    if (input) {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
  }
}
