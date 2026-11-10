// nool: copied from declarative-dragging.github.io/page/whiteboard.tsx.
// Edits (marked "nool edit"): imports point at the vendored Dragology and
// the whiteboard demo's wb.tsx, the accent is nool's green, and it exports
// mountWhiteboard() instead of running on load. The photo is
// public/whiteboard-2023-06.webp, resolved against the page's URL.

// The whiteboard photo on the D2 page, with two of its sketches brought to
// life. Hovering the photo rings the `+A0` sketch and the nested
// `+(C, +(B, A))` sketch, and lifts each out of its ring into a round
// bubble: it starts as exactly the photo's pixels inside the ring, then
// flies out, growing, and cross-fades to a live Dragology draggable of the
// same tree (whiteboard-live/wb.tsx, from the talk's d2-talk/whiteboard-live), drawn to line up with the ink.
// While they're out the photo washes back. Leaving the photo (and the
// bubbles) puts them back. After each move the nested tree glides back into
// its bubble (shrinking, once it's grown too big for it), so none of it is
// out of reach.
//
// On a touch screen there's no hover, so instead the nested sketch sits in a
// ring, and a tap on the photo lifts it the same way into one bubble nearly
// as tall as the photo, its nodes big enough for a finger. A tap on the
// photo around it, or its ×, puts it back.

import { DraggableRenderer, Vec2 } from "../dragology/lib";
import {
  type CSSProperties,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createRoot } from "react-dom/client";
import { holdDragTouches } from "./tap-to-wake";
import {
  initialState,
  layout,
  parseTree,
  wbDraggable,
  type WBOptions,
  type WBState,
} from "../dragology/demos/whiteboard/wb";

const PHOTO = "whiteboard-2023-06.webp";
const PHOTO_W = 1400;
const ACCENT = "#0a7d58"; // nool edit: the D2 page's is #dc3400
// How the photo washes back while the bubbles are out: toward the page, or
// darker (`?wash=dark`)
const WASH =
  new URLSearchParams(location.search).get("wash") === "dark"
    ? "dark"
    : "light";

type Side = "left" | "right";

type Sketch = {
  src: string;
  /** Where some of its nodes are on the photo, to line the live tree up with */
  anchors: Record<string, [number, number]>;
  /** The circle of the photo around the sketch and where its A can go: what the bubble lifts off */
  ring: { at: [number, number]; r: number };
  side: Side;
  /** Where its bubble's center goes, on the photo */
  out: [number, number];
  /** Its bubble's size, against the other's (a bigger ring needs a bigger bubble for the same size of letters) */
  size?: number;
  /** Where its "drag" ribbon sits on the bubble, in degrees (0 = right, -90 = top) */
  ribbonAt: number;
  /**
   * After each drop, its tree glides back to where it started out in the
   * bubble (by the middle of its nodes), or, if a move has grown it too big
   * for that, to the middle, shrinking to fit, so none of it is left
   * hanging off the rim
   */
  recenter?: boolean;
};

// Photo coordinates (px of the 1400×1131 photo), read off the photo.
const SKETCHES: Sketch[] = [
  {
    src: "(+ A 0)",
    anchors: { p1: [135, 420], A: [187, 377], z1: [187, 469] },
    // room around it for A's moves
    ring: { at: [200, 405], r: 120 },
    side: "left",
    // straight down from its ring, over it, sticking out past the photo's
    // left edge (placed by Andrew, 2026-10-30)
    out: [195, 566],
    ribbonAt: -132,
  },
  {
    src: "(+ C (+ B A))",
    // (its root `+` is p2: parseTree numbers a `+` after its children)
    anchors: {
      p2: [582, 415],
      C: [629, 375],
      p1: [625, 466],
      B: [665, 440],
      A: [664, 510],
    },
    // room for A's moves; C's long arrow up can run off it
    ring: { at: [655, 458], r: 118 },
    side: "right",
    // over the board's mostly bare right side, level with the other
    out: [1144, 567],
    size: 1.25,
    ribbonAt: -50,
    // drawn the size of its ink, A's moves can take it past the rim
    recenter: true,
  },
];

/**
 * On phones, just the one sketch: the nested one. It has the most to do
 * with a finger (five nodes with moves of their own; A alone can swap with
 * B, reassociate up into C's place, or take a 0 on either side, all short
 * hops between neighbors), where `+A0`'s A soon cancels its 0 and is left
 * on its own. And it's near the middle of the board, so it comes out about
 * where it is.
 */
