import { Component, Show, createSignal } from "solid-js";
import { Model } from "../Model";
import * as Settings from "../Settings";
import * as Action from "../Action";
import sound_icon_on from "../assets/icons/sound-on.svg";
import sound_icon_off from "../assets/icons/sound-off.svg";
import motion_on from "../assets/icons/motion-on.svg";
import motion_off from "../assets/icons/motion-off.svg";
import motion_half from "../assets/icons/motion-half.svg";
import preview_on from "../assets/icons/eye-open.svg";
import preview_off from "../assets/icons/eye-closed.svg";
import linear_prefix from "../assets/icons/noun-tree-1052096.svg";
import linear_infix from "../assets/icons/noun-tree-1039106.svg";
import tree_top from "../assets/icons/noun-tree-1052083.svg";
import tree_left from "../assets/icons/noun-1560867.svg"
import sun_on from "../assets/icons/noun-sun-5362089.svg";
import sun_off from "../assets/icons/noun-sun-6322390.svg";
import palette_2 from "../assets/icons/noun-paint-6329583.svg";
import palette_1 from "../assets/icons/noun-palette-1918496.svg";
import alphabet from "../assets/icons/noun-alphabet-3591519.svg"
import x_reset from "../assets/icons/x.svg"
import prims from "../assets/icons/noun-geometry-4695832.svg"
import drag_off from "../assets/icons/noun-tool-3376727.svg"
import drag_on from "../assets/icons/noun-transformation-6040368.svg"
import mech_rails from "../assets/icons/noun-cycle-4446.svg"
import mech_closest from "../assets/icons/noun-cycle-1793611.svg"
import mech_sticky from "../assets/icons/magnet.svg"
import mech_blend from "../assets/icons/blend.svg"
import projection_fan from "../assets/icons/fan.svg"
import vflat from "../assets/icons/vflat.svg"
import hpost from "../assets/icons/hpost.svg"
import dock from "../assets/icons/dock.svg"
import debug_on from "../assets/icons/noun-1831710.svg"
import debug_off from "../assets/icons/noun-1831712.svg"
import corner_mark from "../assets/icons/corner.svg"

//TODO: qr code to disable id display

const setSetting =
  (inject: Action.Inject, action: Settings.Action) => (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    inject({
      t: "setSetting",
      action,
    });
  };

const sound_icon = (sound: boolean): string =>
  sound ? sound_icon_on : sound_icon_off;

const motion_icon = (motion: Settings.motion): string => {
  switch (motion) {
    case "On":
      return motion_on;
    case "Off":
      return motion_off;
    case "Half":
      return motion_half;
  }
};

const preview_icon = (preview: boolean): string =>
  preview ? preview_on : preview_off;

const projection_icon = (projection: Settings.projection): string => {
  switch (projection) {
    case "LinearPrefix":
      return linear_prefix;
    case "LinearInfix":
      return linear_infix;
    case "LinearPostfix":
      return hpost;
    case "LinearInfixV":
      return vflat;
    case "TreeLeft":
      return tree_left;
    case "TreeTop":
      return tree_top;
  }
};

const symbols_icon = (symbols: Settings.symbols): string => {
  switch (symbols) {
    case "Emoji":
      return prims;
    case "SingleChar":
      return alphabet;
  }
};

const theme_icon = (theme: Settings.theme): string => {
  switch (theme) {
    case "Dark":
      return sun_off;
    case "Light":
      return sun_on;
  }
};

const dragging_icon = (dragging: boolean): string =>
  dragging ? drag_on : drag_off;

const drag_mechanic_icon = (m: Settings.dragMechanic): string => {
  switch (m) {
    case "Classic":
      return mech_closest;
    case "Sticky":
      return mech_sticky;
    case "Rails":
      return mech_rails;
    case "Blend":
      return mech_blend;
  }
};

const drag_debug_icon = (on: boolean): string => (on ? debug_on : debug_off);

