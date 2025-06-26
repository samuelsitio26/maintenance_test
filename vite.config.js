// vite.config.ts

import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	optimizeDeps: {
		include: ['svelte', 'jspdf', 'jspdf-autotable']
	},
	server: {
		fs: {
			allow: ['..']
		},
		allowedHosts: ['maintenance.eltamaprimaindo.com'],
		port: 5175
	}
});
