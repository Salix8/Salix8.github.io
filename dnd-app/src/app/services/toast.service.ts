import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  constructor(private snackBar: MatSnackBar) {}

  show(message: string, type: 'success' | 'error' | 'info' = 'success') {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: `toast-${type}`,
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    });
  }
}
