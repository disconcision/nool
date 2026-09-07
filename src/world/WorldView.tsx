/* World mode: an isometric three.js scene inhabited by expression trees.
 *
 * Tree lifecycle:
 *  - DORMANT: a rasterized sprite of the stage (html-to-image) on a
 *    ground-flat transparent plane inside the WebGL scene — fogged, lit,
 *    shadowed, occluded like any scenery.
 *  - WARM: approaching a tree pre-mounts its live DOM hidden, so the
 *    expensive Solid render happens during the walk, not at the moment
 *    of interaction (no wake hitch).
 *  - AWAKE (nearest tree in range; exactly one, since Motion/Drag/
 *    Navigate assume a singleton #main/#seed/#stage): the pre-mounted
 *    DOM becomes visible in a screen-space overlay anchored to the
 *    tree's projected world position. No transformed ancestors at rest,
 *    so drag ghosts and FLIP tweens behave exactly as in the sandbox.
 *    The noolbox is styled as a screen-level affordance (world.css).
 *  - Falling asleep re-rasterizes the live (possibly rewritten) stage
 *    BEFORE fading out (capture reads computed styles — a hidden tree
 *    rasterizes blank), then unmounts.
 *
 * Keyboard: arrows normally move the avatar. In select mode, waking a
 * tree hands the keyboard to it (arrows navigate, 1-4/space apply,
 * cmd-Z undo — the sandbox bindings); Escape hands it back to walking.
 * Drag mode never captures the keyboard. */

import { Component, createSignal, onCleanup, onMount } from "solid-js";
import { render } from "solid-js/web";
import { createStore } from "solid-js/store";
import { toPng } from "html-to-image";
import { go } from "../Update";
import * as Model from "../Model";
import * as Action from "../Action";
import * as Stage from "../Stage";
import * as Settings from "../Settings";
import * as ToolBox from "../ToolBox";
import * as Hover from "../Hover";
import * as Motion from "../motion/Motion";
import * as Drag from "../drag/Drag";
import * as Keyboard from "../Keyboard";
import { Seed } from "../view/SeedView";
import { id_at, size, freshen_all_ids } from "../syntax/Node";
import * as Sim from "./WorldSim";
import * as Scene from "./WorldScene";
import * as Grove from "./Grove";
import "./world.css";

const WAKE_IN = 2.8; /* surface distance to wake the nearest tree */
const WAKE_OUT = 4.2; /* surface distance to put the awake tree to sleep */
const WARM_IN = 9; /* pre-mount (hidden) inside this distance */
const WARM_OUT = 11; /* drop the pre-mount beyond this */
/* base em of a tree in world units (sandbox is 48px at 16px root);
 * applied as inherited font on the anchor so #main's 3em resolves to it */
const FONT_WORLD = 48 * Scene.CSS_SCALE;

const mk_model = (exp: import("../syntax/Exp").Exp): Model.t => ({
  stage: {
    ...Stage.put_exp(Model.init.stage, freshen_all_ids(exp)),
    selection: "unselected",
  },
  tools: { ...ToolBox.init },
  settings: { ...Settings.init },
  hover: Hover.init,
  history: { past: [], future: [] },
});

/* Same wiring as App's inject (click-path emerge/converge provenance +
 * motion wrapper), minus keyboard and persistence. */
const mk_inject = (
  model: Model.t,
  setModel: import("solid-js/store").SetStoreFunction<Model.t>
): Action.Inject => {
  return (a: Action.t) => {
    if (a.t === "setHover") {
      go(model, setModel, a);
      return;
    }
    const at_selection =
      (a.t === "transformNode" ||
        a.t === "transformNodeAndFlipTransform" ||
        a.t === "applyTransform" ||
        a.t === "applyTransformSelected") &&
      model.stage.selection !== "unselected"
        ? [...(model.stage.selection as number[])]
        : null;
    const exp_before = model.stage.exp;
    const mk_opts = at_selection
      ? (
          before: ReadonlyMap<string, unknown>,
          after: ReadonlyMap<string, unknown>
        ) =>
          Drag.provenance(
            exp_before,
            before,
            model.stage.exp,
            after,
            at_selection,
            `node-${id_at(at_selection, exp_before)}`
          )
      : undefined;
    Motion.animate(
      () => go(model, setModel, a),
      model.settings.motion !== "Off",
      mk_opts
    );
  };
};

