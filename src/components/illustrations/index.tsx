/**
 * Small, cohesive filled illustrations used at the top of feature screens.
 *
 * One shared visual system: soft rounded, fully filled shapes drawn on a
 * 160x96 canvas, 2-4 harmonious accent colours each, with light/dark tuned
 * fills so every shape stays vivid in both themes.
 */
import type { ReactNode } from "react";

const GREEN = "fill-[#4FB064] dark:fill-[#7FD98A]";
const LAVENDER = "fill-[#8B79BE] dark:fill-[#B3A2DC]";
const CORAL = "fill-[#E8687C] dark:fill-[#F58C99]";
const YELLOW = "fill-[#E9AD32] dark:fill-[#F7CE68]";
const CREAM = "fill-[#FBEBD2] dark:fill-[#3A3348]";
const INK = "fill-[#4A4458] dark:fill-[#EDE9F5]";

function Canvas({ children, className }: { children: ReactNode; className?: string | undefined }) {
  return (
    <div className={className} aria-hidden>
      <svg viewBox="0 0 160 96" className="size-full" role="img">
        {children}
      </svg>
    </div>
  );
}

/** Small four-point sparkle. */
function Sparkle({ x, y, r, className }: { x: number; y: number; r: number; className: string }) {
  return (
    <path
      className={className}
      d={`M${x} ${y - r} Q${x + r * 0.24} ${y - r * 0.24} ${x + r} ${y} Q${x + r * 0.24} ${y + r * 0.24} ${x} ${y + r} Q${x - r * 0.24} ${y + r * 0.24} ${x - r} ${y} Q${x - r * 0.24} ${y - r * 0.24} ${x} ${y - r} Z`}
    />
  );
}

/** Small rounded heart centred on (x, y). */
function Heart({ x, y, s, className }: { x: number; y: number; s: number; className: string }) {
  return (
    <path
      className={className}
      transform={`translate(${x} ${y}) scale(${s}) translate(-12 -11)`}
      d="M12 20.3 3.9 12.6a5.3 5.3 0 0 1 0-7.6 5.6 5.6 0 0 1 7.7 0l.4.4.4-.4a5.6 5.6 0 0 1 7.7 0 5.3 5.3 0 0 1 0 7.6L12 20.3Z"
    />
  );
}

export function WinsIllustration({ className }: { className?: string }) {
  return (
    <Canvas className={className}>
      {/* handles */}
      <path
        d="M62 30h-8a8 8 0 0 0 8 12M98 30h8a8 8 0 0 1-8 12"
        fill="none"
        strokeWidth="5"
        strokeLinecap="round"
        className="stroke-[#E9AD32] dark:stroke-[#F7CE68]"
      />
      {/* cup */}
      <path d="M60 24h40v12a20 20 0 0 1-40 0V24Z" className={YELLOW} />
      <path d="M66 27h12v9a20 20 0 0 0 3 11 20 20 0 0 1-15-11V27Z" className={CREAM} opacity="0.55" />
      {/* stem + base */}
      <rect x="75" y="55" width="10" height="9" rx="3" className={YELLOW} />
      <rect x="63" y="63" width="34" height="9" rx="4.5" className={LAVENDER} />
      {/* star on the cup */}
      <Heart x={80} y={35} s={0.5} className={CORAL} />
      {/* sparkles */}
      <Sparkle x={44} y={26} r={9} className={CORAL} />
      <Sparkle x={116} y={22} r={7} className={GREEN} />
      <Sparkle x={124} y={54} r={5} className={LAVENDER} />
      <Sparkle x={38} y={54} r={4.5} className={YELLOW} />
    </Canvas>
  );
}

export function FlagsIllustration({ className }: { className?: string }) {
  return (
    <Canvas className={className}>
      {/* ground */}
      <rect x="50" y="70" width="60" height="7" rx="3.5" className={LAVENDER} opacity="0.75" />
      {/* pole */}
      <rect x="61" y="18" width="7" height="54" rx="3.5" className={INK} />
      {/* flag */}
      <path d="M68 20h44c-6 7-6 14 0 21H68V20Z" className={CORAL} />
      <path d="M68 20h13v21H68V20Z" className={CREAM} opacity="0.35" />
      {/* warning accent */}
      <path d="M124 50l11 19h-22l11-19Z" className={YELLOW} />
      <rect x="122.2" y="57" width="3.6" height="6.5" rx="1.8" className={INK} />
      <circle cx="124" cy="66" r="1.9" className={INK} />
      {/* small leaf/dot accents */}
      <circle cx="46" cy="44" r="4" className={GREEN} />
      <circle cx="40" cy="62" r="2.5" className={LAVENDER} />
    </Canvas>
  );
}

