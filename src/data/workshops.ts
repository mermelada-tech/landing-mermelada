export interface Workshop {
	slug: string;
	titulo: string;
	subtitulo: string;
	descripcion: string;
	fecha: string; // puede ser "Por definir"
	formato: string; // "Virtual" | "Online" | "Presencial"
	duracion: string;
	colaboracion?: string;
	esGratis: boolean;
	precioEUR?: number;
	/** Stripe Price ID (modo test). Pegalo desde el Dashboard — ver SETUP.md. */
	stripePriceId?: string;
	queAprenderas: string[];
	cupoMaximo?: number;
	/** Muestra "Anotarme a la lista de espera" en lugar del CTA normal. */
	waitlistMode?: boolean;
}

export const workshops: Workshop[] = [
	{
		slug: "manual-supervivencia-ia",
		titulo: "Manual de Supervivencia: Dev en la Era de la IA",
		subtitulo: "Datos reales, sin hype.",
		descripcion:
			"Una mirada honesta a cómo está cambiando el trabajo dev con la IA y cómo posicionarte sin que el ruido te paralice.",
		fecha: "18 de junio",
		formato: "Virtual",
		duracion: "2.5 horas",
		colaboracion: "En colaboración con The Bridge",
		esGratis: true,
		waitlistMode: true,
		queAprenderas: [
			"La realidad del mercado (datos reales, sin hype)",
			"5 mitos desmontados sobre IA",
			"Las herramientas que necesitás (Copilot, Claude, Perplexity, etc.)",
			"Cómo posicionarte sin síndrome impostor",
			"Plan de 7 días para empezar a experimentar",
		],
	},
	{
		slug: "open-source-sin-sindrome-impostor",
		titulo: "Open Source Opportunities: Contribuir sin Síndrome Impostor",
		subtitulo: "Tu primera PR, en vivo.",
		descripcion:
			"Un taller práctico para dar el salto a open source: encontrar proyectos, entender el flujo de contribución y mandar tu primera PR.",
		fecha: "Por definir",
		formato: "Online",
		duracion: "2 horas",
		esGratis: false,
		precioEUR: 45,
		stripePriceId: "price_1TcOiqA69jSFK1Crv5zVG2U3",
		queAprenderas: [
			"Verdades sobre mujeres en open source (9.8% de contributors)",
			"Búsqueda inteligente de proyectos",
			"Flujo de contribución paso a paso",
			"Tu primera PR en vivo",
			"Comunidades amigas + networking",
		],
	},
];

export function getWorkshop(slug: string): Workshop | undefined {
	return workshops.find((w) => w.slug === slug);
}
