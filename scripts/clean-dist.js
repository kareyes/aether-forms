import { readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

async function* walkDir(dir) {
	const entries = await readdir(dir, { withFileTypes: true });
	for (const entry of entries) {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) {
			yield* walkDir(path);
			yield { path, isDirectory: true, name: entry.name };
		} else {
			yield { path, isDirectory: false, name: entry.name };
		}
	}
}

async function cleanDist() {
	console.log('Cleaning dist folder...');
	const toRemove = [];

	for await (const entry of walkDir('dist')) {
		// Remove docs directories
		if (entry.isDirectory && entry.name === 'docs') {
			toRemove.push(entry.path);
		}
		// Remove story files
		else if (!entry.isDirectory && entry.name.includes('.stories.')) {
			toRemove.push(entry.path);
		}
		// Remove test files
		else if (!entry.isDirectory && entry.name.includes('.test.')) {
			toRemove.push(entry.path);
		}
	}

	for (const path of toRemove) {
		await rm(path, { recursive: true, force: true });
		console.log(`Removed: ${path}`);
	}

	console.log('Done cleaning dist folder.');
}

cleanDist().catch(console.error);