export function TriggersIllustration({ className }: { className?: string }) {
  return (
    <Canvas className={className}>
      {/* burst */}
      <path
        d="M80 8l7.5 14.5L103 16l-5 15.6 16.4 1.6-11.8 11.2 14 8.7-15.6 4.4 8.6 13.6-16-2.6.6 15.9L80 74.6 66.8 84.4l.6-15.9-16 2.6 8.6-13.6L44.4 53l14-8.7-11.8-11.2L63 31.5 58 16l15.5 6.5L80 8Z"
        className={LAVENDER}
      />
      <path
        d="M80 22l5 11 11.5-4-3.8 11.6 11.3 1.2-8.6 8 10 6.4-11.2 3.2 6 9.6-11.4-1.9.4 11L80 71l-9.2 7.1.4-11-11.4 1.9 6-9.6L54.6 56l10-6.4-8.6-8 11.3-1.2L63.5 29 75 33l5-11Z"
        className={CORAL}
      />
      <Heart x={80} y={49} s={0.85} className={CREAM} />
      <Sparkle x={30} y={30} r={7} className={GREEN} />
      <Sparkle x={132} y={70} r={6} className={YELLOW} />
      <circle cx="136" cy="26" r="3.2" className={GREEN} />
      <circle cx="26" cy="66" r="2.6" className={YELLOW} />
    </Canvas>
  );
}

export function JournalIllustration({ className }: { className?: string }) {
  return (
    <Canvas className={className}>
      {/* cover */}
      <rect x="46" y="18" width="62" height="60" rx="8" className={LAVENDER} />
      {/* pages */}
      <rect x="56" y="22" width="48" height="52" rx="6" className={CREAM} />
      {/* ruled lines */}
      <rect x="63" y="33" width="34" height="4" rx="2" className={GREEN} />
      <rect x="63" y="43" width="26" height="4" rx="2" className={GREEN} opacity="0.7" />
      <rect x="63" y="53" width="30" height="4" rx="2" className={GREEN} opacity="0.45" />
      {/* spine dots */}
      <circle cx="51" cy="30" r="3" className={CREAM} />
      <circle cx="51" cy="48" r="3" className={CREAM} />
      <circle cx="51" cy="66" r="3" className={CREAM} />
      {/* pen */}
      <g transform="rotate(28 122 46)">
        <rect x="118" y="20" width="9" height="40" rx="4.5" className={YELLOW} />
        <path d="M118 60h9l-4.5 10L118 60Z" className={INK} />
        <rect x="118" y="30" width="9" height="5" className={CORAL} />
      </g>
      {/* heart detail */}
      <Heart x={90} y={65} s={0.55} className={CORAL} />
    </Canvas>
  );
}

export function RitualsIllustration({ className }: { className?: string }) {
  return (
    <Canvas className={className}>
      {/* candle body */}
      <rect x="64" y="34" width="32" height="38" rx="10" className={CREAM} />
      <path d="M64 44a10 10 0 0 1 10-10h4v38h-4a10 10 0 0 1-10-10V44Z" className={LAVENDER} opacity="0.35" />
      {/* holder */}
      <rect x="56" y="70" width="48" height="9" rx="4.5" className={LAVENDER} />
      {/* wick */}
      <rect x="78.4" y="27" width="3.2" height="8" rx="1.6" className={INK} />
      {/* flame */}
      <path d="M80 6c7 8 11 12.5 11 18a11 11 0 0 1-22 0c0-5.5 4-10 11-18Z" className={YELLOW} />
      <path d="M80 15c3.4 4.2 5 6.3 5 9a5 5 0 0 1-10 0c0-2.7 1.6-4.8 5-9Z" className={CORAL} />
      {/* flower */}
      <g transform="translate(120 58)">
        <circle cx="0" cy="-9" r="6" className={CORAL} />
        <circle cx="8.5" cy="-3" r="6" className={CORAL} />
        <circle cx="5" cy="7" r="6" className={CORAL} />
        <circle cx="-5" cy="7" r="6" className={CORAL} />
        <circle cx="-8.5" cy="-3" r="6" className={CORAL} />
        <circle cx="0" cy="0" r="4.5" className={YELLOW} />
        <path d="M-1.6 6h3.2c0 7-3.2 10-3.2 14V6Z" className={GREEN} />
      </g>
      {/* leaves */}
      <path d="M40 72c0-10 7-16 16-16 0 10-7 16-16 16Z" className={GREEN} />
      <circle cx="34" cy="46" r="3.4" className={LAVENDER} />
    </Canvas>
  );
}

