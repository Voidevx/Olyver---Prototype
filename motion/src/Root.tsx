import {Composition} from 'remotion';
import {OlyverHero, HeroProps} from './OlyverHero';

export const FPS = 30;
export const DURATION = 120;

// Desktop: faixa 3:1 (mesma proporção do .hero-stage do site) em 2x para telas retina.
// Mobile: 4:3 (mesma proporção do .hero-stage no CSS responsivo).
const wide: HeroProps = {logoWidthRatio: 0.5, variant: 'wide'};
const mobile: HeroProps = {logoWidthRatio: 0.78, variant: 'mobile'};

export const Root: React.FC = () => {
	return (
		<>
			<Composition
				id="OlyverHeroWide"
				component={OlyverHero}
				durationInFrames={DURATION}
				fps={FPS}
				width={2400}
				height={800}
				defaultProps={wide}
			/>
			<Composition
				id="OlyverHeroMobile"
				component={OlyverHero}
				durationInFrames={DURATION}
				fps={FPS}
				width={1200}
				height={900}
				defaultProps={mobile}
			/>
		</>
	);
};
