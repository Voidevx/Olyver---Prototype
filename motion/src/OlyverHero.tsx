import React from 'react';
import {
	AbsoluteFill,
	Easing,
	Img,
	interpolate,
	random,
	spring,
	staticFile,
	useCurrentFrame,
	useVideoConfig,
} from 'remotion';
import data from './layers.json';

export type HeroProps = {
	/** Largura da logo em relação à largura do vídeo */
	logoWidthRatio: number;
	variant: 'wide' | 'mobile';
};

// Paleta do site (css/styles.css)
const INK = '#0a0a0b';
const GOLD = '#d9b46e';
const GOLD_SOFT = '#f1dcab';

const LW = data.width; // 820
const LH = data.height; // 343

type Layer = (typeof data.layers)[number];
// Letras de "OLYVER" (topo da logo) vs. script "Import" (I + mport)
const letters = data.layers.filter((l) => l.minY < 10).sort((a, b) => a.minX - b.minX);
const script = data.layers.filter((l) => l.minY >= 10).sort((a, b) => a.minX - b.minX);

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/* ------------------------------------------------------------------ */
/* Anel dourado (o mesmo símbolo do favicon) que "abre" para a logo    */
/* ------------------------------------------------------------------ */
const Ring: React.FC<{frame: number; height: number}> = ({frame, height}) => {
	const {fps} = useVideoConfig();
	const base = height * 0.15;

	// 0-12: anel nasce (desenha o traço + mola de escala)
	const draw = interpolate(frame, [0, 12], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
	const pop = spring({frame, fps, config: {damping: 14, stiffness: 160}, durationInFrames: 14});
	// 14-40: anel expande como onda e some
	const burst = interpolate(frame, [13, 42], [0, 1], {...clamp, easing: Easing.bezier(0.2, 0.6, 0.2, 1)});
	const r = base * (0.55 + 0.45 * pop) + burst * height * 2.6;
	const stroke = interpolate(burst, [0, 1], [height * 0.06, 1.5]);
	const opacity = interpolate(frame, [0, 3], [0, 1], clamp) * interpolate(burst, [0.55, 1], [1, 0], clamp);

	const circ = 2 * Math.PI * r;
	return (
		<svg
			style={{position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible'}}
			viewBox={`0 0 ${height * 3} ${height}`}
			preserveAspectRatio="xMidYMid slice"
		>
			<defs>
				<linearGradient id="ringG" x1="0" y1="0" x2="1" y2="1">
					<stop offset="0" stopColor={GOLD_SOFT} />
					<stop offset="1" stopColor="#b88d45" />
				</linearGradient>
			</defs>
			<circle
				cx="50%"
				cy="50%"
				r={r}
				fill="none"
				stroke="url(#ringG)"
				strokeWidth={stroke}
				strokeLinecap="round"
				opacity={opacity}
				strokeDasharray={`${circ * draw} ${circ}`}
				transform={`rotate(-90 ${(height * 3) / 2} ${height / 2})`}
			/>
		</svg>
	);
};

/* ------------------------------------------------------------------ */
/* Partículas douradas sutis (determinísticas)                         */
/* ------------------------------------------------------------------ */
const Sparks: React.FC<{frame: number; width: number; height: number; count: number}> = ({frame, width, height, count}) => {
	const items = Array.from({length: count}, (_, i) => {
		const x = random(`x${i}`) * width;
		const y0 = random(`y${i}`) * height;
		const speed = 0.35 + random(`s${i}`) * 0.9;
		const size = (1.2 + random(`z${i}`) * 2.6) * (height / 800);
		const phase = random(`p${i}`) * Math.PI * 2;
		const y = (((y0 - frame * speed * (height / 400)) % height) + height) % height;
		const tw = 0.5 + 0.5 * Math.sin(frame * 0.12 + phase);
		const o = interpolate(frame, [18, 50], [0, 1], clamp) * (0.12 + 0.5 * tw) * (0.4 + 0.6 * random(`o${i}`));
		return {x, y, size, o, i};
	});
	return (
		<AbsoluteFill>
			{items.map((s) => (
				<div
					key={s.i}
					style={{
						position: 'absolute',
						left: s.x,
						top: s.y,
						width: s.size,
						height: s.size,
						borderRadius: '50%',
						background: GOLD_SOFT,
						opacity: s.o,
						boxShadow: `0 0 ${s.size * 4}px ${GOLD}`,
					}}
				/>
			))}
		</AbsoluteFill>
	);
};

/* ------------------------------------------------------------------ */
/* Composição                                                          */
/* ------------------------------------------------------------------ */
export const OlyverHero: React.FC<HeroProps> = ({logoWidthRatio, variant}) => {
	const frame = useCurrentFrame();
	const {fps, width, height} = useVideoConfig();

	const scale = Math.min((width * logoWidthRatio) / LW, (height * 0.62) / LH);

	// Deriva lenta de câmera (zoom suave) durante todo o vídeo
	const cam = interpolate(frame, [0, 120], [1, 1.035], {...clamp, easing: Easing.out(Easing.quad)});

	// Brilho de fundo: "respira" e pulsa quando o anel explode
	const glowBurst = interpolate(frame, [12, 24, 60], [0.0, 1, 0.45], clamp);
	const glow = 0.1 + 0.22 * glowBurst;

	// --- Letras OLYVER: sobem de uma máscara, em cascata
	const letterEls = letters.map((l, i) => {
		const t = spring({
			frame: frame - (17 + i * 3),
			fps,
			config: {damping: 200, mass: 0.9},
			durationInFrames: 26,
		});
		const y = interpolate(t, [0, 1], [LH * 0.78, 0]);
		const rot = interpolate(t, [0, 1], [7, 0]);
		return (
			<div key={l.file} style={{position: 'absolute', left: 0, top: 0, width: LW, height: 232, overflow: 'hidden'}}>
				<Img
					src={staticFile(l.file)}
					style={{
						position: 'absolute',
						left: 0,
						top: 0,
						width: LW,
						height: LH,
						transformOrigin: `${(l.minX + l.maxX) / 2}px 219px`,
						transform: `translateY(${y}px) rotate(${rot}deg)`,
					}}
				/>
			</div>
		);
	});

	// --- Script "Import": escrita da esquerda para a direita (ouro → branco)
	const scriptStart = 44;
	const scriptEnd = 82;
	const front = (offset: number) =>
		interpolate(frame - offset, [scriptStart, scriptEnd], [340, 850], {
			...clamp,
			easing: Easing.bezier(0.45, 0.05, 0.25, 1),
		});
	const soft = 70;
	const wipeMask = (x: number) =>
		`linear-gradient(90deg, #000 0px, #000 ${x - soft}px, transparent ${x}px)`;
	const scriptLift = interpolate(frame, [scriptStart, scriptStart + 24], [14, 0], {...clamp, easing: Easing.out(Easing.cubic)});
	const scriptRefs = script.map((l) => l.file);

	const scriptLayers = (tint: 'gold' | 'white') =>
		scriptRefs.map((file) =>
			tint === 'white' ? (
				<Img key={file} src={staticFile(file)} style={{position: 'absolute', left: 0, top: 0, width: LW, height: LH}} />
			) : (
				<div
					key={file}
					style={{
						position: 'absolute',
						left: 0,
						top: 0,
						width: LW,
						height: LH,
						background: `linear-gradient(100deg, ${GOLD_SOFT}, ${GOLD})`,
						WebkitMaskImage: `url(${staticFile(file)})`,
						WebkitMaskSize: '100% 100%',
						maskImage: `url(${staticFile(file)})`,
						maskSize: '100% 100%',
					}}
				/>
			),
		);

	// --- Brilho que varre o logo inteiro
	const sweepP = interpolate(frame, [78, 106], [-8, 108], {...clamp, easing: Easing.inOut(Easing.cubic)});
	const sweepOpacity = interpolate(frame, [78, 84, 100, 106], [0, 1, 1, 0], clamp);

	// --- Linha horizonte dourada sob a logo
	const lineW = interpolate(frame, [62, 96], [0, 1], {...clamp, easing: Easing.bezier(0.3, 0.1, 0.1, 1)});
	const lineY = height / 2 + (LH * scale) / 2 + height * (variant === 'wide' ? 0.075 : 0.06);
	const lineFull = width * (variant === 'wide' ? 0.62 : 0.84);
	const glintX = interpolate(frame, [84, 116], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
	const glintO = interpolate(frame, [84, 92, 108, 116], [0, 1, 1, 0], clamp);

	return (
		<AbsoluteFill
			style={{
				background: `radial-gradient(70% 90% at 50% 52%, #1c1810 0%, #100e0b 48%, ${INK} 100%)`,
				overflow: 'hidden',
			}}
		>
			{/* halo dourado atrás da logo */}
			<AbsoluteFill
				style={{
					background: `radial-gradient(34% 50% at 50% 50%, rgba(217,180,110,${glow}) 0%, rgba(217,180,110,0) 100%)`,
				}}
			/>

			<AbsoluteFill style={{transform: `scale(${cam})`}}>
				<Ring frame={frame} height={height} />
				<Sparks frame={frame} width={width} height={height} count={variant === 'wide' ? 34 : 22} />

				{/* linha horizonte */}
				<div
					style={{
						position: 'absolute',
						left: (width - lineFull * lineW) / 2,
						top: lineY,
						width: lineFull * lineW,
						height: Math.max(2, height * 0.0035),
						background: `linear-gradient(90deg, transparent 0%, ${GOLD} 35%, ${GOLD_SOFT} 50%, ${GOLD} 65%, transparent 100%)`,
						opacity: 0.85,
					}}
				/>
				<div
					style={{
						position: 'absolute',
						left: (width - lineFull) / 2 + lineFull * glintX - 90,
						top: lineY - height * 0.004,
						width: 180,
						height: Math.max(2, height * 0.0035) + height * 0.008,
						background: 'radial-gradient(closest-side, rgba(255,255,255,0.95), rgba(255,236,190,0) 100%)',
						opacity: glintO * lineW,
						filter: 'blur(1px)',
					}}
				/>

				{/* logo */}
				<div
					style={{
						position: 'absolute',
						left: (width - LW * scale) / 2,
						top: (height - LH * scale) / 2,
						width: LW,
						height: LH,
						transformOrigin: '0 0',
						transform: `scale(${scale})`,
					}}
				>
					{letterEls}

					{/* Import: camada dourada (à frente) e branca (atrás, secando a tinta) */}
					<div
						style={{
							position: 'absolute',
							inset: 0,
							transform: `translateY(${scriptLift}px)`,
							opacity: interpolate(frame, [scriptStart, scriptStart + 8], [0, 1], clamp),
						}}
					>
						<div style={{position: 'absolute', inset: 0, WebkitMaskImage: wipeMask(front(0)), maskImage: wipeMask(front(0))}}>
							{scriptLayers('white')}
						</div>
					</div>
					<div
						style={{
							position: 'absolute',
							inset: 0,
							transform: `translateY(${scriptLift}px)`,
							opacity: interpolate(frame, [scriptStart, scriptStart + 6], [0, 1], clamp),
						}}
					>
						{/* Ouro: cobre a ponta da escrita e desaparece conforme o branco alcança */}
						<div
							style={{
								position: 'absolute',
								inset: 0,
								WebkitMaskImage: `linear-gradient(90deg, transparent ${front(7) - 20}px, #000 ${front(7) + 20}px, #000 ${front(0) - 40}px, transparent ${front(0)}px)`,
								maskImage: `linear-gradient(90deg, transparent ${front(7) - 20}px, #000 ${front(7) + 20}px, #000 ${front(0) - 40}px, transparent ${front(0)}px)`,
							}}
						>
							{scriptLayers('gold')}
						</div>
					</div>

					{/* varredura de brilho (usa a logo completa como máscara) */}
					<div
						style={{
							position: 'absolute',
							inset: 0,
							opacity: sweepOpacity,
							background: `linear-gradient(100deg, rgba(255,255,255,0) 0%, rgba(241,220,171,0) 38%, ${GOLD} 46%, #ffffff 50%, ${GOLD} 54%, rgba(241,220,171,0) 62%, rgba(255,255,255,0) 100%)`,
							backgroundSize: '260% 100%',
							backgroundRepeat: 'no-repeat',
							backgroundPosition: `${sweepP}% 0`,
							WebkitMaskImage: `url(${staticFile('layers/full.png')})`,
							WebkitMaskSize: '100% 100%',
							maskImage: `url(${staticFile('layers/full.png')})`,
							maskSize: '100% 100%',
							mixBlendMode: 'normal',
						}}
					/>
				</div>
			</AbsoluteFill>

			{/* vinheta */}
			<AbsoluteFill style={{background: 'radial-gradient(120% 120% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.5) 100%)'}} />
		</AbsoluteFill>
	);
};
