// nool: the D2 project page's "algebra" demo card, as a study — the small
// nool: (−🍄 + ⭐) + 🐢 with commutativity and operand associativity only.
//
// Source: declarative-dragging.github.io/page/themes/demos/algebra.tsx (the
// card's themed, cut-down copy of animate-algebra/tree.tsx). Everything from
// "# State & initial states" to "# The card" is that file verbatim; edits
// are marked `nool edit`:
// - imports: the vendored library and ../animate-algebra/asts instead of the
//   `dragology` package and the page's demo-logic copy
// - INK/RED: the page palette's values, inlined
// - the card's theme context (scheme + variant) becomes an icon-set radio in
//   the standard demo shell; the default is the page's ("four" scheme, its
//   first variant: ⭐ for ⛅, 🐢 for a 🍄)
//
// Its original header:
//
// > src/demos/animate-algebra/tree.tsx, themed, as the D2 page's card shows
// > it: (-🍄 + ⛅) + 🍄, with just commutativity and associativity. Minimal:
// > the cloud becomes something red to grab that isn't another mushroom.
// > Four colors: the mushroom and the rest in the other colors. Boxes take the page's
// > warm grays; the one you hold, if it can go anywhere, is outlined in red,
// > its operator too. An only child that can't go anywhere (the 🍄 in -🍄)
// > hands its drags to its parent, so pressing it drags the whole -🍄.

// nool edit: imports
import * as _ from "lodash-es";
import { ReactNode, useMemo, useState } from "react";
import { demo } from "../../demo";
import {
  ConfigPanel,
  ConfigRadio,
  DemoDraggable,
  DemoWithConfig,
} from "../../demo/ui";
import { type Draggable } from "../../draggable";
import { type DragSpecBuilder } from "../../DragSpec";
import { type Svgx } from "../../svgx";
import { translate } from "../../svgx/helpers";
import {
  allPossibleRewrites,
  rewr,
  Rewrite,
  Tree,
} from "../animate-algebra/asts";

// nool edit: the D2 page palette's (page/themes/palette.ts)
const INK = "#1d1d1f";
const RED = "#dc3400";

// # State & initial states

type State = Tree;

export const initialState: State = {
  id: "root",
  label: "+",
  children: [
    {
      id: "root-1",
      label: "+",
      children: [
        {
          id: "root-1-1",
          label: "+",
          children: [
            { id: "root-1-1-1", label: "⛅", children: [] },
            {
              id: "root-1-1-2",
              label: "-",
              children: [{ id: "root-1-1-2-1", label: "🍄", children: [] }],
            },
          ],
        },
        { id: "root-1-2", label: "🍄", children: [] },
      ],
    },
    {
      id: "root-2",
      label: "+",
      children: [
        {
          id: "root-2-1",
          label: "×",
          children: [
            { id: "root-2-1-1", label: "🎲", children: [] },
            { id: "root-2-1-2", label: "🦠", children: [] },
          ],
        },
        {
          id: "root-2-2",
          label: "×",
          children: [
            { id: "root-2-2-1", label: "🎲", children: [] },
            { id: "root-2-2-2", label: "🐝", children: [] },
          ],
        },
      ],
    },
  ],
};

// # Rewrite rules

type RewriteSet = {
  rewrites: Rewrite[];
  title: ReactNode;
  subtitle?: ReactNode;
  defaultEnabled?: boolean;
};