const TAP_SKETCH: Sketch = {
  ...SKETCHES[1],
  // up and to the left, where the tree leaves room
  ribbonAt: -140,
};

/** How wide a node's grab circle is on a phone, at least, in page px */
const FINGER = 48;

const OPTS: Omit<WBOptions, "root"> = {
  arrows: "all",
  numbers: true,
  ghosts: true,
  idleArrows: true,
};

/**
 * The scale and offset that best carry the tree's laid-out positions onto
 * where its nodes are on the photo (least squares, no rotation).
 */
function photoFit(sk: Sketch): { s: number; t: Vec2 } {
  const pos = layout(parseTree(sk.src));
  const pairs = Object.entries(sk.anchors).map(([id, [x, y]]) => ({
    w: pos.get(id)!,
    n: Vec2(x, y),
  }));
  const mean = (vs: Vec2[]) => vs.reduce((a, b) => a.add(b)).div(vs.length);
  const wm = mean(pairs.map((p) => p.w));
  const nm = mean(pairs.map((p) => p.n));
  let num = 0;
  let den = 0;
  for (const { w, n } of pairs) {
    num += w.sub(wm).dot(n.sub(nm));
    den += w.sub(wm).len2();
  }
  const s = num / den;
  return { s, t: nm.sub(wm.mul(s)) };
}

/**
 * How a bubble `d` across draws its sketch: its ring of the photo fills the
 * bubble, and the live tree is drawn over the ink, so one fades into the
 * other.
 */
function frame(sk: Sketch, d: number) {
  const { s, t } = photoFit(sk);
  // the point of the photo at the bubble's center
  const c = Vec2(...sk.ring.at);
  // bubble px per photo px
  const k = d / (2 * sk.ring.r);
  // bubble px per unit of the tree's layout, whose root is at t on the photo
  const zoom = k * s;
  const rootPx = t
    .sub(c)
    .mul(k)
    .add(Vec2(d / 2, d / 2));
  return { zoom, root: rootPx.div(zoom), k, c };
}

/** The middle of the box around a tree's nodes, in its layout's units */
function nodesMid(tree: WBState["tree"]): Vec2 {
  const ps = [...layout(tree).values()];
  const xs = ps.map((p) => p.x);
  const ys = ps.map((p) => p.y);
  return Vec2(
    (Math.min(...xs) + Math.max(...xs)) / 2,
    (Math.min(...ys) + Math.max(...ys)) / 2,
  );
}

/**
 * Where a tree goes in its bubble: the middle of its nodes (`mid`) moved to
 * `at` and the tree scaled by `scale` around it, all in the layout's units
 * from where the root is drawn
 */
type Place = { at: Vec2; mid: Vec2; scale: number };

/**
 * Where to put a tree in a bubble whose middle is `c` and radius `r`: with
 * its nodes' middle at `home` (where the first tree's was) if all of it
 * fits there; otherwise in the middle, smaller if it has to be (to half
 * size, past which it's too small to work).
 */
function placeTree(
  tree: WBState["tree"],
  home: Vec2,
  c: Vec2,
  r: number,
): Place {
  // a node's glyph reaches this far from its center
  const GLYPH = 24;
  const ps = [...layout(tree).values()];
  const mid = nodesMid(tree);
  const reach = (at: Vec2) =>
    Math.max(...ps.map((p) => p.sub(mid).add(at).dist(c))) + GLYPH;
  if (reach(home) <= r) return { at: home, mid, scale: 1 };
  return { at: c, mid, scale: Math.max(0.5, Math.min(1, r / reach(c))) };
}

type Phase = "closed" | "open" | "closing";

// # One bubble