export function MotivationIllustration({ className }: { className?: string }) {
  return (
    <Canvas className={className}>
      {/* rays */}
      <g className={YELLOW} opacity="0.85">
        <rect x="77" y="6" width="6" height="12" rx="3" />
        <rect x="77" y="6" width="6" height="12" rx="3" transform="rotate(-40 80 44)" />
        <rect x="77" y="6" width="6" height="12" rx="3" transform="rotate(40 80 44)" />
        <rect x="77" y="6" width="6" height="12" rx="3" transform="rotate(-70 80 44)" />
        <rect x="77" y="6" width="6" height="12" rx="3" transform="rotate(70 80 44)" />
      </g>
      {/* sun */}
      <circle cx="80" cy="46" r="20" className={YELLOW} />
      <Heart x={80} y={45} s={0.7} className={CORAL} />
      {/* horizon hills */}
      <path d="M18 74c14-16 30-16 44 0H18Z" className={LAVENDER} />
      <path d="M96 74c15-19 33-19 46 0H96Z" className={GREEN} />
      <rect x="14" y="72" width="132" height="7" rx="3.5" className={GREEN} opacity="0.55" />
      {/* stars */}
      <Sparkle x={30} y={26} r={7} className={LAVENDER} />
      <Sparkle x={134} y={34} r={5.5} className={CORAL} />
      <circle cx="120" cy="16" r="3" className={GREEN} />
    </Canvas>
  );
}

/** Pictures — a small stack of colourful photo prints. */
export function PicturesIllustration({ className }: { className?: string }) {
  return (
    <Canvas className={className}>
      {/* back tilted print */}
      <g transform="rotate(-13 66 48)">
        <rect x="40" y="22" width="50" height="54" rx="7" className={LAVENDER} />
        <rect x="45" y="27" width="40" height="33" rx="4" className={CREAM} />
        <path d="M45 52l11-12 9 10 7-6 13 16H45v-8Z" className={GREEN} />
        <circle cx="76" cy="36" r="4.5" className={YELLOW} />
      </g>
      {/* front tilted print */}
      <g transform="rotate(9 96 52)">
        <rect x="72" y="26" width="52" height="56" rx="7" className={CORAL} />
        <rect x="77" y="31" width="42" height="34" rx="4" className={CREAM} />
        <path d="M77 58l12-13 10 11 7-7 13 16H77v-7Z" className={LAVENDER} />
        <circle cx="110" cy="40" r="4.5" className={YELLOW} />
        <Heart x={98} y={73} s={0.42} className={CREAM} />
      </g>
      {/* sparkles */}
      <Sparkle x={26} y={30} r={7} className={YELLOW} />
      <Sparkle x={140} y={22} r={5.5} className={GREEN} />
      <circle cx="30" cy="70" r="3" className={CORAL} />
    </Canvas>
  );
}

