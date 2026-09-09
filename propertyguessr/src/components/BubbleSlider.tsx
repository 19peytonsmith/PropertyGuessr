// src/components/BubbleSlider.tsx
//
// A slider whose value rides in a bubble above the thumb. The bubble is a bob on
// a spring pinned to the thumb: how far it trails is how far it leans.
//
// Ported from the torph docs site (MIT, github.com/lochie/torph), with the
// autoplay dropped, the value made controlled, and price marks added.
"use client";

import * as React from "react";
import { TextMorph } from "torph/react";

import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useMotionLoop } from "@/hooks/useMotionLoop";

const THUMB = 18; // The input's own thumb is sized to match, so both map a pointer alike

const STIFFNESS = 0.16;
const DAMPING = 0.67;
const MAX_TILT = 28;
const SOFT = 30; // px of trail at one radian of tanh - past it the lean saturates

const GLIDE = 0.18; // How much of the way to a programmatic value the thumb covers per frame

const thumbX = (fraction: number, width: number) =>
  THUMB / 2 + fraction * Math.max(0, width - THUMB);

type Bob = { x: number; lag: number; vel: number };

const swing = (bob: Bob) => {
  bob.vel = (bob.vel + (bob.x - bob.lag) * STIFFNESS) * DAMPING;
  bob.lag += bob.vel;
};

const settled = (bob: Bob) =>
  Math.abs(bob.vel) < 0.02 && Math.abs(bob.x - bob.lag) < 0.05;

const tiltOf = (bob: Bob) => MAX_TILT * Math.tanh((bob.lag - bob.x) / SOFT);

const stretchOf = (bob: Bob) => Math.min(Math.abs(bob.vel) * 0.006, 0.13);

const scaleXof = (stretch: number, squash: number) =>
  (1 - stretch * 0.7) * (1 - squash);

const bubbleTransform = (tilt: number, stretch: number, squash = 0) =>
  `translateX(-50%) rotate(${tilt}deg) scale(${scaleXof(stretch, squash)}, ${1 + stretch})`;

const rest = (bob: Bob) => {
  bob.lag = bob.x;
  bob.vel = 0;
};

// ── Bubble geometry, for keeping two of them off each other ──

const TAIL = 9; // px the tail hangs below the bubble - its tip is the pivot, per the stylesheet
const RADIUS = 12; // px of corner rounding on the bubble, per the stylesheet

type Box = { half: number; top: number; bottom: number };
type Pt = { x: number; y: number };

const boxOf = (bubble: HTMLElement, kx: number, ky: number): Box => ({
  half: (bubble.offsetWidth / 2) * kx,
  top: -(TAIL + bubble.offsetHeight) * ky,
  bottom: -TAIL * ky,
});

// The body's box inset by its corner radius: a rounded rectangle is that box
// swept by a disc, so two of them meet arc to arc once the boxes are 2 radii
// apart. Swung about the tail tip, which sits at `x`.
const cornersOf = (box: Box, tilt: number, x: number): Pt[] => {
  const sin = Math.sin((tilt * Math.PI) / 180);
  const cos = Math.cos((tilt * Math.PI) / 180);
  const half = Math.max(box.half - RADIUS, 0);
  const at = (px: number, py: number) => ({
    x: x + px * cos - py * sin,
    y: px * sin + py * cos,
  });
  return [
    at(-half, box.top + RADIUS),
    at(half, box.top + RADIUS),
    at(half, box.bottom - RADIUS),
    at(-half, box.bottom - RADIUS),
  ];
};

const spanOn = (poly: Pt[], nx: number, ny: number) => {
  let min = Infinity;
  let max = -Infinity;
  for (const p of poly) {
    const d = p.x * nx + p.y * ny;
    min = Math.min(min, d);
    max = Math.max(max, d);
  }
  return { min, max };
};