let action_icon = (action: Settings.Action, settings: Settings.t): string => {
  switch (action) {
    case "ToggleSound":
      return sound_icon(settings.sound);
    case "ToggleMotion":
      return motion_icon(settings.motion);
    case "TogglePreview":
      return preview_icon(settings.preview);
    case "ToggleProjection":
      return projection_icon(settings.projection);
    case "ToggleSymbols":
      return symbols_icon(settings.symbols);
    case "ToggleDark":
      return theme_icon(settings.theme);
    case "ToggleDragging":
      return dragging_icon(settings.dragging);
    case "ToggleDragMechanic":
      return drag_mechanic_icon(settings.dragMechanic);
    case "ToggleDragDebug":
      return drag_debug_icon(settings.dragDebug);
    case "ToggleProjectionDrag":
      return projection_fan;
    case "ToggleDockNoolbox":
      return dock;
    /* not corner icons (seed tap / lab chip) */
    case "ToggleFold":
    case "ChromeCorners":
    case "ChromeFan":
    case "ChromeDock":
    case "Boost1":
    case "Boost125":
    case "Boost150":
      return corner_mark;
  }
};

/* Hover tooltips: what the toggle does + its current state. */
const action_title = (action: Settings.Action, settings: Settings.t): string => {
  switch (action) {
    case "ToggleSound":
      return `Sound: ${settings.sound ? "on" : "off"}`;
    case "ToggleMotion":
      return `Motion: ${settings.motion}`;
    case "TogglePreview":
      return `Adjacent-possible preview: ${settings.preview ? "on" : "off"}`;
    case "ToggleProjection":
      return `Projection: ${settings.projection}`;
    case "ToggleSymbols":
      return `Symbols: ${settings.symbols}`;
    case "ToggleDark":
      return `Theme: ${settings.theme}`;
    case "ToggleDragging":
      return `Drag mode (drag nodes to rewrite): ${
        settings.dragging ? "on" : "off"
      }`;
    case "ToggleDragMechanic": {
      const desc: Record<Settings.dragMechanic, string> = {
        Classic:
          "Classic (dragology parity: memoryless nearest-rail, no hysteresis)",
        Sticky: "Sticky (Classic + incumbent hysteresis)",
        Rails:
          "Rails (memoryful knob; rides rails, switches at the hub — rewrite drags only)",
        Blend:
          "Blend (no tracks: weighted mixture of all targets — projection pulls only)",
      };
      return `Drag mechanic: ${desc[settings.dragMechanic]}`;
    }
    case "ToggleDragDebug":
      return `Drag debug overlay (rails, anchors, t readout): ${
        settings.dragDebug ? "on" : "off"
      }`;
    case "ToggleProjectionDrag":
      return `Projection pulls (drags morph the LAYOUT, not the math): ${
        settings.projectionDrag ? "on" : "off"
      }`;
    case "ToggleDockNoolbox":
      return `Dock the noolbox to the screen edge (stage stops being pushed around): ${
        settings.dockNoolbox ? "on" : "off"
      }`;
    case "ToggleFold":
      return "Fold/unfold the noolbox";
    case "ChromeCorners":
    case "ChromeFan":
    case "ChromeDock":
      return `Phone controls layout: ${settings.chrome}`;
    case "Boost1":
    case "Boost125":
    case "Boost150":
      return `Stage size while folded: ${settings.boost}×`;
  }
};

/* Per-icon slot classes: the compact chrome candidates position icons by
 * slot (desktop keeps its nth-child corner layout, so DOM order is
 * unchanged). */
const slot: Partial<Record<Settings.Action, string>> = {
  ToggleDragging: "s-mode",
  ToggleDragMechanic: "s-mech",
  ToggleDragDebug: "s-guides",
  ToggleProjectionDrag: "s-pulls",
  ToggleDockNoolbox: "s-dock",
  ToggleDark: "s-theme",
  ToggleProjection: "s-proj",
  ToggleSymbols: "s-sym",
  ToggleSound: "s-sound",
};

let icon = (
  inject: Action.Inject,
  settings: Settings.t,
  action: Settings.Action,
  after?: () => void
) => (
  <img
    class={`icon ${slot[action] ?? ""}`}
    src={action_icon(action, settings)}
    title={action_title(action, settings)}
    onmousedown={(e) => {
      setSetting(inject, action)(e);
      after?.();
    }}
  />
);

/* Compact layouts only (index.css gates every rule below on the same
 * query); desktop never sees the fan, the lab chip or the mode toast. */