/** Affirmations — a glowing card with a radiant heart and kind words. */
export function AffirmationsIllustration({ className }: { className?: string }) {
  return (
    <Canvas className={className}>
      {/* glow rays behind the card */}
      <g className={YELLOW} opacity="0.7">
        <rect x="77" y="4" width="6" height="11" rx="3" />
        <rect x="77" y="4" width="6" height="11" rx="3" transform="rotate(-38 80 48)" />
        <rect x="77" y="4" width="6" height="11" rx="3" transform="rotate(38 80 48)" />
        <rect x="77" y="4" width="6" height="11" rx="3" transform="rotate(-72 80 48)" />
        <rect x="77" y="4" width="6" height="11" rx="3" transform="rotate(72 80 48)" />
      </g>
      {/* stacked cards behind */}
      <rect x="52" y="30" width="56" height="46" rx="10" className={LAVENDER} opacity="0.55" />
      <rect x="49" y="26" width="62" height="50" rx="11" className={GREEN} opacity="0.75" />
      {/* front card */}
      <rect x="46" y="22" width="68" height="52" rx="12" className={CREAM} />
      <Heart x={80} y={38} s={0.72} className={CORAL} />
      <rect x="60" y="52" width="40" height="5" rx="2.5" className={LAVENDER} />
      <rect x="67" y="62" width="26" height="5" rx="2.5" className={GREEN} />
      {/* sparkles */}
      <Sparkle x={26} y={40} r={8} className={CORAL} />
      <Sparkle x={134} y={58} r={6.5} className={LAVENDER} />
      <circle cx="132" cy="26" r="3.2" className={GREEN} />
      <circle cx="24" cy="70" r="2.6" className={YELLOW} />
    </Canvas>
  );
}

/** Unsent letters — a written page drifting out of an open envelope. */
export function LettersIllustration({ className }: { className?: string }) {
  return (
    <Canvas className={className}>
      {/* drifting page */}
      <g transform="rotate(-14 84 30)">
        <rect x="62" y="6" width="44" height="40" rx="6" className={CREAM} />
        <rect x="68" y="14" width="30" height="4" rx="2" className={LAVENDER} />
        <rect x="68" y="23" width="24" height="4" rx="2" className={GREEN} />
        <rect x="68" y="32" width="27" height="4" rx="2" className={LAVENDER} opacity="0.7" />
      </g>
      {/* envelope body */}
      <rect x="38" y="42" width="84" height="42" rx="9" className={GREEN} />
      {/* inner flap */}
      <path d="M38 51a9 9 0 0 1 9-9h66a9 9 0 0 1 9 9L80 76 38 51Z" className={LAVENDER} />
      {/* front fold */}
      <path d="M38 60l30 16-30 8V60Zm84 0v24l-30-8 30-16Z" className={GREEN} opacity="0.55" />
      {/* heart seal */}
      <Heart x={80} y={70} s={0.62} className={CORAL} />
      {/* released particles */}
      <Sparkle x={130} y={30} r={7} className={YELLOW} />
      <Sparkle x={28} y={26} r={6} className={CORAL} />
      <circle cx="140" cy="52" r="3.2" className={LAVENDER} />
      <circle cx="22" cy="52" r="2.6" className={YELLOW} />
      <circle cx="120" cy="14" r="2.4" className={GREEN} />
    </Canvas>
  );
}

/** Milestone — a heart-topped flag planted on a summit under a rising sun. */
export function MilestoneIllustration({ className }: { className?: string }) {
  return (
    <Canvas className={className}>
      {/* rising sun + haze */}
      <circle cx="126" cy="28" r="12" className={YELLOW} />
      <path d="M106 36a20 20 0 0 1 40 0Z" className={YELLOW} opacity="0.4" />
      {/* back mountain */}
      <path d="M6 78 44 34l38 44H6Z" className={LAVENDER} opacity="0.6" />
      {/* front mountain */}
      <path d="M38 78 78 24l40 54H38Z" className={GREEN} />
      {/* snow cap */}
      <path d="M78 24l12 16a12 12 0 0 1-24 0l12-16Z" className={CREAM} />
      {/* flag pole on the peak */}
      <rect x="76.5" y="6" width="3" height="17" rx="1.5" className={INK} />
      {/* flag */}
      <path d="M79.5 7h20c-3 3.5-3 7.5 0 11h-20V7Z" className={CORAL} />
      {/* heart on the slope */}
      <Heart x={62} y={62} s={0.5} className={CORAL} />
      {/* sparkles */}
      <Sparkle x={30} y={22} r={7} className={CORAL} />
      <Sparkle x={140} y={62} r={6} className={LAVENDER} />
      <circle cx="20" cy="52" r="3" className={YELLOW} />
      <circle cx="130" cy="74" r="2.6" className={GREEN} />
    </Canvas>
  );
}
