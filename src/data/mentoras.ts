import { links } from "./links";

export interface Mentora {
	id: "nadia" | "sol" | "zulema";
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
		role: "Founder · Mentora · España 🇪🇸",
		bio: "Fundó Mermelada para que ninguna entre sola al mundo tech. Mentorea en primeros pasos, portfolio y primera búsqueda laboral.",
		tags: ["Primeros pasos", "Portfolio", "Empleabilidad"],
		photo: "/founder-nadia.jpg",
		link: { label: "→ nadiaujovich.dev", href: "https://nadiaujovich.dev" },
	},
	{
		id: "sol",
		name: "Solange Guerrero",
		short: "Sol",
		role: "Mentora · Aliada LATAM · Argentina 🇦🇷 · AI & Data Engineer",
		bio: "Construye sistemas de IA y pipelines de datos en producción (AWS, GCP). Mentorea en Data, IA aplicada y cómo pasar de analista a engineer.",
		tags: ["Data Engineering", "IA / LLMs", "Python · SQL", "Cloud"],
		photo: "/mentora-sol.jpg",
		link: { label: "→ solangeguerrero.com.ar", href: links.solSite },
	},
	{
		id: "zulema",
		name: "Zulema Rodriguez",
		short: "Zulema",
		role: "Mentora · Aliada LATAM · Argentina 🇦🇷 · Frontend",
		bio: "Estudiante de la Tecnicatura en Programación de la UTN. Experiencia práctica en desarrollo web, sobre todo Frontend, y conocimientos de Python, Java y SQL. Mentorea en primeros pasos y en acompañar a otras personas en su camino en tech.",
		tags: ["Frontend", "Primeros pasos", "Python · SQL"],
		photo: "/mentora-zulema.jpg",
		link: { label: "→ LinkedIn", href: "https://www.linkedin.com/in/zulema-eliana-rodriguez" },
	},
];