const overlaps = (a: Pt[], b: Pt[]) => {
  for (const poly of [a, b]) {
    for (let i = 0; i < 2; i += 1) {
      const p = poly[i]!;
      const q = poly[i + 1]!;
      const len = Math.hypot(q.x - p.x, q.y - p.y) || 1;
      const spanA = spanOn(a, (q.y - p.y) / len, (p.x - q.x) / len);
      const spanB = spanOn(b, (q.y - p.y) / len, (p.x - q.x) / len);
      if (spanB.min > spanA.max || spanA.min > spanB.max) return false;
    }
  }
  return true;
};

const edgeDist = (v: Pt, p: Pt, q: Pt) => {
  const ex = q.x - p.x;
  const ey = q.y - p.y;
  const along = ex * ex + ey * ey;
  const t = along
    ? Math.min(Math.max(((v.x - p.x) * ex + (v.y - p.y) * ey) / along, 0), 1)
    : 0;
  return Math.hypot(v.x - p.x - t * ex, v.y - p.y - t * ey);
};

// Daylight between two leaning bodies, negative once they cross. Their closest
// approach, not their horizontal extents: bodies tilted into a V meet on their
// near corners, which the extents pass long before the corners are anywhere
// near each other.
const gapBetween = (a: Pt[], b: Pt[]) => {
  let near = Infinity;
  for (const [poly, other] of [
    [a, b],
    [b, a],
  ] as const) {
    for (const v of poly) {
      for (let i = 0; i < other.length; i += 1) {
        near = Math.min(
          near,
          edgeDist(v, other[i]!, other[(i + 1) % other.length]!),
        );
      }
    }
  }
  return (overlaps(a, b) ? -near : near) - 2 * RADIUS;
};

// A morph reads a token as a number only when it opens with a digit or a bare
// currency symbol. "$550,000" qualifies and rolls digit by digit; "C$550,000"
// does not, and morphs as one long word - every value it passes through piling
// up on top of the last. So the prefix is rendered beside the morph rather than
// inside it, and every currency gets the same clean roll.
const AMOUNT = /^(.*?)([\d][\d.,  ]*)$/;

const splitAmount = (label: string): [prefix: string, amount: string] => {
  const found = AMOUNT.exec(label);
  return found ? [found[1]!, found[2]!] : ["", label];
};

const Money = ({ label, className }: { label: string; className?: string }) => {
  const [prefix, amount] = splitAmount(label);
  return (
    <>
      {prefix ? <span className="bubble-prefix">{prefix}</span> : null}
      <TextMorph className={className ?? "bubble-value"}>{amount}</TextMorph>
    </>
  );
};

// ── Shared types ──

export type BubbleMark = { value: number; label: string };

export type BubbleChange = (
  event: Event | React.SyntheticEvent,
  value: number | number[],
  activeThumb: number,
) => void;

type CommonProps = {
  min: number;
  max: number;
  marks: BubbleMark[];
  format: (value: number) => string;
  color?: string;
};

type BubbleSliderProps = CommonProps & {
  value: number | number[];
  onChange: BubbleChange;
  disabled?: boolean;
  ariaLabel?: string;
};

const LABEL_GAP = 12; // px of daylight two mark labels have to keep

type LabelPlace = { shift: number; hidden: boolean };

