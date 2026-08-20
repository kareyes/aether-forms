import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

// `vite build` here builds the demo app under src/routes, not the library —
// `svelte-package` does the library build. Externalizing `svelte` (as a library
// build would) leaves the server bundle importing it separately from
// SvelteKit's own copy, and the two module instances fail every setContext with
// `lifecycle_outside_component`.
export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	optimizeDeps: {
		exclude: ["aether-ui", "aether-forms"],
	},
	ssr: {
		// aether-ui and @lucide/svelte both ship uncompiled .svelte source, so
		// Vite has to run them through vite-plugin-svelte during SSR rather than
		// externalizing them.
		noExternal: ["aether-ui", "@lucide/svelte"],
	},
});
