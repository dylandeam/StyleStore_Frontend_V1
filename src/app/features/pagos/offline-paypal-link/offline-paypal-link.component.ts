import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  OfflineCheckoutPreview,
  PagosService,
} from '../../../core/services/pagos.service';

@Component({
  selector: 'app-offline-paypal-link',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './offline-paypal-link.component.html',
  styleUrls: ['./offline-paypal-link.component.css'],
})
export class OfflinePaypalLinkComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private pagos = inject(PagosService);

  readonly preview = signal<OfflineCheckoutPreview | null>(null);
  readonly loading = signal(true);
  readonly processing = signal(false);
  readonly error = signal<string | null>(null);
  readonly canceled = signal(false);
  private token = '';

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') || '';
    this.canceled.set(this.route.snapshot.queryParamMap.get('cancelado') === '1');
    if (!this.token) {
      this.loading.set(false);
      this.error.set('El enlace de compra está incompleto.');
      return;
    }
    this.pagos.getOfflineCheckout(this.token).subscribe({
      next: (preview) => {
        this.preview.set(preview);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.error.set(error?.error?.detail || 'No pudimos validar este enlace de compra.');
      },
    });
  }

  pagar(): void {
    if (!this.token || this.processing()) return;
    this.processing.set(true);
    this.error.set(null);
    this.pagos.crearOrdenOfflinePayPal(this.token).subscribe({
      next: (response) => window.location.assign(response.approve_url),
      error: (error) => {
        this.processing.set(false);
        this.error.set(error?.error?.detail || 'No se pudo iniciar PayPal. Intenta nuevamente.');
      },
    });
  }

  get canPay(): boolean {
    return ['preparado', 'pendiente'].includes(this.preview()?.estado || '');
  }
}
