/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
			colors: {
				bgCol: "#05070A",
				text: "#EBF0FS",
				primary: "A0BCCF",
				accent: "B975A5",
			},
			fontFamily: {
				sans: ['Poppins', "sans-serif"],
			},
		}

	},
	plugins: [],
}
