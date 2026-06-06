import Cal, { getCalApi } from "@calcom/embed-react";
import { useEffect } from "react";

interface CalEmbedProps {
	/** e.g. "nadiaujovich/sesion-inicial" — from PUBLIC_CALCOM_LINK */
	calLink: string;
}

const TIME_ZONE = "Europe/Madrid";
const NAMESPACE = "mentoria";

export default function CalEmbed({ calLink }: CalEmbedProps) {
	useEffect(() => {
		(async () => {
			// Namespace must match the <Cal namespace> prop below, otherwise the
			// embed initializes a different instance and renders blank.
			const cal = await getCalApi({ namespace: NAMESPACE });
			cal("ui", {
				// Keep it on-brand: light theme, no extra chrome.
				theme: "light",
				hideEventTypeDetails: false,
				layout: "month_view",
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
			namespace={NAMESPACE}
			calLink={calLink}
			config={{ timeZone: TIME_ZONE, layout: "month_view" }}
			style={{
				width: "100%",
				height: "100%",
				minHeight: "600px",
				overflow: "scroll",
			}}
		/>
	);
}
