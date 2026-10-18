import { resolve } from '$app/paths';

// `resolve` tiene tipos estrictos por ruta; aquí lo usamos como función de pathnames.
const resolveAny = resolve as unknown as (path: string) => string;

/** Prefija una ruta interna con `paths.base` (GitHub Pages sirve bajo /<repo>). */
export function href(path: string): string {
	return resolveAny(path.replace(/^\//, ''));
}

/** Prefijo actual de la app ('' o '/<repo>'). */
export const basePrefix = resolveAny('/').replace(/\/$/, '');
