// @ts-check
import { defineConfig, fontProviders } from "astro/config";

import tailwindcss from "@tailwindcss/vite";

import db from "@astrojs/db";

import svelte from "@astrojs/svelte";

import vercel from "@astrojs/vercel";
// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },

  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: "Google Sans Code",
      cssVariable: "--font-google",
    },
  ],

  integrations: [db(), svelte()],
  adapter: vercel({
    webAnalytics: {
      enabled: true,
    },
  }),
  output: "server",
});