// Marks sit at fixed fractions of the track, so on a narrow one the outer pairs
// close up and the end labels hang off the ends. Measured rather than guessed
// at a breakpoint: the labels are as wide as their text, which the currency
// prefix and the reader's font size both move.
const useMarkLayout = (marks: BubbleMark[], min: number, max: number) => {
  const labelRefs = React.useRef<(HTMLSpanElement | null)[]>([]);
  const [places, setPlaces] = React.useState<LabelPlace[]>([]);

  React.useLayoutEffect(() => {
    // Taken from the DOM rather than a ref on the track: the track's own ref is
    // attached after this effect runs, and the labels are positioned against
    // their parent anyway, so the parent is the box to measure against.
    const track = labelRefs.current[0]?.parentElement;
    if (!track) return;

    const measure = () => {
      const width = track.offsetWidth;
      if (!width) return;

      // Where each label wants to sit, nudged back inside the track so the two
      // on the ends cannot hang past it.
      const spans = marks.map((mark, i) => {
        const half = (labelRefs.current[i]?.offsetWidth ?? 0) / 2;
        const centre = thumbX((mark.value - min) / (max - min), width);
        const shift =
          Math.max(0, half - centre) - Math.max(0, centre + half - width);
        return { left: centre - half + shift, right: centre + half + shift, shift };
      });

      // Both ends always read - they are what the track is bounded by. A label
      // between them reads only where it clears the last one kept and the end.
      const last = spans.length - 1;
      const next = spans.map((span) => ({ shift: span.shift, hidden: false }));
      let kept = 0;
      for (let i = 1; i < last; i += 1) {
        const fits =
          spans[i]!.left >= spans[kept]!.right + LABEL_GAP &&
          spans[i]!.right + LABEL_GAP <= spans[last]!.left;
        next[i]!.hidden = !fits;
        if (fits) kept = i;
      }

      setPlaces((prev) =>
        prev.length === next.length &&
        prev.every(
          (p, i) => p.shift === next[i]!.shift && p.hidden === next[i]!.hidden,
        )
          ? prev
          : next,
      );
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    return () => observer.disconnect();
  }, [marks, min, max]);

  return { labelRefs, places };
};

const Marks = ({
  marks,
  min,
  max,
  active,
}: {
  marks: BubbleMark[];
  min: number;
  max: number;
  /** Marks up to here read as passed. `null` where nothing is filled. */
  active: number | null;
}) => {
  const { labelRefs, places } = useMarkLayout(marks, min, max);

  return (
    <>
      {marks.map((mark, i) => {
        const fraction = (mark.value - min) / (max - min);
        // The same mapping as `thumbX`, so a mark lines up with the thumb on it.
        const left = `calc(${THUMB / 2}px + ${fraction} * (100% - ${THUMB}px))`;
        const passed = active !== null && mark.value <= active;
        const place = places[i];
        return (
          <React.Fragment key={mark.value}>
            <span
              aria-hidden
              className={`bubble-mark${passed ? " is-active" : ""}`}
              style={{ left }}
            />
            <span
              aria-hidden
              ref={(el) => {
                labelRefs.current[i] = el;
              }}
              className="bubble-mark-label"
              style={{
                left,
                transform: `translateX(calc(-50% + ${place?.shift ?? 0}px))`,
                // Hidden, not unmounted: a dropped label is still measured, so
                // it comes back the moment the track is wide enough for it.
                visibility: place?.hidden ? "hidden" : undefined,
              }}
            >
              {mark.label}
            </span>
          </React.Fragment>
        );
      })}
    </>
  );
};

// ── One thumb, dragged ──

const SingleBubble = ({
  value,
  onChange,
  min,
  max,
  marks,
  format,
  disabled,
  ariaLabel,
}: CommonProps & {
  value: number;
  onChange: BubbleChange;
  disabled?: boolean;
  ariaLabel?: string;
}) => {
  const [shown, setShown] = React.useState(value);
  const reducedMotion = usePrefersReducedMotion();

  const trackRef = React.useRef<HTMLDivElement>(null);
  const fillRef = React.useRef<HTMLDivElement>(null);
  const anchorRef = React.useRef<HTMLDivElement>(null);
  const bubbleRef = React.useRef<HTMLDivElement>(null);

  const state = React.useRef({
    bob: { x: 0, lag: 0, vel: 0 },
    label: format(value),
    play: value,
    to: value,
    still: false,
    width: 0,
  });

  // Held in a ref because the motion loop reads its setup once, on mount.
  const atRef = React.useRef<(v: number, width: number) => number>(() => 0);
  atRef.current = (v, width) => thumbX((v - min) / (max - min), width);

  const formatRef = React.useRef(format);
  formatRef.current = format;

  const wake = useMotionLoop(() => {
    const track = trackRef.current;
    const fill = fillRef.current;
    const anchor = anchorRef.current;
    const bubble = bubbleRef.current;
    if (!track || !fill || !anchor || !bubble) return null;

    const s = state.current;
    s.width = track.offsetWidth;
    s.bob.x = atRef.current(s.play, s.width);
    s.bob.lag = s.bob.x;

    return {
      step: () => {
        // The value eases rather than cuts, so a typed price glides the thumb
        // and the bob is thrown by the travel, not by the jump. A drag snaps
        // `play` to `to` itself, so this only ever runs for outside changes.
        s.play += (s.to - s.play) * GLIDE;
        if (s.still || Math.abs(s.to - s.play) < 0.05) s.play = s.to;
        s.bob.x = atRef.current(s.play, s.width);
        swing(s.bob);

        if (s.still) {
          rest(s.bob);
          return false;
        }
        if (s.play !== s.to || !settled(s.bob)) return true;
        rest(s.bob);
        return false;
      },
      paint: () => {
        // Repainted on the label, not on a rounded value: a slider unit is
        // worth hundreds of dollars up the track, so rounding to one would
        // quantise a typed price. The exact value is carried through, and a
        // render is spent only when the text it reads out actually changes.
        const label = formatRef.current(s.play);
        if (label !== s.label) {
          s.label = label;
          setShown(s.play);
        }

        anchor.style.transform = `translateX(${s.bob.x}px)`;
        bubble.style.transform = bubbleTransform(
          tiltOf(s.bob),
          stretchOf(s.bob),
        );
        fill.style.transform = `scaleX(${s.width ? s.bob.x / s.width : 0})`;
      },
    };
  });

  React.useEffect(() => {
    state.current.still = reducedMotion;
    wake();
  }, [reducedMotion, wake]);

  // The prop is the source of truth. A drag has already snapped `play` to it, so
  // this only glides when the value changed from somewhere else.
  React.useEffect(() => {
    state.current.to = value;
    wake();
  }, [value, wake]);

  React.useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const observer = new ResizeObserver(([entry]) => {
      const s = state.current;
      s.width = entry!.contentRect.width;
      s.bob.x = atRef.current(s.play, s.width);
      // A reflow is not a drag - the bubble is carried, not thrown.
      rest(s.bob);
      wake();
    });
    observer.observe(track);

    return () => observer.disconnect();
  }, [wake]);

  return (
    <div className="bubble-track" ref={trackRef}>
      <div className="bubble-fill" ref={fillRef} />

      <Marks marks={marks} min={min} max={max} active={shown} />

      <input
        className="bubble-input"
        type="range"
        min={min}
        max={max}
        // Whole steps: this input is invisible, and only maps a pointer or an
        // arrow key to a value. The visible thumb rides the exact value, which
        // a typed price puts between two steps.
        value={Math.round(value)}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-valuetext={format(value)}
        onChange={(event) => {
          const next = Number(event.target.value);
          const s = state.current;
          // A drag is one to one: the thumb sits under the pointer, and the
          // bubble is thrown by the travel rather than easing behind it.
          s.play = s.to = next;
          onChange(event, next, 0);
          wake();
        }}
      />

      <div className="bubble-anchor" ref={anchorRef}>
        <span className="bubble-thumb" />
        <div className="bubble" ref={bubbleRef}>
          <Money label={format(shown)} />
        </div>
      </div>
    </div>
  );
};

