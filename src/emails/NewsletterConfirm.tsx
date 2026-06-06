import {
	Body,
	Button,
	Container,
	Head,
	Hr,
	Html,
	Link,
	Preview,
	Section,
	Text,
} from "@react-email/components";

export interface NewsletterConfirmProps {
	/** URL absoluta de confirmación (https://.../api/newsletter/confirm?token=...). */
	confirmUrl: string;
}

const COLOR = {
	purple: "#673773",
	sunflower: "#f5c43e",
	paper: "#e6f2f7",
	black: "#1b1b1b",
	white: "#ffffff",
	muted: "#666666",
} as const;

const FONT_HEADING =
	"'Archivo', 'Helvetica Neue', Helvetica, Arial, sans-serif";
const FONT_BODY = "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif";

export function NewsletterConfirm({ confirmUrl }: NewsletterConfirmProps) {
	return (
		<Html lang="es">
			<Head />
			<Preview>
				Confirmá tu suscripción al newsletter de Mermelada Tech 🍓
			</Preview>
			<Body style={body}>
				<Container style={card}>
					<Text style={emoji}>🍓</Text>
					<Text style={heading}>Confirmá tu suscripción</Text>

					<Text style={paragraph}>¡Hola!</Text>
					<Text style={paragraph}>
						Gracias por sumarte al newsletter de Mermelada Tech. Solo falta un
						paso: confirmá que este es tu email tocando el botón.
					</Text>

					<Section style={buttonWrap}>
						<Button href={confirmUrl} style={button}>
							Confirmar suscripción →
						</Button>
					</Section>

					<Text style={paragraph}>
						Si no fuiste vos, ignorá este mail y no pasa nada.
					</Text>

					<Hr style={hr} />
					<Text style={footer}>
						Mermelada Tech ·{" "}
						<Link href="https://mermeladatech.com" style={footerLink}>
							mermeladatech.com
						</Link>
						<br />
						Recibís este mail porque alguien usó esta dirección para
						suscribirse.
					</Text>
				</Container>
			</Body>
		</Html>
	);
}

export default NewsletterConfirm;

const body: React.CSSProperties = {
	backgroundColor: COLOR.paper,
	fontFamily: FONT_BODY,
	color: COLOR.black,
	margin: 0,
	padding: "40px 0",
};

const card: React.CSSProperties = {
	backgroundColor: COLOR.white,
	border: `1.5px solid ${COLOR.black}`,
	borderRadius: "8px",
	boxShadow: `4px 4px 0 0 ${COLOR.black}`,
	maxWidth: "580px",
	margin: "0 auto",
	padding: "40px",
};

const emoji: React.CSSProperties = { fontSize: "28px", margin: "0 0 16px" };

const heading: React.CSSProperties = {
	fontFamily: FONT_HEADING,
	fontSize: "24px",
	fontWeight: 700,
	lineHeight: 1.3,
	color: COLOR.black,
	margin: "0 0 20px",
};

const paragraph: React.CSSProperties = {
	fontSize: "16px",
	lineHeight: 1.6,
	color: COLOR.black,
	margin: "0 0 14px",
};

const buttonWrap: React.CSSProperties = { margin: "28px 0 8px" };

const button: React.CSSProperties = {
	fontFamily: FONT_HEADING,
	backgroundColor: COLOR.sunflower,
	color: COLOR.black,
	fontWeight: 700,
	fontSize: "15px",
	textDecoration: "none",
	padding: "14px 28px",
	border: `1.5px solid ${COLOR.black}`,
	borderRadius: "4px",
	boxShadow: `3px 3px 0 0 ${COLOR.black}`,
	display: "inline-block",
};

const hr: React.CSSProperties = {
	borderColor: "#e5e5e5",
	margin: "32px 0 20px",
};

const footer: React.CSSProperties = {
	fontSize: "13px",
	lineHeight: 1.6,
	color: COLOR.muted,
	margin: 0,
};

const footerLink: React.CSSProperties = {
	color: COLOR.purple,
	textDecoration: "underline",
};

NewsletterConfirm.PreviewProps = {
	confirmUrl:
		"https://mermeladatech.com/api/newsletter/confirm?token=demo-token",
} satisfies NewsletterConfirmProps;
