import { TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import type { ConfirmDialogData } from './confirm-dialog.model';
import { ConfirmDialogService } from './confirm-dialog.service';

describe('ConfirmDialogService', () => {
  let service: ConfirmDialogService;

  const DATA: ConfirmDialogData = {
    title: 'Sign out?',
    message: 'You will need to sign in again.',
    confirmLabel: 'Sign out',
    icon: 'logout',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } }],
    });
    service = TestBed.inject(ConfirmDialogService);
  });

  /** Opens the dialog and resolves with the choice once it closes. */
  const open = async (data: ConfirmDialogData = DATA) => {
    let result: boolean | undefined;
    service.confirm(data).subscribe((choice) => (result = choice));
    TestBed.tick();
    await settle();
    return { result: () => result };
  };

  const settle = async (): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve));
    TestBed.tick();
  };

  const button = (selector: string): HTMLButtonElement =>
    document.querySelector<HTMLButtonElement>(selector)!;

  it('renders the title, message and action labels as an alert dialog', async () => {
    await open();

    const dialog = document.querySelector('[role="alertdialog"]');
    expect(dialog?.textContent).toContain('Sign out?');
    expect(dialog?.textContent).toContain('You will need to sign in again.');
    expect(button('.confirm__confirm').textContent).toContain('Sign out');
    expect(button('.confirm__cancel').textContent).toContain('Cancel');
  });

  it('emits true when the user confirms', async () => {
    const { result } = await open();

    button('.confirm__confirm').click();
    await settle();

    expect(result()).toBe(true);
  });

  it('emits false when the user cancels', async () => {
    const { result } = await open();

    button('.confirm__cancel').click();
    await settle();

    expect(result()).toBe(false);
  });

  it('emits false when dismissed with Escape', async () => {
    const { result } = await open();

    // Real browsers also set the legacy keyCode, which the CDK overlay checks.
    const escape = new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true });
    document.querySelector('[role="alertdialog"]')!.dispatchEvent(escape);
    await settle();

    expect(result()).toBe(false);
  });

  it('focuses Cancel first for dangerous actions', async () => {
    await open({ ...DATA, tone: 'danger' });

    expect(document.activeElement).toBe(button('.confirm__cancel'));
  });
});
