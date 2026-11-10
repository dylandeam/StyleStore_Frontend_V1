import { describe, expect, it } from 'vitest';
import { normalizarRecibo } from './mis-pagos.component';

describe('normalizarRecibo', () => {
  it('conserva el total válido informado por la API', () => {
    expect(normalizarRecibo({ total: 215, monto: 200, items: [{ subtotal: 200 }] }).total).toBe(215);
  });

  it('usa el monto cobrado cuando una orden histórica tiene total cero', () => {
    expect(normalizarRecibo({ total: 0, monto: '200.00', items: [{ subtotal: 200 }] }).total).toBe(200);
  });

  it('reconstruye el total desde las líneas cuando API y pago están en cero', () => {
    const recibo = normalizarRecibo({
      total: 0,
      monto: 0,
      items: [
        { cantidad: 2, precio_unitario: 85, subtotal: 170 },
        { cantidad: 1, precio_unitario: 30, subtotal: null },
      ],
    });

    expect(recibo.total).toBe(200);
  });
});
