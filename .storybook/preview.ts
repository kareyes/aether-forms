import type { Preview } from "@storybook/sveltekit";
import { themes } from "storybook/internal/theming";
import "../src/app.css";

// biome-ignore lint/suspicious/noExplicitAny: Storybook's decorator signature.
const withDarkMode = (story: any, context: any) => {
	const darkMode = context.globals?.darkMode === "dark";

	if (typeof document !== "undefined") {
		document.documentElement.classList.toggle("dark", darkMode);
	}

	if (context.parameters.docs) {
		context.parameters.docs.theme = darkMode ? themes.dark : themes.light;
	}

	return story();
};

const preview: Preview = {
	parameters: {
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i,
			},
		},
		docs: {
			theme: themes.dark,
		},
		backgrounds: {
			default: "dark",
			values: [
				{ name: "light", value: "oklch(1 0 0)" },
				{ name: "dark", value: "oklch(0.105 0 0)" },
			],
		},
	},

	globalTypes: {
		darkMode: {
			description: "Toggle dark mode",
			toolbar: {
				title: "Theme",
				icon: "contrast",
				items: [
					{ value: "light", title: "Light", icon: "sun" },
					{ value: "dark", title: "Dark", icon: "moon" },
				],
				dynamicTitle: true,
			},
		},
	},

	decorators: [withDarkMode],

	initialGlobals: {
		darkMode: "dark",
	},
};

export default preview;
