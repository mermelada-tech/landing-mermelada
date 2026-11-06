import { links } from "./links";

export interface Mentora {
	id: "nadia" | "sol";
	name: string;
	short: string;
	role: string;
	bio: string;
	tags: string[];
	photo: string;
	link: { label: string; href: string };
}

export const mentoras: Mentora[] = [
	{
		id: "nadia",
		name: "Nadia Ujovich",
		short: "Nadia",
		role: "Founder · Mentora · Argentina 🇦🇷",
		bio: "Fundó Mermelada para que ninguna entre sola al mundo tech. Mentorea en primeros pasos, portfolio y primera búsqueda laboral.",
		tags: ["Primeros pasos", "Portfolio", "Empleabilidad"],
		photo: "/founder-nadia.jpg",
		link: { label: "→ LinkedIn", href: links.nadiaLinkedin },
	},
	{
		id: "sol",
		name: "Solange Guerrero",
		short: "Sol",
		role: "Mentora · Aliada LATAM · AI & Data Engineer",
		bio: "Construye sistemas de IA y pipelines de datos en producción (AWS, GCP). Mentorea en Data, IA aplicada y cómo pasar de analista a engineer.",
		tags: ["Data Engineering", "IA / LLMs", "Python · SQL", "Cloud"],
		photo: "/mentora-sol.jpg",
		link: { label: "→ solangeguerrero.com.ar", href: links.solSite },
	},
];
