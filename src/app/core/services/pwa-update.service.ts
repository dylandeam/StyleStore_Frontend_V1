import { Injectable, inject } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';
import { OfflineStateService } from './offline-state.service';

@Injectable({ providedIn: 'root' })
export class PwaUpdateService {
  private readonly updates = inject(SwUpdate, { optional: true });
  private readonly state = inject(OfflineStateService);
  private updateCheckTimer?: ReturnType<typeof setInterval>;
  private applyingUpdate = false;
  private initialized = false;

  initialize(): void {
    if (!this.updates?.isEnabled || this.initialized) return;
    this.initialized = true;
    this.updates.versionUpdates
      .pipe(filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY'))
      .subscribe(() => {
        this.state.updateAvailable.set(true);
        this.applyAutomaticallyWhenSafe();
      });

    // Angular comprueba versiones periódicamente, pero una PWA que queda
    // abierta varios días necesita comprobar también al iniciar y al volver
    // a primer plano. Así no conserva rutas o botones de una compilación vieja.
    setTimeout(() => void this.checkForUpdate(), 1200);
    this.updateCheckTimer = setInterval(() => void this.checkForUpdate(), 5 * 60 * 1000);
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', this.handleForeground);
      document.addEventListener('visibilitychange', this.handleVisibility);
    }
  }

  async activate(): Promise<void> {
    if (!this.updates?.isEnabled || this.applyingUpdate) return;
    this.applyingUpdate = true;
    await this.updates.activateUpdate();
    document.location.reload();
  }

  private readonly handleForeground = (): void => {
    void this.checkForUpdate();
  };

  private readonly handleVisibility = (): void => {
    if (document.visibilityState === 'visible') void this.checkForUpdate();
  };

  private async checkForUpdate(): Promise<void> {
    if (!this.updates?.isEnabled || !this.state.online() || this.applyingUpdate) return;
    try {
      await this.updates.checkForUpdate();
    } catch {
      // La comprobación no debe interrumpir el uso ni el modo offline.
    }
  }

  private applyAutomaticallyWhenSafe(): void {
    if (!this.state.online() || this.state.pendingOperations() > 0) return;
    const editing = typeof document !== 'undefined'
      && document.activeElement instanceof HTMLElement
      && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);
    if (!editing) void this.activate();
  }
}
