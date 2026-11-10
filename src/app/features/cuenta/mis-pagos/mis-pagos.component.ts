import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { PagosService } from '../../../core/services/pagos.service';

export interface ReciboItem {
  cantidad?: number | string | null;
  precio_unitario?: number | string | null;
  subtotal?: number | string | null;
  [key: string]: unknown;
}

export interface ReciboPago {
  total?: number | string | null;
  monto?: number | string | null;
  items?: ReciboItem[] | null;
  [key: string]: unknown;
}

function importe(value: unknown): number {
  const parsed = typeof value === 'string' ? Number(value.replace(',', '.')) : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Mantiene el comprobante correcto aun si una orden histórica guardó total cero. */
export function normalizarRecibo(recibo: ReciboPago): ReciboPago {
  const items = Array.isArray(recibo.items) ? recibo.items : [];
  const totalLineas = items.reduce((total, item) => {
    const subtotal = importe(item.subtotal);
    return total + (subtotal > 0
      ? subtotal
      : importe(item.cantidad) * importe(item.precio_unitario));
  }, 0);
  const totalApi = importe(recibo.total);
  const montoPago = importe(recibo.monto);

  return {
    ...recibo,
    items,
    total: totalApi > 0 ? totalApi : (montoPago > 0 ? montoPago : totalLineas),
  };
}

@Component({
  selector: 'app-mis-pagos',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './mis-pagos.component.html',
  styleUrls: ['./mis-pagos.component.css'],
})
export class MisPagosComponent implements OnInit {
  private pagosService = inject(PagosService);
  private cdr = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);
  private reciboPendiente = Number(this.route.snapshot.queryParamMap.get('recibo')) || null;

  loading = true;
  pagos: any[] = [];
  selectedRecibo: any = null;
  loadingRecibo = false;
  showReciboModal = false;

  ngOnInit(): void {
    this.cargarPagos();
  }

  cargarPagos(): void {
    this.loading = true;
    this.cdr.markForCheck();

    this.pagosService.getMisPagos().subscribe({
      next: (data) => {
        this.pagos = data || [];
        this.loading = false;
        if (this.reciboPendiente && this.pagos.some((p) => p.id === this.reciboPendiente)) {
          const pagoId = this.reciboPendiente;
          this.reciboPendiente = null;
          this.verRecibo(pagoId);
        }
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al cargar pagos:', err);
        this.loading = false;
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
    });
  }

  verRecibo(pagoId: number): void {
    this.loadingRecibo = true;
    this.showReciboModal = true;
    this.cdr.markForCheck();

    this.pagosService.getRecibo(pagoId).subscribe({
      next: (recibo) => {
        this.selectedRecibo = normalizarRecibo(recibo);
        this.loadingRecibo = false;
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al cargar recibo:', err);
        this.loadingRecibo = false;
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
    });
  }

  cerrarRecibo(): void {
    this.showReciboModal = false;
    this.selectedRecibo = null;
    this.cdr.markForCheck();
  }

  imprimirRecibo(): void {
    window.print();
  }
}
