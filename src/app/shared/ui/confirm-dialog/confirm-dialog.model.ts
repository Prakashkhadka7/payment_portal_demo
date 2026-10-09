/** Options for a confirmation dialog. */
export interface ConfirmDialogData {
  readonly title: string;
  readonly message: string;
  readonly confirmLabel?: string;
  readonly cancelLabel?: string;
  readonly icon?: string;
  readonly tone?: 'default' | 'danger';
}
