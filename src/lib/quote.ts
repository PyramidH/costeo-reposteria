import type { Business, Quote } from '#lib/db';
import { formatMoney, CURRENCIES, roundCents } from '#lib/costing';

const norm = (x: string) => x.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export function quoteDeposit(q: Pick<Quote, 'totalCents' | 'depositPct'>): number {
	return roundCents(q.totalCents * (q.depositPct / 100));
}

export function formatDate(iso: string): string {
	const d = new Date(iso + 'T12:00:00');
	return d.toLocaleDateString('es-GT', { weekday: 'long', day: 'numeric', month: 'long' });
}

/** Texto de la cotización listo para WhatsApp (negritas con *asteriscos*). */
export function quoteText(q: Omit<Quote, 'businessId' | 'updatedAt' | 'deletedAt'>, b: Business): string {
	const cur = CURRENCIES[b.currency] ?? CURRENCIES.GTQ;
	const m = (c: number) => formatMoney(c, cur);
	const out: string[] = [];
	out.push(`*${b.name}*`);
	out.push(q.client ? `Cotización para ${q.client}` : 'Cotización');
	out.push('');
	for (const l of q.lines) {
		const sub = l.qty * l.unitPriceCents;
		// "24 cupcakes de Cupcakes de vainilla" → "24 Cupcakes de vainilla"
		const unitInName = norm(l.name).includes(norm(l.unitName).replace(/s$/, ''));
		const what = unitInName ? l.name : `${l.unitName} de ${l.name}`;
		out.push(l.qty === 1 ? `• ${l.name} — ${m(sub)}` : `• ${l.qty} ${what} — ${m(l.unitPriceCents)} c/u = ${m(sub)}`);
	}
	out.push('');
	out.push(`*Total: ${m(q.totalCents)}*`);
	if (q.depositPct > 0) out.push(`Anticipo (${q.depositPct}%): ${m(quoteDeposit(q))}`);
	if (q.deliveryDate) out.push(`Entrega: ${formatDate(q.deliveryDate)}`);
	if (q.notes?.trim()) {
		out.push('');
		out.push(q.notes.trim());
	}
	out.push('');
	out.push('¡Gracias por tu pedido!');
	if (b.contact?.trim()) out.push(b.contact.trim());
	return out.join('\n');
}

export function whatsappShareUrl(text: string): string {
	return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
