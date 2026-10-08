// Renderiza os vídeos (MP4) e os posters (frame final) usados no hero do site.
import {bundle} from '@remotion/bundler';
import {renderMedia, renderStill, selectComposition} from '@remotion/renderer';
import {mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const site = path.join(root, '..');
const videoDir = path.join(site, 'assets', 'video');
const heroDir = path.join(site, 'assets', 'img', 'hero');
mkdirSync(videoDir, {recursive: true});
mkdirSync(heroDir, {recursive: true});

const serveUrl = await bundle({entryPoint: path.join(root, 'src', 'index.ts'), publicDir: path.join(root, 'public')});

const targets = [
	{id: 'OlyverHeroWide', name: 'olyver-hero-wide'},
	{id: 'OlyverHeroMobile', name: 'olyver-hero-mobile'},
];

for (const t of targets) {
	const composition = await selectComposition({serveUrl, id: t.id});
	await renderMedia({
		composition, serveUrl, codec: 'h264', crf: 20, pixelFormat: 'yuv420p',
		outputLocation: path.join(videoDir, `${t.name}.mp4`),
		muted: true,
	});
	await renderStill({
		composition, serveUrl, frame: composition.durationInFrames - 1,
		imageFormat: 'jpeg', jpegQuality: 90,
		output: path.join(heroDir, `${t.name}.jpg`),
	});
	console.log('ok', t.name);
}