const TreeApp: Component<{ model: Model.t; inject: Action.Inject }> = (
  props
) => (
  <div
    id="main"
    class={
      props.model.settings.theme +
      (props.model.stage.selection === "unselected" &&
      !props.model.settings.dragging
        ? " selected"
        : "")
    }
  >
    <Seed model={props.model} inject={props.inject} />
  </div>
);

type Host = {
  key: string;
  pos: Sim.Vec;
  anchor: HTMLDivElement;
  model: Model.t;
  inject: Action.Inject;
  dispose: (() => void) | null;
  lastSize: number;
  busy: boolean;
  /* offset of the stage's center within the anchor box: the anchor is
   * positioned so this point lands on the projected site — the same
   * point the sprite is centered on, so the swap doesn't drift */
  pin: { dx: number; dy: number };
};

const WorldView: Component = () => {
  const [energy, setEnergy] = createSignal(0);
  const [tending, setTending] = createSignal<string | null>(null);
  /* one player-level interaction mode, applied to whichever tree wakes */
  const [dragMode, setDragMode] = createSignal(Settings.init.dragging);
  /* select mode: the awake tree owns the keyboard until Escape */
  const [treeFocus, setTreeFocus] = createSignal(false);
  let hostsRef: Host[] = [];
  let container!: HTMLDivElement;
  let overlay!: HTMLDivElement;

  const toggleMode = () => {
    const v = !dragMode();
    setDragMode(v);
    const key = tending();
    const h = hostsRef.find((x) => x.key === key);
    if (h && h.model.settings.dragging !== v)
      h.inject({ t: "setSetting", action: "ToggleDragging" });
    setTreeFocus(!v && key !== null);
  };

  onMount(() => {
    const world = Sim.gen("nool-1");
    const handles = Scene.create(world);
    handles.webgl.domElement.classList.add("world-canvas");
    container.prepend(handles.webgl.domElement);

    let scatter = 0;
    const hosts: Host[] = world.trees.map((site) => {
      const anchor = document.createElement("div");
      anchor.className = "world-anchor";
      const exp =
        site.key === "gate"
          ? Grove.gate
          : site.key === "meadow"
          ? Model.init.stage.exp /* the classic seed, near spawn */
          : Grove.varieties[scatter++ % Grove.varieties.length];
      const [model, setModel] = createStore<Model.t>(mk_model(exp));
      return {
        key: site.key,
        pos: site.pos,
        anchor,
        model,
        inject: mk_inject(model, setModel),
        dispose: null,
        lastSize: size(model.stage.exp),
        busy: false,
        pin: { dx: 0, dy: 0 },
      };
    });
    hostsRef = hosts;

    /* dev console access */
    const dev: Record<string, unknown> = { handles, hosts, world };
    (window as unknown as { __world: unknown }).__world = dev;

    /* trees render at world scale via inherited font: #main's 3em
     * resolves against this, so no post-render override or reflow */
    const set_fonts = () => {
      const px = (FONT_WORLD * handles.pxPerUnit()) / 3;
      for (const h of hosts) h.anchor.style.fontSize = `${px}px`;
    };

    const resize = () => {
      handles.resize(window.innerWidth, window.innerHeight);
      set_fonts();
    };

    const measure_pin = (h: Host): void => {
      const stage = h.anchor.querySelector<HTMLElement>("#stage");
      if (!stage) return;
      const a = h.anchor.getBoundingClientRect();
      const s = stage.getBoundingClientRect();
      h.pin = { dx: s.x + s.width / 2 - a.x, dy: s.y + s.height / 2 - a.y };
    };

    const place = (h: Host): void => {
      /* pin the stage's center to the billboard's center (which stands
       * at half its height above the ground) so sprite and live DOM
       * occupy exactly the same pixels */
      const lift = handles.trees.get(h.key)?.plane.position.y ?? 0;
      const p = handles.project(h.pos, lift);
      h.anchor.style.left = `${p.x - h.pin.dx}px`;
      h.anchor.style.top = `${p.y - h.pin.dy}px`;
    };

    /* Trees render ONCE (first attach) and stay rendered forever; after
     * that, entering/leaving the document is a cheap appendChild/remove.
     * Detached subtrees keep their Solid reactivity but are invisible to
     * document.getElementById — which is what preserves the singleton
     * #main/#stage invariant with many trees, and what removes the
     * render stall from the approach path. */
    const attach = (h: Host): void => {
      if (!h.anchor.isConnected) overlay.appendChild(h.anchor);
      if (h.dispose === null)
        h.dispose = render(
          () => <TreeApp model={h.model} inject={h.inject} />,
          h.anchor
        );
      /* the world has one interaction mode; trees adopt it on attach */
      if (h.model.settings.dragging !== dragMode())
        h.inject({ t: "setSetting", action: "ToggleDragging" });
      measure_pin(h);
      place(h);
    };

    const detach = (h: Host): void => {
      h.anchor.classList.remove("on", "settled");
      h.anchor.remove();
    };

    /* make a mounted tree visible: the billboard sprite and the live DOM
     * have identical projection, so this is a swap between two renderings
     * of the same image — nothing moves or reshapes, ink comes alive */
    const show = (h: Host): void => {
      h.anchor.classList.add("on", "settled");
    };

    /* rasterize the live stage into the tree's world sprite. Must run
     * while the tree is still visible: the capture clones computed
     * styles, and a hidden ancestor makes every node rasterize blank. */
    const capture = async (h: Host): Promise<void> => {
      const stage = h.anchor.querySelector<HTMLElement>("#stage");
      if (!stage || stage.offsetWidth === 0) {
        console.warn("sprite capture skipped (detached/zero-size)", h.key);
        return;
      }
      try {
        const w = stage.offsetWidth;
        const hh = stage.offsetHeight;
        const url = await toPng(stage, { pixelRatio: 2 });
        const ppu = handles.pxPerUnit();
        handles.setSprite(h.key, url, w / ppu, hh / ppu);
      } catch (e) {
        console.warn("sprite capture failed", h.key, e);
      }
    };

    const sleep = async (h: Host): Promise<void> => {
      h.busy = true;
      /* capture FIRST (a hidden tree rasterizes blank), then crossfade
       * to the freshly-baked sprite standing in the same pixels */
      h.anchor.classList.remove("settled");
      await capture(h);
      h.anchor.classList.remove("on");
      await new Promise((r) => setTimeout(r, 180));
      detach(h);
      h.busy = false;
    };

    /* boot: render + rasterize each tree once (attached one at a time,
     * offscreen), nearest to spawn first so nearby sprites appear first.
     * The wake/warm machinery is held off until this finishes — its
     * distance-based detach sweep would rip trees out mid-capture. */
    let booting = true;
    void (async () => {
      const order = [...hosts].sort(
        (a, b) =>
          Math.hypot(a.pos.x - world.spawn.x, a.pos.z - world.spawn.z) -
          Math.hypot(b.pos.x - world.spawn.x, b.pos.z - world.spawn.z)
      );
      for (const h of order) {
        h.anchor.classList.add("offscreen");
        attach(h);
        show(h);
        await new Promise(requestAnimationFrame);
        await capture(h);
        detach(h);
        h.anchor.classList.remove("offscreen");
      }
      booting = false;
    })();

    resize();
    window.addEventListener("resize", resize);

    let av: Sim.Avatar = { pos: { ...world.spawn }, facing: 0 };
    let awake: string | null = null;

    const keys = new Set<string>();
    const keydown = (e: KeyboardEvent) => {
      /* tree focus: the awake tree owns the sandbox keybindings */
      if (treeFocus() && awake !== null) {
        /* a key held from before the handoff must not keep the avatar
         * walking underneath the focused tree */
        keys.delete(e.key);
        const h = hosts.find((x) => x.key === awake);
        if (!h || !h.anchor.isConnected) return;
        if (e.key === "Escape") {
          e.preventDefault();
          setTreeFocus(false);
          return;
        }
        Keyboard.keydown(h.inject, h.model)(e);
        return;
      }
      if (e.key.startsWith("Arrow")) {
        e.preventDefault();
        keys.add(e.key);
      }
    };
    const keyup = (e: KeyboardEvent) => keys.delete(e.key);
    const blur = () => keys.clear();
    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);
    window.addEventListener("blur", blur);

    /* footprint tracks the live term: shrinking it opens the way */
    const radius = (key: string): number => {
      const h = hosts.find((x) => x.key === key)!;
      return 0.55 * Math.sqrt(size(h.model.stage.exp)) + 0.8;
    };
    const surf = (h: Host, avatar: Sim.Avatar): number =>
      Math.hypot(avatar.pos.x - h.pos.x, avatar.pos.z - h.pos.z) -
      radius(h.key);

    let last = performance.now();
    let raf = 0;
    dev.teleport = (x: number, z: number) => {
      av = { pos: { x, z }, facing: av.facing };
      keys.clear();
    };
    dev.state = () => ({
      av: { ...av.pos },
      keys: [...keys],
      awake,
      focus: treeFocus(),
    });

    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      const u =
        (keys.has("ArrowUp") ? 1 : 0) - (keys.has("ArrowDown") ? 1 : 0);
      const r =
        (keys.has("ArrowRight") ? 1 : 0) - (keys.has("ArrowLeft") ? 1 : 0);
      const input: Sim.Input = {
        x: Scene.FORWARD.x * u + Scene.RIGHT.x * r,
        z: Scene.FORWARD.z * u + Scene.RIGHT.z * r,
      };
      av = Sim.tick(av, input, dt, world, radius);

      /* wake the nearest tree; sleep with hysteresis, never mid-drag.
       * Between the two radii, pre-attach (hidden) so waking is cheap.
       * Held off during boot rasterization. */
      if (booting) {
        /* no wake/warm management while boot owns the attachments */
      } else if (awake === null) {
        let best: Host | null = null;
        let bd = Infinity;
        for (const h of hosts) {
          const d = surf(h, av);
          if (!h.busy && d < bd) {
            bd = d;
            best = h;
          }
        }
        if (best && bd < WAKE_IN) {
          /* singleton #main/#stage: drop any other warm attach first */
          for (const o of hosts)
            if (o !== best && o.anchor.isConnected && !o.busy) detach(o);
          attach(best);
          show(best);
          awake = best.key;
          setTending(best.key);
          if (!dragMode()) setTreeFocus(true);
          keys.clear();
        } else {
          if (
            best &&
            bd < WARM_IN &&
            !best.anchor.isConnected &&
            hosts.every((h) => !h.anchor.isConnected)
          )
            attach(best);
          for (const h of hosts)
            if (h.anchor.isConnected && !h.busy && surf(h, av) > WARM_OUT)
              detach(h);
        }
      } else {
        const h = hosts.find((x) => x.key === awake)!;
        if (surf(h, av) > WAKE_OUT && !Drag.drag_in_progress() && !h.busy) {
          void sleep(h);
          awake = null;
          setTending(null);
          setTreeFocus(false);
        }
      }

      /* anchor the live tree's stage-center to its world spot (left/top
       * only — no transforms, so #noolbox { position: fixed } stays
       * screen-fixed). The pin drifts as rewrites reflow the stage, so
       * re-measure whenever the anchor is at rest (untransformed). */
      for (const h of hosts) {
        if (
          h.anchor.isConnected &&
          !h.anchor.classList.contains("offscreen")
        ) {
          if (h.anchor.classList.contains("settled")) measure_pin(h);
          place(h);
        }
      }

      /* reductions yield energy: any decrease in term size is absorbed */
      for (const h of hosts) {
        const s = size(h.model.stage.exp);
        if (s < h.lastSize) setEnergy((e) => e + (h.lastSize - s));
        h.lastSize = s;
      }

      handles.frame(av, dt, awake);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    onCleanup(() => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("keyup", keyup);
      window.removeEventListener("blur", blur);
      for (const h of hosts) h.dispose?.();
      handles.dispose();
    });
  });

  return (
    <div class="world-root" ref={container}>
      <div class="world-overlay" ref={overlay} />
      <div class="world-hud">
        <div class="world-energy">⚡ {energy()}</div>
        <div class="world-hint">
          {treeFocus()
            ? "arrows navigate · 1–4 & space apply · esc to walk"
            : tending()
            ? "tend the expression — smaller is passable"
            : "arrows to move · approach an expression to tend it"}
        </div>
      </div>
      <button
        class="world-mode"
        title="switch between drag and click-to-select"
        onClick={toggleMode}
      >
        {dragMode() ? "✋ drag" : "☝️ select"}
      </button>
    </div>
  );
};

export default WorldView;
