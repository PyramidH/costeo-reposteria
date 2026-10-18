<script lang="ts">
	import { href as h } from '#lib/ui/href.ts';
</script>

<div class="page guide">
	<div class="row" style="margin-bottom: 16px">
		<a href={h('/')} class="back" aria-label="Volver">
			<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
		</a>
		<h1>Cómo funciona</h1>
	</div>

	<section>
		<h2>La idea</h2>
		<p>Anotas una receta como la tienes en tu cuaderno y la app te dice cuánto te cuesta cada pieza, cuánto te queda de verdad al precio que cobras y cuánto podrías cobrar. No decide por ti: te muestra los números para que decidas tú.</p>
	</section>

	<section>
		<h2>Recetas</h2>
		<p>Cada receta tiene sus ingredientes, cuánto rinde (12 cupcakes, 1 strudel, 10 vasos) y el tiempo que te toma. Con eso sale el <strong>costo por pieza</strong>, que ves abajo mientras escribes.</p>
		<p>Una receta puede usar otra: la masa de hojaldre o la crema pastelera se guardan una vez como <strong>receta base</strong> y luego se agregan a empanadas, strudel o trenza como si fueran un ingrediente más. Si cambias la crema, cambian todas.</p>
		<p>En la pestaña <strong>Costo y precio</strong> puedes activar lo que casi nadie cuenta (tu tiempo, el gas, la merma) y ver cómo cambia el costo. Si pones lo que cobras hoy, te dice cuánto ganas por pieza y a cuánto te sale la hora.</p>
		<p>Con <strong>Preparar</strong> ves los ingredientes con sus cantidades (ajustadas si vas a hacer más o menos) y los pasos uno por uno, para no depender del cuaderno.</p>
	</section>

	<section>
		<h2>Ingredientes</h2>
		<p>Aquí viven tus precios. Cada ingrediente guarda <strong>cómo lo compras y a cuánto</strong>: la libra de harina a Q4.75, el cartón de 30 huevos a Q44. De ahí la app calcula lo que cuesta cada onza o cada huevo que usas.</p>
		<p>Los precios que vienen con la app son <strong>referencias</strong>, no los tuyos. Tócalo y pon lo que pagaste la última vez: si tus precios no son reales, tu costo tampoco. Cuando el huevo sube, lo cambias aquí una vez y todas tus recetas se actualizan; el precio anterior queda guardado en el historial.</p>
	</section>

	<section>
		<h2>Ajustes</h2>
		<p><strong>Margen de ganancia:</strong> de cada quetzal que cobras, qué parte es ganancia. Un 40% es un punto de partida común; cada receta puede tener el suyo.</p>
		<p><strong>Mi hora de trabajo vale:</strong> lo que quieres ganar por hora de trabajo con las manos. Si no sabes, piensa en lo que te pagarían por ese tiempo en otro lado.</p>
		<p><strong>Gas, luz y agua:</strong> lo más simple es sumar un porcentaje de los ingredientes (10 a 15% es lo usual). Si sabes exactamente cuánto gastas al mes, puedes usar el modo avanzado.</p>
		<p><strong>Mi libra pesa:</strong> en el mercado la libra suele ser de 460 g; en el supermercado, de 453.6 g.</p>
		<p><strong>Respaldo:</strong> todo se guarda en tu teléfono y sobrevive a las actualizaciones. Guarda un respaldo para cambiar de teléfono o por tranquilidad.</p>
	</section>

	<section>
		<h2>Tres consejos</h2>
		<ol>
			<li><strong>Precios reales.</strong> Dedica cinco minutos a poner lo que pagas por tus 10 ingredientes más usados. Es lo que más cambia el resultado.</li>
			<li><strong>Tiempo activo.</strong> Cuenta solo el tiempo en que estás trabajando; el horno y el reposo no. Tres horas de strudel suelen ser menos de una hora de manos.</li>
			<li><strong>No subas de golpe.</strong> Si el precio sugerido te parece imposible, no es una orden: mira a cuánto te sale la hora hoy y sube poco a poco. Cada quetzal va directo a tu hora.</li>
		</ol>
	</section>
</div>

<style>
	.back {
		width: 40px;
		height: 40px;
		display: grid;
		place-items: center;
		border-radius: 50%;
		color: var(--ink-2);
		margin-left: -8px;
	}
	.guide section {
		margin-bottom: 28px;
	}
	.guide h2 {
		margin-bottom: 8px;
	}
	.guide p,
	.guide li {
		line-height: 1.55;
		margin-bottom: 10px;
	}
	.guide ol {
		padding-left: 20px;
		margin: 0;
	}
</style>
