import { Injectable, inject } from '@angular/core';
import { catchError, concatMap, forkJoin, from, map, mergeMap, of, tap, toArray } from 'rxjs';
import { CarritoService, CatalogoItem } from './carrito.service';
import { SucursalService } from './sucursal.service';

@Injectable({ providedIn: 'root' })
export class OfflinePrefetchService {
  private readonly sucursales = inject(SucursalService);
  private readonly catalogo = inject(CarritoService);
  private running = false;

  warmUp() {
    if (this.running || !navigator.onLine) return of(undefined);
    this.running = true;
    return this.sucursales.getSucursales(true).pipe(
      concatMap((branches) => forkJoin([
        this.catalogo.getCatalogo().pipe(catchError(() => of([] as CatalogoItem[]))),
        ...branches.map((branch) => this.catalogo.getCatalogo({ sucursal_id: branch.id })
          .pipe(catchError(() => of([] as CatalogoItem[]))))
      ])),
      map((catalogs) => {
        const products = new Map<string, CatalogoItem>();
        catalogs.flat().forEach((item) => products.set(item.codigo, item));
        return [...products.values()];
      }),
      concatMap((products) => from(products).pipe(
        mergeMap((product) => this.catalogo.getProductoDetalle(product.codigo).pipe(
          catchError(() => of(null)),
          tap(() => this.prefetchImages(product)),
        ), 3),
        toArray(),
      )),
      map(() => undefined),
      tap({ finalize: () => { this.running = false; } }),
      catchError(() => {
        this.running = false;
        return of(undefined);
      }),
    );
  }

  private prefetchImages(product: CatalogoItem): void {
    const raw = product as unknown as Record<string, unknown>;
    ['foto', 'foto_trasera', 'foto_vestidor_frontal', 'foto_vestidor_trasera']
      .map((key) => raw[key])
      .filter((value): value is string => typeof value === 'string' && value.length > 0)
      .forEach((url) => { const image = new Image(); image.src = url; });
  }
}
