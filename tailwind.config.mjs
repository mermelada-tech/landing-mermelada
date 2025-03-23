/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
			backgroundColor: {
				'primary': '#3490dc',
				'secondary': '#ffed4a',
				'danger': '#e3342f',
			},
		},
	},
	plugins: [],
}