// ── Two bubbles, not dragged: the reveal ──

const SHOVE_PAD = 10; // px of closeness at which the pair start to squash
const SHOVE_CLEAR = 2; // px of daylight they hold once they meet
const SHOVE_LEAN = 90; // deg - however far it takes, up to lying flat on the tail
const SHOVE_STIFFNESS = 0.2;
const SHOVE_DAMPING = 0.62;

const RevealBubbles = ({
  value,
  min,
  max,
  marks,
  format,
}: CommonProps & { value: number[] }) => {
  const reducedMotion = usePrefersReducedMotion();

  const trackRef = React.useRef<HTMLDivElement>(null);
  const fillRef = React.useRef<HTMLDivElement>(null);
  const loRef = React.useRef<HTMLDivElement>(null);
  const hiRef = React.useRef<HTMLDivElement>(null);
  const loBubbleRef = React.useRef<HTMLDivElement>(null);
  const hiBubbleRef = React.useRef<HTMLDivElement>(null);

  const [guess, actual] = value;
  const lower = Math.min(guess!, actual!);
  const upper = Math.max(guess!, actual!);
  const guessIsLower = guess! <= actual!;

  const state = React.useRef({
    lo: { x: 0, lag: 0, vel: 0 },
    hi: { x: 0, lag: 0, vel: 0 },
    shove: 0,
    shoveVel: 0,
    lower,
    upper,
    still: false,
    width: 0,
  });

  // Held in a ref because the motion loop reads its setup once, on mount.
  const atRef = React.useRef<(v: number, width: number) => number>(() => 0);
  atRef.current = (v, width) => thumbX((v - min) / (max - min), width);

  const wake = useMotionLoop(() => {
    const track = trackRef.current;
    const fill = fillRef.current;
    const lo = loRef.current;
    const hi = hiRef.current;
    const loBubble = loBubbleRef.current;
    const hiBubble = hiBubbleRef.current;
    if (!track || !fill || !lo || !hi || !loBubble || !hiBubble) return null;

    const s = state.current;
    s.width = track.offsetWidth;
    s.lo.x = atRef.current(s.lower, s.width);
    s.hi.x = atRef.current(s.upper, s.width);
    // Both start on the guess and spring out to their marks, so the reveal
    // shows the distance rather than just stating it.
    const from = atRef.current(guessIsLower ? s.lower : s.upper, s.width);
    s.lo.lag = s.still ? s.lo.x : from;
    s.hi.lag = s.still ? s.hi.x : from;

    return {
      step: () => {
        swing(s.lo);
        swing(s.hi);

        // How pressed together the pair are, 0 to 1 - what lean and squash ride on.
        const need =
          (loBubble.offsetWidth + hiBubble.offsetWidth) / 2 + SHOVE_PAD;
        const target = Math.max(0, need - (s.hi.x - s.lo.x)) / need;
        s.shoveVel =
          (s.shoveVel + (target - s.shove) * SHOVE_STIFFNESS) * SHOVE_DAMPING;
        s.shove += s.shoveVel;

        if (s.still) {
          rest(s.lo);
          rest(s.hi);
          s.shove = target;
          s.shoveVel = 0;
          return false;
        }

        return (
          !settled(s.lo) ||
          !settled(s.hi) ||
          Math.abs(s.shoveVel) > 0.001 ||
          Math.abs(target - s.shove) > 0.002
        );
      },
      paint: () => {
        const squash = Math.min(Math.max(s.shove, 0), 1) * 0.16;
        const loStretch = stretchOf(s.lo);
        const hiStretch = stretchOf(s.hi);
        const loSwing = tiltOf(s.lo);
        const hiSwing = tiltOf(s.hi);
        const loBox = boxOf(
          loBubble,
          scaleXof(loStretch, squash),
          1 + loStretch,
        );
        const hiBox = boxOf(
          hiBubble,
          scaleXof(hiStretch, squash),
          1 + hiStretch,
        );

        // Both tails stay pinned to their marks, so leaning further is the only
        // way out of an overlap. Monotonic in `lean`, so a bisection finds the
        // shallowest one that still leaves SHOVE_CLEAR between the bodies.
        const gapAt = (lean: number) =>
          gapBetween(
            cornersOf(loBox, loSwing - lean, s.lo.x),
            cornersOf(hiBox, hiSwing + lean, s.hi.x),
          );

        let lean = 0;
        if (gapAt(0) < SHOVE_CLEAR) {
          let over = SHOVE_LEAN;
          for (let i = 0; i < 12; i += 1) {
            const mid = (lean + over) / 2;
            if (gapAt(mid) < SHOVE_CLEAR) lean = mid;
            else over = mid;
          }
          lean = over;
        }

        lo.style.transform = `translateX(${s.lo.x}px)`;
        hi.style.transform = `translateX(${s.hi.x}px)`;
        loBubble.style.transform = bubbleTransform(
          loSwing - lean,
          loStretch,
          squash,
        );
        hiBubble.style.transform = bubbleTransform(
          hiSwing + lean,
          hiStretch,
          squash,
        );
        fill.style.transform = `translateX(${s.lo.x}px) scaleX(${
          s.width ? (s.hi.x - s.lo.x) / s.width : 0
        })`;
      },
    };
  });

  React.useEffect(() => {
    state.current.still = reducedMotion;
    wake();
  }, [reducedMotion, wake]);

  React.useEffect(() => {
    const s = state.current;
    s.lower = lower;
    s.upper = upper;
    s.lo.x = atRef.current(lower, s.width);
    s.hi.x = atRef.current(upper, s.width);
    if (s.still) {
      rest(s.lo);
      rest(s.hi);
    }
    wake();
  }, [lower, upper, wake]);

  React.useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const observer = new ResizeObserver(([entry]) => {
      const s = state.current;
      s.width = entry!.contentRect.width;
      s.lo.x = atRef.current(s.lower, s.width);
      s.hi.x = atRef.current(s.upper, s.width);
      rest(s.lo);
      rest(s.hi);
      wake();
    });
    observer.observe(track);

    return () => observer.disconnect();
  }, [wake]);

  // The lower mark on the track is whichever of the two is smaller, but which
  // label it carries depends on whether the guess came in under or over.
  const loKind = guessIsLower ? "guess" : "actual";
  const hiKind = guessIsLower ? "actual" : "guess";
  const caption = (kind: string) =>
    kind === "guess" ? "Your guess" : "Actual";

  return (
    <div className="bubble-track" ref={trackRef}>
      <div className="bubble-fill" ref={fillRef} />

      <Marks marks={marks} min={min} max={max} active={null} />

      <div className="bubble-anchor" ref={loRef}>
        <span className="bubble-thumb" />
        <div className={`bubble bubble--${loKind}`} ref={loBubbleRef}>
          <span className="bubble-caption">{caption(loKind)}</span>
          <Money label={format(lower)} />
        </div>
      </div>

      <div className="bubble-anchor" ref={hiRef}>
        <span className="bubble-thumb" />
        <div className={`bubble bubble--${hiKind}`} ref={hiBubbleRef}>
          <span className="bubble-caption">{caption(hiKind)}</span>
          <Money label={format(upper)} />
        </div>
      </div>
    </div>
  );
};

// ── The pair, picked by shape of `value` ──

export default function BubbleSlider({
  value,
  onChange,
  min = 0,
  max = 1000,
  marks,
  format,
  disabled,
  color,
  ariaLabel,
}: BubbleSliderProps) {
  const common = { min, max, marks, format, color };
  const isRange = Array.isArray(value);

  return (
    <div
      className={`bubble-slider${isRange ? " bubble-slider--reveal" : ""}`}
      data-color={color}
    >
      {isRange ? (
        <RevealBubbles {...common} value={value} />
      ) : (
        <SingleBubble
          {...common}
          value={value}
          onChange={onChange}
          disabled={disabled}
          ariaLabel={ariaLabel}
        />
      )}
    </div>
  );
}