export const compact = (): boolean =>
  typeof window !== "undefined" &&
  window.matchMedia("(max-width: 820px), (max-height: 520px)").matches;

/* Corner clusters (an L or pair per corner, no 2x2 squares):
 * top-left the drag trio, top-right theme·projection·symbols,
 * bottom-left sound·reset, bottom-right the help badge (HelpView).
 * Order here must match the nth-child positioning in index.css.
 * (The adjacent-possible preview toggle is intentionally unsurfaced;
 * see design/TODO.md — the feature is parked, its code retained.) */
export const SettingsView: Component<{
  model: Model;
  inject: (_: Action.t) => void;
}> = (props) => {
  /* fan candidate: whether the corner mark has fanned the controls out */
  const [open, setOpen] = createSignal(false);
  /* compact: a brief name for the mode just switched to (the icons alone
   * don't say which is which) */
  const [toast, setToast] = createSignal<string | null>(null);
  let toast_timer: number | undefined;
  const announce_mode = () => {
    if (!compact()) return;
    setToast(props.model.settings.dragging ? "drag mode" : "select mode");
    clearTimeout(toast_timer);
    toast_timer = window.setTimeout(() => setToast(null), 1300);
  };
  const [labOpen, setLabOpen] = createSignal(false);
  const chip = (label: string, on: boolean, act: Settings.Action) => (
    <button
      classList={{ on }}
      onpointerdown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!on) props.inject({ t: "setSetting", action: act });
      }}
    >
      {label}
    </button>
  );
  return (
    <>
  <div
    id="settings-panel"
    class={`chrome-${props.model.settings.chrome}${open() ? " open" : ""}`}
  >
    {icon(props.inject, props.model.settings, "ToggleDragging", announce_mode)}
    {icon(props.inject, props.model.settings, "ToggleDragMechanic")}
    {icon(props.inject, props.model.settings, "ToggleDragDebug")}
    {icon(props.inject, props.model.settings, "ToggleProjectionDrag")}
    {icon(props.inject, props.model.settings, "ToggleDockNoolbox")}
    {icon(props.inject, props.model.settings, "ToggleDark")}
    {icon(props.inject, props.model.settings, "ToggleProjection")}
    {icon(props.inject, props.model.settings, "ToggleSymbols")}
    {icon(props.inject, props.model.settings, "ToggleSound")}
    <img
      class="icon s-reset"
      src={x_reset}
      title="Reset everything (world, settings, history)"
      onmousedown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (window.confirm("Reset everything to default?"))
          props.inject({ t: "hardReset" });
      }}
    />
  </div>
  {/* fan candidate's corner mark (outside #settings-panel so the desktop
      nth-child layout is undisturbed); a scrim closes the fan */}
  <img
    id="fan-mark"
    class={`icon${open() ? " open" : ""}`}
    src={corner_mark}
    title="Controls"
    onmousedown={(e) => {
      e.preventDefault();
      e.stopPropagation();
      setOpen(!open());
    }}
  />
  <Show when={open()}>
    <div
      id="fan-scrim"
      onmousedown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
      }}
    />
  </Show>
  <Show when={toast()}>
    <div id="mode-toast">{toast()}</div>
  </Show>
  {/* TEMPORARY evaluation chip (compact layouts only) */}
  <div id="ui-lab" classList={{ open: labOpen() }}>
    <button
      class="lab-toggle"
      onpointerdown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setLabOpen(!labOpen());
      }}
    >
      lab
    </button>
    <Show when={labOpen()}>
      <div class="lab-row">
        <span>controls</span>
        {chip("corners", props.model.settings.chrome === "corners", "ChromeCorners")}
        {chip("fan", props.model.settings.chrome === "fan", "ChromeFan")}
        {chip("dock", props.model.settings.chrome === "dock", "ChromeDock")}
      </div>
      <div class="lab-row">
        <span>folded stage</span>
        {chip("1×", props.model.settings.boost === 1, "Boost1")}
        {chip("1.25×", props.model.settings.boost === 1.25, "Boost125")}
        {chip("1.5×", props.model.settings.boost === 1.5, "Boost150")}
      </div>
    </Show>
  </div>
    </>
  );
};