function Bubble({
  sk,
  d,
  photoScale,
  at,
  phase,
  delay,
  run,
  finger,
  controls,
  onDragging,
}: {
  sk: Sketch;
  /** Its diameter when out */
  d: number;
  /** Page px per photo px */
  photoScale: number;
  /** Its center when out, in px from the photo's top left */
  at: Vec2;
  phase: Phase;
  delay: number;
  /** Bumped each time the bubbles are all the way back, to start the trees over */
  run: number;
  /** Given, its nodes can be grabbed from at least this far across, in page px */
  finger?: number;
  /**
   * Given, it has a × that puts it back, and its × and reset sit at these
   * points (in px from its top left) instead of on its rim
   */
  controls?: { onClose: () => void; close: Vec2; reset: Vec2 };
  onDragging: (dragging: boolean) => void;
}) {
  const { zoom, root, k, c } = useMemo(() => frame(sk, d), [sk, d]);
  const home = c.mul(photoScale);
  const out = phase === "open";
  // (a fresh tree after each closing and reset: the renderer is keyed by
  // both, and stays mounted, hidden, while closed, so opening is instant)
  const init = useMemo(() => initialState(sk.src), [sk.src]);
  const start = useMemo(() => {
    const mid = nodesMid(init.tree);
    return { at: mid, mid, scale: 1, animate: false };
  }, [init]);
  const [place, setPlace] = useState<Place & { animate: boolean }>(start);
  // Once you've dragged in it, the ribbon goes and a reset button comes
  const [dragged, setDragged] = useState(false);
  const [changed, setChanged] = useState(false);
  const [resets, setResets] = useState(0);
  useEffect(() => {
    setDragged(false);
    setChanged(false);
    setPlace(start);
  }, [run, start]);

  // (under half the 82 between neighboring nodes, so no two overlap)
  const hitR = finger
    ? Math.ceil(Math.min(40, Math.max(28, finger / 2 / (zoom * place.scale))))
    : undefined;
  // Gliding, the drawing has room all round the bubble to glide into
  const pad = sk.recenter ? d / zoom / 2 : 0;
  const size = d / zoom + 2 * pad;
  // the drawing's offset in the bubble, in its units, so the tree's middle lands at place.at
  const shift = root
    .add(place.at)
    .sub(root.add(place.mid).add(Vec2(pad, pad)).mul(place.scale));
  const draggable = useMemo(
    () => wbDraggable({ ...OPTS, root: root.add(Vec2(pad, pad)), hitR }),
    [root, pad, hitR],
  );
  const onDrop = (s: WBState) => {
    // the bubble's middle and radius, in the layout's units from the root (a
    // little in from the rim)
    const r = d / 2 / zoom;
    const p = placeTree(s.tree, start.mid, Vec2(r, r).sub(root), r - 10);
    setPlace({ ...p, animate: true });
  };

  // In its ring it's the size of the ring; out, it's full size
  const offset = home.sub(at);
  const transform = out
    ? "translate(0px, 0px) scale(1)"
    : `translate(${offset.x}px, ${offset.y}px) scale(${photoScale / k})`;

  const style: CSSProperties = {
    left: at.x - d / 2,
    top: at.y - d / 2,
    width: d,
    height: d,
    transform,
    transitionDelay: out ? `${delay}ms` : "0ms",
    pointerEvents: out ? "auto" : "none",
  };

  return (
    <div
      className={`wb-bubble wb-${sk.side}${out ? " is-out" : ""}`}
      style={style}
    >
      <div className="wb-disc">
        <div
          className="wb-photo"
          style={{
            backgroundSize: `${PHOTO_W * k}px auto`,
            backgroundPosition: `${d / 2 - c.x * k}px ${d / 2 - c.y * k}px`,
            opacity: out ? 0 : 1,
            transitionDelay: out ? `${delay + 180}ms` : "0ms",
          }}
        />
        <div
          className="wb-live"
          style={{
            opacity: out ? 1 : 0,
            transitionDelay: out ? `${delay + 180}ms` : "0ms",
          }}
        >
          <div
            style={{
              width: size,
              height: size,
              transform: `translate(${shift.x * zoom}px, ${shift.y * zoom}px) scale(${zoom * place.scale})`,
              transformOrigin: "0 0",
              transition: place.animate
                ? "transform 450ms cubic-bezier(0.3, 0, 0.2, 1)"
                : undefined,
            }}
          >
            <DraggableRenderer
              key={`${run}-${resets}`}
              draggable={draggable}
              initialState={init}
              width={size}
              height={size}
              dragThreshold={0}
              onDragStatus={(st) => {
                onDragging(st.type === "dragging");
                if (st.type === "dragging") {
                  setDragged(true);
                  setChanged(true);
                }
              }}
              onDropState={sk.recenter ? onDrop : undefined}
            />
          </div>
        </div>
      </div>
      <Ribbon
        d={d}
        at={sk.ribbonAt}
        text="drag the A"
        shown={out && !dragged}
        delay={delay + 380}
      />
      <button
        className="wb-reset"
        title="Put it back"
        aria-label="Reset this sketch"
        style={{
          opacity: out && changed ? 1 : 0,
          pointerEvents: out && changed ? "auto" : "none",
          ...(controls && { left: controls.reset.x, top: controls.reset.y }),
        }}
        onClick={() => {
          setResets((n) => n + 1);
          setChanged(false);
          setPlace(start);
        }}
      >
        ↺
      </button>
      {controls && (
        <button
          className="wb-close"
          title="Back to the photo"
          aria-label="Put this sketch back"
          style={{
            left: controls.close.x,
            top: controls.close.y,
            opacity: out ? 1 : 0,
            pointerEvents: out ? "auto" : "none",
            transitionDelay: out ? `${delay + 380}ms` : "0ms",
          }}
          onClick={controls.onClose}
        >
          <svg width={12} height={12} viewBox="-6 -6 12 12" aria-hidden="true">
            <path
              d="M -4.5 -4.5 L 4.5 4.5 M 4.5 -4.5 L -4.5 4.5"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

// # The ribbon: a curved red band on the bubble's rim, in the page's
// Best Paper badge style (white mono on plain red, ends cut at a slant,
// a nick or two off the corners)

function Ribbon({
  d,
  at,
  text,
  shown,
  delay,
}: {
  d: number;
  at: number;
  text: string;
  shown: boolean;
  delay: number;
}) {
  const c = d / 2;
  const r0 = c - 1;
  const r1 = c + 21;
  const rm = (r0 + r1) / 2 + 1;
  // wide enough for the text at the middle radius
  const span = ((text.length * 8.4 + 26) / rm) * (180 / Math.PI);
  const a0 = at - span / 2;
  const a1 = at + span / 2;
  const P = (r: number, deg: number) => {
    const a = (deg * Math.PI) / 180;
    return `${(c + r * Math.cos(a)).toFixed(2)} ${(c + r * Math.sin(a)).toFixed(2)}`;
  };
  // Slanted ends: the outer edge runs a few degrees past the inner one at the
  // start and falls short at the end, like the badge's skew
  const slant = 2.2;
  const nick = 0.9;
  const band = [
    `M ${P(r0, a0)}`,
    `A ${r0} ${r0} 0 0 1 ${P(r0, a1 - nick)}`,
    `L ${P(r0 + 3, a1)}`,
    `L ${P(r1 - 2, a1 - slant)}`,
    `L ${P(r1, a1 - slant - nick * 1.6)}`,
    `A ${r1} ${r1} 0 0 0 ${P(r1, a0 - slant + nick)}`,
    `L ${P(r1 - 4, a0 - slant)}`,
    `L ${P(r0 + 2, a0 - 0.3)}`,
    "Z",
  ].join(" ");
  const id = `wb-ribbon-${Math.round(at)}`;
  return (
    <svg
      className="wb-ribbon"
      width={d}
      height={d}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown
          ? "rotate(0deg) scale(1)"
          : `rotate(${at > -90 ? 6 : -6}deg) scale(0.96)`,
        transitionDelay: shown ? `${delay}ms` : "0ms",
      }}
      aria-hidden="true"
    >
      <defs>
        <path
          id={id}
          d={`M ${P(rm, a0 - 0.6)} A ${rm} ${rm} 0 0 1 ${P(rm, a1 - 0.6)}`}
        />
      </defs>
      <path d={band} fill={ACCENT} />
      <text
        fontFamily={`"Cutive Mono", "Courier New", monospace`}
        fontSize={14}
        fill="white"
        dominantBaseline="central"
      >
        <textPath href={`#${id}`} startOffset="50%" textAnchor="middle">
          {text}
        </textPath>
      </text>
    </svg>
  );
}

// # The overlay: both bubbles, the rings on the board, and the lines between

function Bubbles({ img }: { img: HTMLImageElement }) {
  const [size, setSize] = useState({ w: img.clientWidth, h: img.clientHeight });
  const [phase, setPhase] = useState<Phase>("closed");
  const [run, setRun] = useState(0);
  const draggingRef = useRef(new Set<number>());
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  useLayoutEffect(() => {
    const ro = new ResizeObserver(() =>
      setSize({ w: img.clientWidth, h: img.clientHeight }),
    );
    ro.observe(img);
    return () => ro.disconnect();
  }, [img]);

  const photoScale = size.w / PHOTO_W;
  const d = Math.round(Math.min(320, Math.max(220, size.w * 0.42)));

  // Where each bubble goes, kept on screen
  const [pageW, setPageW] = useState(document.documentElement.clientWidth);
  useEffect(() => {
    const onResize = () => setPageW(document.documentElement.clientWidth);
    addEventListener("resize", onResize);
    return () => removeEventListener("resize", onResize);
  }, []);
  const imgLeft = img.getBoundingClientRect().left + scrollX;
  const ds = SKETCHES.map((sk) => Math.round(d * (sk.size ?? 1)));
  const spots = SKETCHES.map((sk, i) => {
    const p = Vec2(...sk.out).mul(photoScale);
    const lo = ds[i] / 2 + 10 - imgLeft;
    const hi = pageW - ds[i] / 2 - 10 - imgLeft;
    return Vec2(Math.min(hi, Math.max(lo, p.x)), p.y);
  });

  // Out while the pointer is over the photo or a bubble (or dragging in
  // one), back as soon as it leaves both. Either way round, the bubbles
  // turn around from wherever they are.
  useEffect(() => {
    let doneTimer = 0;
    const open = () => {
      if (phaseRef.current === "open") return;
      clearTimeout(doneTimer);
      setPhase("open");
    };
    const close = () => {
      if (phaseRef.current !== "open" || draggingRef.current.size) return;
      setPhase("closing");
      doneTimer = window.setTimeout(() => {
        setPhase("closed");
        setRun((r) => r + 1);
      }, 420);
    };
    const onMove = (e: PointerEvent) => {
      if (draggingRef.current.size) return;
      const r = img.getBoundingClientRect();
      const inPhoto =
        e.clientX >= r.left &&
        e.clientX <= r.right &&
        e.clientY >= r.top &&
        e.clientY <= r.bottom;
      const p = phaseRef.current;
      const inBubble =
        p === "open" &&
        [...document.querySelectorAll(".wb-bubble")].some((b) => {
          const br = b.getBoundingClientRect();
          const cx = br.left + br.width / 2;
          const cy = br.top + br.height / 2;
          // the ribbon sticks out past the rim
          return Math.hypot(e.clientX - cx, e.clientY - cy) < br.width / 2 + 26;
        });
      if (inPhoto || inBubble) open();
      else close();
    };
    const onLeaveWindow = (e: PointerEvent) => {
      if (!e.relatedTarget) close();
    };
    document.addEventListener("pointermove", onMove);
    document.documentElement.addEventListener("pointerleave", onLeaveWindow);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener(
        "pointerleave",
        onLeaveWindow,
      );
      clearTimeout(doneTimer);
    };
  }, [img]);

  const out = phase === "open";
  useEffect(() => {
    img.classList.toggle("wb-washed", out);
  }, [img, out]);
  return (
    <div
      className={`wb-overlay${phase === "closed" ? " is-closed" : ""}`}
      style={{ width: size.w, height: size.h }}
    >
      <svg className="wb-marks" width={size.w} height={size.h}>
        {SKETCHES.map((sk, i) => {
          // the part of the photo the bubble lifts off (and lands back in)
          const c = Vec2(...sk.ring.at).mul(photoScale);
          const r = sk.ring.r * photoScale;
          const to = spots[i];
          const u = to.sub(c).norm();
          const a = c.add(u.mul(r + 3));
          const b = to.sub(u.mul(ds[i] / 2 + 2));
          // a line between them, if they don't overlap
          const apart = to.dist(c) > r + ds[i] / 2 + 12;
          return (
            <g key={sk.src}>
              <circle
                {...c.cxy()}
                r={r}
                fill="none"
                stroke={ACCENT}
                strokeWidth={1.75}
                strokeDasharray="6 5"
                style={{ opacity: phase === "closed" ? 0 : 1 }}
              />
              {apart && (
                <line
                  {...a.xy1()}
                  {...b.xy2()}
                  stroke={ACCENT}
                  strokeWidth={1.5}
                  style={{
                    opacity: out ? 1 : 0,
                    transitionDelay: out ? `${240 + i * 60}ms` : "0ms",
                  }}
                />
              )}
            </g>
          );
        })}
      </svg>
      {SKETCHES.map((sk, i) => (
        <Bubble
          key={sk.src}
          sk={sk}
          d={ds[i]}
          photoScale={photoScale}
          at={spots[i]}
          phase={phase}
          delay={i * 60}
          run={run}
          onDragging={(on) => {
            if (on) draggingRef.current.add(i);
            else draggingRef.current.delete(i);
          }}
        />
      ))}
    </div>
  );
}

// # On a touch screen: one sketch, out on a tap

/**
 * Its "tap me" tag, in one of a few styles to compare (?wbtag=1 to 4):
 * 1. on the board's white just up and right of the ring
 * 2. hanging off the ring on a short string
 * 3. a ribbon on the ring, like the bubble's "drag the A"
 * 4. in the board's bottom right corner, where the cards have theirs, but
 *    up on the white
 */
const TAG = (() => {
  const n = Number(new URLSearchParams(location.search).get("wbtag"));
  return [1, 2, 3, 4].includes(n) ? n : 1;
})();

/** The tag, while the sketch is in its photo (`c` and `r`: its ring, in page px) */
function TapTag({
  c,
  r,
  photoScale,
  shown,
}: {
  c: Vec2;
  r: number;
  photoScale: number;
  shown: boolean;
}) {
  const onPhoto = (x: number, y: number) => Vec2(x, y).mul(photoScale);
  const label = (at: Vec2, anchor: string) => (
    <span
      className="wb-tag"
      style={{
        left: at.x,
        top: at.y,
        translate: anchor,
        opacity: shown ? 1 : 0,
      }}
    >
      tap
      <br />
      me
    </span>
  );
  if (TAG === 1) return label(onPhoto(772, 290), "-50% -50%");
  if (TAG === 2) {
    // from the ring, down and right, to the tag's top
    const from = c.add(Vec2(1, 0).rotateDeg(58).mul(r));
    const to = from.add(Vec2(9, 13));
    return (
      <>
        <svg
          className="wb-marks"
          width={1}
          height={1}
          style={{ opacity: shown ? 1 : 0 }}
        >
          <line
            {...from.xy1()}
            {...to.xy2()}
            stroke={ACCENT}
            strokeWidth={1.5}
            strokeLinecap="round"
          />
          <circle {...from.cxy()} r={2} fill={ACCENT} />
        </svg>
        {label(to, "-50% 0")}
      </>
    );
  }
  if (TAG === 3)
    return (
      <div style={{ position: "absolute", left: c.x - r, top: c.y - r }}>
        <Ribbon d={2 * r} at={-50} text="tap me" shown={shown} delay={0} />
      </div>
    );
  return label(onPhoto(1290, 1008), "-100% -100%");
}

function TapBubble({ img }: { img: HTMLImageElement }) {
  const [size, setSize] = useState({ w: img.clientWidth, h: img.clientHeight });
  const [phase, setPhase] = useState<Phase>("closed");
  const [run, setRun] = useState(0);
  const draggingRef = useRef(false);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  useLayoutEffect(() => {
    const ro = new ResizeObserver(() =>
      setSize({ w: img.clientWidth, h: img.clientHeight }),
    );
    ro.observe(img);
    return () => ro.disconnect();
  }, [img]);

  const photoScale = size.w / PHOTO_W;
  // nearly as tall as the photo, in the middle of it
  const d = Math.round(Math.min(size.h - 12, size.w - 24));
  const at = Vec2(size.w / 2, size.h / 2);
  // Its × and reset in the photo's top and bottom right corners, where the
  // tree never goes (their centers, in px from the bubble's top left)
  const inset = 24;
  const corner = (y: number) =>
    Vec2(size.w - inset, y)
      .sub(at)
      .add(Vec2(d / 2, d / 2));

  // Out on a tap on the photo; back on a tap on the photo around it, or on
  // its ×. Either way round, it turns around from wherever it is.
  const { open, close } = useMemo(() => {
    let doneTimer = 0;
    return {
      open: () => {
        clearTimeout(doneTimer);
        setPhase("open");
      },
      close: () => {
        if (phaseRef.current !== "open" || draggingRef.current) return;
        setPhase("closing");
        doneTimer = window.setTimeout(() => {
          setPhase("closed");
          setRun((r) => r + 1);
        }, 420);
      },
    };
  }, []);
  useEffect(() => {
    const stage = img.parentElement!;
    const onClick = (e: MouseEvent) => {
      // (taps in the bubble are its own: its ×, its reset, its tree)
      if ((e.target as Element).closest(".wb-bubble")) return;
      if (phaseRef.current === "open") close();
      else open();
    };
    stage.addEventListener("click", onClick);
    return () => stage.removeEventListener("click", onClick);
  }, [img, open, close]);

  const out = phase === "open";
  useEffect(() => {
    img.classList.toggle("wb-washed", out);
  }, [img, out]);
  // the part of the photo it lifts off (and lands back in), ringed until then
  const c = Vec2(...TAP_SKETCH.ring.at).mul(photoScale);
  return (
    <div
      className="wb-overlay wb-tap"
      style={{ width: size.w, height: size.h }}
    >
      <svg className="wb-marks" width={size.w} height={size.h}>
        <circle
          {...c.cxy()}
          r={TAP_SKETCH.ring.r * photoScale}
          fill="none"
          stroke={ACCENT}
          strokeWidth={1.75}
          strokeDasharray="6 5"
        />
      </svg>
      <TapTag
        c={c}
        r={TAP_SKETCH.ring.r * photoScale}
        photoScale={photoScale}
        shown={phase === "closed"}
      />
      <div style={{ visibility: phase === "closed" ? "hidden" : "visible" }}>
        <Bubble
          sk={TAP_SKETCH}
          d={d}
          photoScale={photoScale}
          at={at}
          phase={phase}
          delay={0}
          run={run}
          finger={FINGER}
          controls={{
            onClose: close,
            close: corner(inset),
            reset: corner(size.h - inset),
          }}
          onDragging={(on) => {
            draggingRef.current = on;
          }}
        />
      </div>
    </div>
  );
}

// # Styles, for the elements made here

/**
 * A damped spring from 0 to 1, as a CSS `linear()` easing: past 1, back a
 * little short, settled by the end. (`damping` 1 wouldn't overshoot.)
 */
function springEasing(damping: number, n = 60): string {
  // stiff enough to be within 1% of rest by the end
  const w = -Math.log(0.01) / damping;
  const wd = w * Math.sqrt(1 - damping * damping);
  const x = (t: number) =>
    1 -
    Math.exp(-damping * w * t) *
      (Math.cos(wd * t) + ((damping * w) / wd) * Math.sin(wd * t));
  const pts = Array.from({ length: n + 1 }, (_, i) =>
    (i === n ? 1 : x(i / n)).toFixed(4),
  );
  return `linear(${pts.join(", ")})`;
}

const CSS = `
.wb-stage { position: relative; }
.wb-stage > img { display: block; transition: opacity 360ms ease, filter 360ms ease; }
.wb-stage > img.wb-washed { ${WASH === "dark" ? "filter: brightness(0.6) saturate(0.85);" : "opacity: 0.4;"} }
.wb-overlay { position: absolute; left: 0; top: 0; z-index: 6; pointer-events: none; }
.wb-overlay.is-closed { visibility: hidden; }
.wb-marks { position: absolute; left: 0; top: 0; overflow: visible; }
.wb-marks circle, .wb-marks line { transition: opacity 200ms ease; }
/* back smoothly; out on a spring (or, without linear(), one overshoot) */
.wb-bubble {
  position: absolute;
  transform-origin: 50% 50%;
  transition: transform 380ms cubic-bezier(0.5, 0, 0.3, 1);
  will-change: transform;
}
.wb-bubble.is-out {
  transition: transform 560ms cubic-bezier(0.34, 1.5, 0.64, 1);
  transition: transform 700ms ${springEasing(0.55)};
}
.wb-disc {
  position: absolute; inset: 0; border-radius: 50%; overflow: hidden;
  background: radial-gradient(ellipse at 30% 22%, #ffffff 0%, #f9f9f6 55%, #efeee8 100%);
  box-shadow: 0 0 0 2px ${ACCENT}, 0 18px 44px rgba(0, 0, 0, 0.2);
}
.wb-photo {
  position: absolute; inset: 0;
  background-image: url("${PHOTO}");
  background-repeat: no-repeat;
  transition: opacity 300ms ease;
}
.wb-live { position: absolute; inset: 0; transition: opacity 300ms ease; }
.wb-live svg { display: block; filter: url(#wb-marker); }
.wb-ribbon {
  position: absolute; left: 0; top: 0; overflow: visible; pointer-events: none;
  transform-origin: 50% 50%;
  transition: opacity 280ms ease, transform 420ms cubic-bezier(0.3, 1.5, 0.5, 1);
}
.wb-reset {
  position: absolute; left: 50%; bottom: -13px; translate: -50% 0;
  width: 26px; height: 26px; padding: 0; border-radius: 50%;
  border: 1.5px solid ${ACCENT}; background: white; color: ${ACCENT};
  font-size: 15px; line-height: 1; cursor: pointer;
  transition: opacity 240ms ease, background 160ms ease, color 160ms ease;
}
.wb-reset:hover { background: ${ACCENT}; color: white; }
.wb-hint { white-space: nowrap; }
.ink-draw { stroke-dasharray: 1; stroke-dashoffset: 1; animation: ink-draw 300ms ease-out forwards; }
@keyframes ink-draw { to { stroke-dashoffset: 0; } }
@media (prefers-reduced-motion: reduce) {
  .wb-bubble, .wb-bubble.is-out { transition: opacity 220ms ease; }
}
`;

// Phones: the photo is a button, and so are the bubble's × and reset, each
// with a finger's worth of room around it (where they go is set inline)
const TAP_CSS = `
.wb-tap-stage { cursor: pointer; -webkit-tap-highlight-color: transparent; }
.wb-tag {
  position: absolute;
  font: 0.8rem/1.1 "Cutive Mono", "Courier New", monospace; text-align: center;
  color: white; background: ${ACCENT}; border-radius: 4px; padding: 0.2em 0.45em;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
  transition: opacity 200ms ease;
}
.wb-tap .wb-reset, .wb-close {
  position: absolute; bottom: auto; translate: -50% -50%;
  width: 36px; height: 36px; padding: 0; border-radius: 50%;
  border: 1.5px solid ${ACCENT}; background: white; color: ${ACCENT};
  font-size: 19px; line-height: 1; cursor: pointer;
  display: grid; place-items: center;
  transition: opacity 240ms ease, background 160ms ease, color 160ms ease;
}
.wb-tap .wb-reset::after, .wb-close::after { content: ""; position: absolute; inset: -6px; border-radius: 50%; }
.wb-tap .wb-reset:hover { background: white; color: ${ACCENT}; }
.wb-tap .wb-reset:active, .wb-close:active { background: ${ACCENT}; color: white; }
`;

/**
 * A marker texture: a little displacement so the live strokes wobble like
 * ink. On phones it covers just the drawing's own box, to keep the buffer
 * it's rendered into small.
 */
const markerFilter = (tight: boolean) => `
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <filter id="wb-marker" ${tight ? `x="-5%" y="-5%" width="110%" height="110%"` : `filterUnits="userSpaceOnUse" x="-500" y="-500" width="4000" height="4000"`}>
    <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="7" result="n" />
    <feDisplacementMap in="SourceGraphic" in2="n" scale="3.2" xChannelSelector="R" yChannelSelector="G" />
  </filter>
</svg>`;

/**
 * nool edit: exported (the D2 page runs it on load). Brings the photo in
 * `figure` (default: the page's `figure.whiteboard`) to life.
 */
export async function mountWhiteboard(
  figure: HTMLElement | null = document.querySelector<HTMLElement>(
    "figure.whiteboard",
  ),
) {
  // With a mouse or trackpad the bubbles open on hover. On a touch screen,
  // one, on a tap.
  const hover = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const tap = !hover;
  const img = figure?.querySelector<HTMLImageElement>("img");
  if (!img) return;

  const style = document.createElement("style");
  style.textContent = tap ? CSS + TAP_CSS : CSS;
  document.head.append(style);
  // the hand-drawn numbers on the arrows
  const font = document.createElement("link");
  font.rel = "stylesheet";
  font.href =
    "https://fonts.googleapis.com/css2?family=Gochi+Hand&display=swap";
  document.head.append(font);
  document.body.insertAdjacentHTML("beforeend", markerFilter(tap));

  if (!img.complete)
    await new Promise((r) => img.addEventListener("load", r, { once: true }));
  await document.fonts.ready;

  const stage = document.createElement("div");
  stage.className = tap ? "wb-stage wb-tap-stage" : "wb-stage";
  img.replaceWith(stage);
  stage.append(img);
  const host = document.createElement("div");
  stage.append(host);
  createRoot(host).render(
    tap ? <TapBubble img={img} /> : <Bubbles img={img} />,
  );
  if (tap) {
    // a drag in the bubble never scrolls the page, and ends if iOS takes the touch back
    holdDragTouches(stage);
    return;
  }

  // nool edit: the hint goes before a `.wb-hint-before` in the caption, if
  // there is one, else at its end
  const caption = img.closest("figure")!.querySelector("figcaption");
  const hint = ` <span class="wb-hint">Hover over it to pick up two of its sketches.</span>`;
  const before = caption?.querySelector(".wb-hint-before");
  if (before) before.insertAdjacentHTML("beforebegin", hint);
  else caption?.insertAdjacentHTML("beforeend", hint);
}
