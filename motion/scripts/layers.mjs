// Separa a logo em camadas (componentes conectados) para animar cada peça.
// Cada camada é salva com o tamanho ORIGINAL do canvas (820x343) para manter o alinhamento exato.
import {PNG} from 'pngjs';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';

const SRC = new URL('../../assets/img/logo-olyver.png', import.meta.url);
const OUT = new URL('../public/layers/', import.meta.url);
mkdirSync(OUT, {recursive: true});

const src = PNG.sync.read(readFileSync(SRC));
const {width: W, height: H, data} = src;
const label = new Int32Array(W * H).fill(-1);
const comps = [];

for (let i = 0; i < W * H; i++) {
	if (label[i] !== -1 || data[i * 4 + 3] < 40) continue;
	const id = comps.length;
	const stack = [i];
	label[i] = id;
	let minX = W, minY = H, maxX = 0, maxY = 0, area = 0;
	while (stack.length) {
		const p = stack.pop();
		const x = p % W, y = (p / W) | 0;
		area++;
		if (x < minX) minX = x;
		if (x > maxX) maxX = x;
		if (y < minY) minY = y;
		if (y > maxY) maxY = y;
		for (let dy = -1; dy <= 1; dy++) {
			for (let dx = -1; dx <= 1; dx++) {
				const nx = x + dx, ny = y + dy;
				if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
				const q = ny * W + nx;
				if (label[q] === -1 && data[q * 4 + 3] >= 40) {
					label[q] = id;
					stack.push(q);
				}
			}
		}
	}
	comps.push({id, minX, minY, maxX, maxY, area});
}

// Ignora ruído (< 30px de área)
const keep = comps.filter((c) => c.area >= 30).sort((a, b) => a.minX - b.minX);
console.log(`${comps.length} componentes, ${keep.length} mantidos`);
for (const c of keep) console.log(c.id, `x ${c.minX}-${c.maxX}  y ${c.minY}-${c.maxY}  área ${c.area}`);

// Alpha original (0..1) de cada camada, incluindo pixels de antialias vizinhos
const alphaOf = (c) => {
	const a = new Float32Array(W * H);
	for (let p = 0; p < W * H; p++) {
		if (data[p * 4 + 3] === 0) continue;
		if (label[p] === c.id) { a[p] = data[p * 4 + 3] / 255; continue; }
		if (label[p] !== -1) continue;
		const x = p % W, y = (p / W) | 0;
		let near = false;
		for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) {
			const nx = x + dx, ny = y + dy;
			if (nx >= 0 && ny >= 0 && nx < W && ny < H && label[ny * W + nx] === c.id) { near = true; break; }
		}
		if (near) a[p] = data[p * 4 + 3] / 255;
	}
	return a;
};

// Upscale 3x (bilinear) + curva de contraste no alpha: bordas nítidas mesmo ampliando a logo
const S = 3;
const smooth = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };
const upscale = (a) => {
	const w = W * S, h = H * S;
	const png = new PNG({width: w, height: h});
	for (let y = 0; y < h; y++) {
		const fy = (y + 0.5) / S - 0.5, y0 = Math.floor(fy), ty = fy - y0;
		for (let x = 0; x < w; x++) {
			const fx = (x + 0.5) / S - 0.5, x0 = Math.floor(fx), tx = fx - x0;
			const g = (xx, yy) => a[Math.min(H - 1, Math.max(0, yy)) * W + Math.min(W - 1, Math.max(0, xx))];
			const v = (g(x0, y0) * (1 - tx) + g(x0 + 1, y0) * tx) * (1 - ty) + (g(x0, y0 + 1) * (1 - tx) + g(x0 + 1, y0 + 1) * tx) * ty;
			const o = (y * w + x) * 4;
			png.data[o] = png.data[o + 1] = png.data[o + 2] = 255;
			png.data[o + 3] = Math.round(smooth((v - 0.22) / 0.56) * 255);
		}
	}
	return png;
};

const meta = [];
const full = new Float32Array(W * H);
keep.forEach((c, n) => {
	const a = alphaOf(c);
	for (let p = 0; p < W * H; p++) if (a[p] > full[p]) full[p] = a[p];
	const name = `p${String(n).padStart(2, '0')}.png`;
	writeFileSync(new URL(name, OUT), PNG.sync.write(upscale(a)));
	meta.push({file: `layers/${name}`, minX: c.minX, maxX: c.maxX, minY: c.minY, maxY: c.maxY, area: c.area});
});
writeFileSync(new URL('full.png', OUT), PNG.sync.write(upscale(full)));
writeFileSync(new URL('../src/layers.json', import.meta.url), JSON.stringify({width: W, height: H, layers: meta}, null, 2));
console.log('ok');
