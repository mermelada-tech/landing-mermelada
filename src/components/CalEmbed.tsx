import Cal, { getCalApi } from "@calcom/embed-react";
import { useEffect } from "react";

interface CalEmbedProps {
	/** e.g. "nadiaujovich/sesion-inicial" — from PUBLIC_CALCOM_LINK */
	calLink: string;
}

const TIME_ZONE = "Europe/Madrid";

export default function CalEmbed({ calLink }: CalEmbedProps) {
	useEffect(() => {
		(async () => {
			const cal = await getCalApi();
			cal("ui", {
				// Keep it on-brand: light theme, no extra chrome.
				theme: "light",
				hideEventTypeDetails: false,
				cssVarsPerTheme: {
					light: { "cal-brand": "#673773" },
					dark: { "cal-brand": "#673773" },
				},
			});
		})();
	}, []);

	if (!calLink) {
		return (
			<p className="text-merme-black/70 text-center p-8">
				Configurá <code>PUBLIC_CALCOM_LINK</code> para mostrar el calendario.
			</p>
		);
	}

	return (
		<Cal
			calLink={calLink}
			config={{ timeZone: TIME_ZONE, layout: "month_view" }}
			style={{ width: "100%", height: "100%", overflow: "scroll" }}
		/>
	);
}