export const rewriteSets: RewriteSet[] = [
  {
    title: <>Identity</>,
    rewrites: [rewr("(+ (0) #A)", "A"), rewr("(+ #A (0))", "A")],
    defaultEnabled: true,
  },
  {
    title: <>Identity (reverse)</>,
    rewrites: [rewr("#A", "(+ (0) A)")],
    defaultEnabled: true,
  },
  {
    title: <>Commutativity</>,
    rewrites: [rewr("(+ #A #B)", "(+ B A)"), rewr("(× #A #B)", "(× B A)")],
    defaultEnabled: true,
  },
  {
    title: <>Associativity</>,
    subtitle: <>Pull up op</>,
    rewrites: [
      rewr("(+2 #(+1 A B) C)", "(+1 A (+2 B C))"),
      rewr("(+1 A #(+2 B C))", "(+2 (+1 A B) C)"),
      rewr("(×2 #(×1 A B) C)", "(×1 A (×2 B C))"),
      rewr("(×1 A #(×2 B C))", "(×2 (×1 A B) C)"),
    ],
  },
  {
    title: <>Associativity</>,
    subtitle: <>Pull down op</>,
    rewrites: [
      rewr("#(+1 A (+2 B C))", "(+2 (+1 A B) C)"),
      rewr("#(+2 (+1 A B) C)", "(+1 A (+2 B C))"),
      rewr("#(×1 A (×2 B C))", "(×2 (×1 A B) C)"),
      rewr("#(×2 (×1 A B) C)", "(×1 A (×2 B C))"),
    ],
  },
  {
    title: <>Associativity</>,
    subtitle: <>Pull up operand</>,
    rewrites: [
      rewr("(+2 (+1 #A B) C)", "(+1 A (+2 B C))"),
      rewr("(+1 A (+2 B #C))", "(+2 (+1 A B) C)"),
      rewr("(×2 (×1 #A B) C)", "(×1 A (×2 B C))"),
      rewr("(×1 A (×2 B #C))", "(×2 (×1 A B) C)"),
    ],
  },
  {
    title: <>Associativity</>,
    subtitle: <>Pull down operand</>,
    rewrites: [
      rewr("(+1 #A (+2 B C))", "(+2 (+1 A B) C)"),
      rewr("(+2 (+1 A B) #C)", "(+1 A (+2 B C))"),
      rewr("(×1 #A (×2 B C))", "(×2 (×1 A B) C)"),
      rewr("(×2 (×1 A B) #C)", "(×1 A (×2 B C))"),
    ],
  },
  {
    title: <>Distributivity</>,
    subtitle: <>Distribute (drag +)</>,
    rewrites: [
      rewr("(× A #(+ B C))", "(+ (× A B) (× A C))"),
      rewr("(× #(+ B C) A)", "(+ (× B A) (× C A))"),
    ],
  },
  {
    title: <>Distributivity</>,
    subtitle: <>Distribute (drag operand)</>,
    rewrites: [
      rewr("(× #A (+ B C))", "(+ (× A B) (× A C))"),
      rewr("(× (+ B C) #A)", "(+ (× B A) (× C A))"),
    ],
  },
  {
    title: <>Distributivity</>,
    subtitle: <>Factor (drag +)</>,
    rewrites: [
      rewr("#(+ (× A B) (× A C))", "(× A (+ B C))"),
      rewr("#(+ (× B A) (× C A))", "(× A (+ B C))"),
    ],
  },
  {
    title: <>Distributivity</>,
    subtitle: <>Factor (drag operand)</>,
    rewrites: [
      rewr("(+ (× #A B) (× A C))", "(× A (+ B C))"),
      rewr("(+ (× A B) (× #A C))", "(× A (+ B C))"),
      rewr("(+ (× B #A) (× C A))", "(× A (+ B C))"),
      rewr("(+ (× B A) (× C #A))", "(× A (+ B C))"),
    ],
  },
  {
    title: <>Associativity</>,
    subtitle: (
      <>
        Pull op sideways
        <br />
        <span className="italic text-red-500">
          (Conflicts with commutativity!)
        </span>
      </>
    ),
    rewrites: [
      rewr("(+2 #(+1 A B) C)", "(+2 A #(+1 B C))"),
      rewr("(+1 A #(+2 B C))", "(+1 #(+2 A B) C)"),
      rewr("(×2 #(×1 A B) C)", "(×2 A #(×1 B C))"),
      rewr("(×1 A #(×2 B C))", "(×1 #(×2 A B) C)"),
    ],
  },
];

// # Tree rendering

export type Config = {
  activeRewriteSets: boolean[];
  enableEmergeAnimation: boolean;
  forceTransformScale: boolean;
};

