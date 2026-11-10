// nool: the whiteboard's tree sketches as a standalone demo — a few `+`
// trees, four rules, drawn the way the June 2023 whiteboard draws them. Not an upstream Dragology demo; the draggable is
// ./wb.tsx (from the D2 project page), the shell is the same demo() /
// DemoDraggable / ConfigPanel kit the animate-algebra demos use.

import { useMemo, useState } from "react";
import { demo } from "../../demo";
import {
  ConfigCheckbox,
  ConfigPanel,
  ConfigRadio,
  DemoDraggable,
  DemoWithConfig,
} from "../../demo/ui";
import {
  fitTree,
  HAND,
  initialState,
  INK,
  RULES,
  type WBOptions,
  wbDraggable,
} from "./wb";

// The sketches: the board's two close-ups, and a bigger one from the talk
const SKETCHES = {
  "(+ C (+ B A))": "(+ C (+ B A))",
  "(+ A 0)": "(+ A 0)",
  "(+ (+ A 0) (+ B C))": "(+ (+ A 0) (+ B C))",
} as const;
type SketchSrc = keyof typeof SKETCHES;

type Arrows = WBOptions["arrows"];

const W = 440;
const H = 400;

function Legend() {
  return (
    <div className="flex flex-col gap-1 text-xs">
      {RULES.map((r) => (
        <span key={r.key} className="flex items-center gap-1.5">
          <svg width="26" height="14" viewBox="0 0 26 14">
            <path
              d="M 2 7 L 22 7 M 16 2 L 22 7 L 16 12"
              stroke={r.color}
              strokeWidth={3}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span style={{ fontFamily: HAND, color: INK.blue, fontSize: 16 }}>
            {r.short[0]}
            {r.short[1] && <sub>{r.short[1]}</sub>}
          </span>
          <span className="font-mono">{r.name}</span>
        </span>
      ))}
    </div>
  );
}

export default demo(
  () => {
    const [src, setSrc] = useState<SketchSrc>("(+ C (+ B A))");
    const [arrows, setArrows] = useState<Arrows>("all");
    const [idleArrows, setIdleArrows] = useState(true);
    const [ghosts, setGhosts] = useState(true);

    const init = useMemo(() => initialState(src), [src]);
    // Fit the tree and everywhere its first moves go into the canvas, at
    // no more than the board's own size
    const fit = useMemo(
      () => fitTree(init.tree, W, H, { maxZoom: 1, pad: 40 }),
      [init],
    );
    const draggable = useMemo(
      () =>
        wbDraggable({
          root: fit.root,
          arrows,
          numbers: true,
          ghosts,
          idleArrows,
        }),
      [fit, arrows, ghosts, idleArrows],
    );

    return (
      <DemoWithConfig>
        <div
          style={{
            width: W,
            height: H,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              transform: `scale(${fit.zoom})`,
              transformOrigin: "0 0",
            }}
          >
            <DemoDraggable
              // a fresh tree whenever the sketch or drawing changes
              key={`${src} ${arrows} ${ghosts} ${idleArrows}`}
              draggable={draggable}
              initialState={init}
              width={fit.w}
              height={fit.h}
            />
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <ConfigPanel title="Sketch">
            <ConfigRadio
              value={src}
              onChange={setSrc}
              options={Object.keys(SKETCHES) as SketchSrc[]}
            />
          </ConfigPanel>
          <ConfigPanel title="Arrows">
            <ConfigRadio
              value={arrows}
              onChange={setArrows}
              options={{
                all: "every node that moves",
                dragged: "only the held node",
                none: "none",
              }}
            />
            <ConfigCheckbox value={idleArrows} onChange={setIdleArrows}>
              <span className="scaffold">
                Show the red node's arrows at rest
              </span>
            </ConfigCheckbox>
            <ConfigCheckbox value={ghosts} onChange={setGhosts}>
              <span className="scaffold">Blue o's where it would land</span>
            </ConfigCheckbox>
          </ConfigPanel>
          <ConfigPanel title="Rules">
            <Legend />
          </ConfigPanel>
        </div>
      </DemoWithConfig>
    );
  },
  { tags: ["d.closest", "d.between", "nool"] },
);
