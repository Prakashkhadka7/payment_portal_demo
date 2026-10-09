import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { map, type Observable } from 'rxjs';
import { ConfirmDialog } from './confirm-dialog';
import type { ConfirmDialogData } from './confirm-dialog.model';

/** Opens a confirmation dialog and reports the user's choice. */
@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  private readonly dialog = inject(MatDialog);

  confirm(data: ConfirmDialogData): Observable<boolean> {
    return this.dialog
      .open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
        data,
        role: 'alertdialog',
        width: '420px',
        maxWidth: 'calc(100vw - 32px)',
        autoFocus: data.tone === 'danger' ? '.confirm__cancel' : '.confirm__confirm',
      })
      .afterClosed()
      .pipe(map((confirmed) => confirmed === true));
  }
}