export function draggableFactory(config: Config): Draggable<State> {
  const activeRewrites = _.zip(rewriteSets, config.activeRewriteSets).flatMap(
    ([set, enabled]) => (enabled ? set!.rewrites : []),
  );
  return ({ state, d, draggedId }) => {
    const passUp = passesUp(state, activeRewrites);
    // the node that's actually moving: the one grabbed, or what it passed up to
    const heldId = draggedId && (passUp.get(draggedId) ?? draggedId);
    return renderTree(
      state,
      state,
      d,
      activeRewrites,
      config,
      0,
      heldId,
      false,
      passUp,
    ).element;
  };
}

/** Only children that can't move on their own, and the ancestor whose drag
 * each takes over (its parent, or further up if that passes up too) */
function passesUp(state: State, rewrites: Rewrite[]): Map<string, string> {
  const up = new Map<string, string>();
  const visit = (tree: Tree, to: string | null) => {
    const passes =
      to !== null && allPossibleRewrites(state, rewrites, tree.id).length === 0;
    if (passes) up.set(tree.id, to);
    const only = tree.children.length === 1;
    for (const c of tree.children)
      visit(c, only ? (passes ? to : tree.id) : null);
  };
  visit(state, null);
  return up;
}

function renderTree(
  state: State,
  tree: Tree,
  d: DragSpecBuilder<State>,
  activeRewrites: Rewrite[],
  config: Config,
  depth: number,
  heldId: string | null,
  isDragged: boolean,
  passUp: Map<string, string>,
): {
  element: Svgx;
  w: number;
  h: number;
  id: string;
} {
  isDragged = isDragged || tree.id === heldId;

  const GAP = 10;
  const PADDING = 5;
  const LABEL_WIDTH = 20;
  const LABEL_MIN_HEIGHT = 20;

  const renderedChildren = tree.children.map((child) =>
    renderTree(
      state,
      child,
      d,
      activeRewrites,
      config,
      depth + 1,
      heldId,
      isDragged,
      passUp,
    ),
  );

  const renderedChildrenElements: Svgx[] = [];
  let childY = 0;
  for (const childR of renderedChildren) {
    renderedChildrenElements.push(
      <g transform={translate(0, childY)}>{childR.element}</g>,
    );
    childY += childR.h + GAP;
  }

  const innerW =
    LABEL_WIDTH +
    (renderedChildren.length > 0
      ? GAP + _.max(renderedChildren.map((c) => c.w))!
      : 0);
  const innerH =
    renderedChildren.length > 0
      ? _.sumBy(renderedChildren, (c) => c.h) +
        GAP * (renderedChildren.length - 1)
      : LABEL_MIN_HEIGHT;

  const w = innerW + PADDING * 2;
  const h = innerH + PADDING * 2;
  const rx = Math.min(14, 0.3 * Math.min(w, h));
  const dragAs = passUp.get(tree.id) ?? tree.id;
  // red only on what can actually move
  const held =
    tree.id === heldId &&
    allPossibleRewrites(state, activeRewrites, tree.id).length > 0;

  // Subtle warm fill that deepens with nesting
  const alpha = Math.min(0.02 + depth * 0.03, 0.15);
  const fill = `rgba(180, 170, 150, ${alpha})`;
  const strokeAlpha = Math.min(0.25 + depth * 0.08, 0.5);
  const stroke = `rgba(140, 130, 115, ${strokeAlpha})`;

  const element = (
    <g
      id={tree.id}
      dragologyOnDrag={() => dragTargets(d, state, dragAs, activeRewrites)}
      dragologyZIndex={depth + (isDragged ? 1000 : 0)}
      dragologyEmergeFrom={
        config.enableEmergeAnimation ? tree.emergeFrom : undefined
      }
      dragologyEmergeMode={
        tree.emergeMode ?? (config.forceTransformScale ? "scale" : undefined)
      }
    >
      <rect
        x={0}
        y={0}
        width={w}
        height={h}
        rx={rx}
        stroke={held ? RED : stroke}
        strokeWidth={held ? 1.5 : 0.75}
        fill={fill}
        // fill="transparent"
      />
      <text
        x={PADDING + LABEL_WIDTH / 2}
        y={PADDING + innerH / 2}
        dominantBaseline="middle"
        textAnchor="middle"
        fontSize={18}
        fill={held ? RED : INK}
      >
        {tree.label}
      </text>
      {renderedChildren.length > 0 && (
        <g transform={translate(PADDING + LABEL_WIDTH + GAP, PADDING)}>
          {renderedChildrenElements}
        </g>
      )}
    </g>
  );

  return { element, w, h, id: tree.id };
}

