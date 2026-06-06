import type { Workshop } from "../data/workshops";

/** Datos canónicos del sitio reutilizados en meta tags y JSON-LD. */
export const SITE = {
	name: "Mermelada Tech",
	description: "Comunidad de mujeres en tecnología",
	defaultOgImage: "/og-image.png",
} as const;

/** Perfiles públicos de Nai / Mermelada Tech (para `sameAs`). */
const SAME_AS = [
	"https://linkedin.com/in/nadiaujovich",
	"https://instagram.com/mermelada.techok",
	"https://discord.gg/HFV4QXJKNh",
];

/** Construye una URL absoluta a partir de un path y el `site` configurado. */
export function absoluteUrl(path: string, site: URL | undefined): string {
	const base = site ?? new URL("https://mermeladatech.com");
	return new URL(path, base).href;
}

/** Schema.org WebSite para la home. */
export function buildWebSiteSchema(site: URL | undefined) {
	return {
		"@context": "https://schema.org",
		"@type": "WebSite",
		name: SITE.name,
		url: absoluteUrl("/", site),
		inLanguage: "es",
		description: SITE.description,
	};
}

/** Schema.org Person para Nai Ujovich. */
export function buildPersonSchema(site: URL | undefined) {
	return {
		"@context": "https://schema.org",
		"@type": "Person",
		name: "Nai Ujovich",
		alternateName: "Nadia Ujovich",
		jobTitle: "Mentora en tecnología",
		description:
			"Mentora para mujeres que crecen en tecnología. Workshops y mentorías 1:1.",
		url: absoluteUrl("/", site),
		knowsAbout: [
			"Mentoría tech",
			"Mujeres en tecnología",
			"Desarrollo de software",
			"Open source",
			"Inteligencia artificial",
		],
		worksFor: {
			"@type": "Organization",
			name: SITE.name,
			url: absoluteUrl("/", site),
		},
		sameAs: SAME_AS,
	};
}

/**
 * Schema.org Event para un workshop.
 * Devuelve `null` si el workshop no tiene `fechaISO` (Google exige fecha ISO 8601).
 */
export function buildEventSchema(workshop: Workshop, site: URL | undefined) {
	if (!workshop.fechaISO) return null;

	const isPresencial = workshop.formato.toLowerCase() === "presencial";

	return {
		"@context": "https://schema.org",
		"@type": "Event",
		name: workshop.titulo,
		description: workshop.descripcion,
		startDate: workshop.fechaISO,
		eventStatus: "https://schema.org/EventScheduled",
		eventAttendanceMode: isPresencial
			? "https://schema.org/OfflineEventAttendanceMode"
			: "https://schema.org/OnlineEventAttendanceMode",
		location: isPresencial
			? { "@type": "Place", name: "Por confirmar" }
			: {
					"@type": "VirtualLocation",
					url: absoluteUrl(`/workshops/${workshop.slug}`, site),
				},
		organizer: {
			"@type": "Organization",
			name: SITE.name,
			url: absoluteUrl("/", site),
		},
		offers: {
			"@type": "Offer",
			price: workshop.esGratis ? 0 : (workshop.precioEUR ?? 0),
			priceCurrency: "EUR",
			availability: "https://schema.org/InStock",
			url: absoluteUrl(`/workshops/${workshop.slug}`, site),
		},
		image: absoluteUrl(workshop.imagen ?? SITE.defaultOgImage, site),
	};
}