function dragTargets(
  d: DragSpecBuilder<State>,
  state: State,
  draggedKey: string,
  activeRewrites: Rewrite[],
) {
  const newTrees = allPossibleRewrites(state, activeRewrites, draggedKey);
  if (newTrees.length === 0) return d.between([state]);
  return d
    .closest(
      newTrees.map((newTree) => d.between([state, newTree])),
      { lockPast: 20 },
    )
    .withSnapRadius(1, { chain: true });
}

// # The card

export const VARIANTS = {
  minimal: [
    { key: "magnet", label: "🧲 for ⛅" },
    { key: "cherries", label: "🍒 for ⛅" },
    { key: "balloon", label: "🎈 for ⛅" },
  ],
  four: [
    { key: "star-koopa", label: "⭐ for ⛅, 🐢 for a 🍄" },
    { key: "star", label: "⭐ for ⛅" },
  ],
};

/** The leaves of (-a + b) + c */
const LEAVES: Record<string, [string, string, string]> = {
  magnet: ["🍄", "🧲", "🍄"],
  cherries: ["🍄", "🍒", "🍄"],
  balloon: ["🍄", "🎈", "🍄"],
  star: ["🍄", "⭐", "🍄"],
  "star-koopa": ["🍄", "⭐", "🐢"],
};

// Commutativity (2); Associativity: pull up operand (5), pull down operand (6)
const algebraCard = draggableFactory({
  activeRewriteSets: rewriteSets.map((_, i) => i === 2 || i === 5 || i === 6),
  enableEmergeAnimation: true,
  forceTransformScale: false,
});
const leaf = (id: string, label: string) => ({ id, label, children: [] });

// nool edit: the variant comes in as a prop (was useDemoTheme())
export function Algebra({ variant }: { variant: string }) {
  const [a, b, c] = LEAVES[variant] ?? LEAVES.magnet;
  const initialState = useMemo(
    () => ({
      id: "root-1",
      label: "+",
      children: [
        {
          id: "root-1-1",
          label: "+",
          children: [
            {
              id: "root-1-1-2",
              label: "-",
              children: [leaf("root-1-1-2-1", a)],
            },
            leaf("root-1-1-1", b),
          ],
        },
        leaf("root-1-2", c),
      ],
    }),
    [a, b, c],
  );
  return (
    <DemoDraggable
      key={variant}
      draggable={algebraCard}
      initialState={initialState}
      width={300}
      height={350}
    />
  );
}

// nool edit: the study's shell — every variant the card has, the page's
// default first
const ICON_SETS = [...VARIANTS.four, ...VARIANTS.minimal];

// nool edit: framed as the card frames it (page/themes/cards.tsx: the
// smallest square the card shows is 166 canvas px, padded 8), enlarged so the
// tree reads at study size; room is left for the moves that widen it
const VIEW_W = 210;
const VIEW_H = 200;
const ZOOM = 1.9;

export default demo(
  () => {
    const [variant, setVariant] = useState(ICON_SETS[0].key);
    return (
      <DemoWithConfig>
        <div
          style={{
            width: VIEW_W * ZOOM,
            height: VIEW_H * ZOOM,
            padding: 8 * ZOOM,
            boxSizing: "content-box",
            overflow: "hidden",
          }}
        >
          <div style={{ transform: `scale(${ZOOM})`, transformOrigin: "0 0" }}>
            <Algebra variant={variant} />
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <ConfigPanel title="Icons">
            <ConfigRadio
              value={variant}
              onChange={setVariant}
              options={Object.fromEntries(
                ICON_SETS.map((v) => [v.key, v.label]),
              )}
            />
          </ConfigPanel>
        </div>
      </DemoWithConfig>
    );
  },
  {
    tags: [
      "d.between",
      "d.closest",
      "spec.withSnapRadius [chain]",
      "dragologyEmergeFrom",
      "nool",
    ],
  },
);
