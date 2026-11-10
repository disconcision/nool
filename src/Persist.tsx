import * as Model from "./Model";
import * as Stage from "./Stage";
import * as ID from "./syntax/ID";
import * as ToolBox from "./ToolBox";

/* Session persistence: the model's own state (world, selection, settings,
 * loadout, history) survives refresh via localStorage — it's a few KB of
 * plain JSON, so synchronous storage keeps boot simple (no async flash;
 * IndexedDB would buy nothing here). Derived state (statics, transforms)
 * is rebuilt. The ID counter is persisted too: restored exps carry minted
 * ids, and a fresh counter would re-mint them into collisions. */

const KEY = "nool-state-v1";
let timer: number | undefined;

/* Stored enum values can outlive their unions (the drag-mechanic options
 * have been renamed across experiments); fall back to defaults rather
 * than crash a switch somewhere downstream. */
const sanitize_settings = (s: Model.t["settings"]): Model.t["settings"] => ({
  ...s,
  dragMechanic: ["Classic", "Sticky", "Rails", "Blend"].includes(s.dragMechanic)
    ? s.dragMechanic
    : Model.init.settings.dragMechanic,
  projection: [
    "LinearPrefix",
    "LinearInfix",
    "LinearPostfix",
    "LinearInfixV",
    "TreeLeft",
    "TreeTop",
  ].includes(s.projection)
    ? s.projection
    : Model.init.settings.projection,
  chrome: ["corners", "fan", "dock"].includes(s.chrome)
    ? s.chrome
    : Model.init.settings.chrome,
  boost: [1, 1.25, 1.5].includes(s.boost) ? s.boost : Model.init.settings.boost,
});

export const save_soon = (model: Model.t): void => {
  clearTimeout(timer);
  timer = window.setTimeout(() => {
    try {
      localStorage.setItem(
        KEY,
        JSON.stringify({
          id_gen: ID.current(),
          exp: model.stage.exp,
          selection: model.stage.selection,
          settings: model.settings,
          dragActive: model.tools.dragActive,
          dragDefaults: Model.init.tools.dragActive,
          size: model.tools.size,
          history: model.history,
        })
      );
    } catch {
      /* storage full/unavailable: session just won't persist */
    }
  }, 250);
};

export const clear = (): void => {
  try {
    localStorage.removeItem(KEY);
  } catch {}
};

/* Loadouts were boolean[] (both directions on/off) before rules gained
 * one-way states. Migrate on/off to both/off, except rules whose new
 * default is one-way (the identities → identity-removing only), which
 * adopt that default when on. Unknown shapes fall back to defaults.
 *
 * Saves also record the defaults they were made under, so when the
 * defaults change, a rule still at its old default (never touched) takes
 * the new one, and one the player set keeps their setting. Saves from
 * before that record are read against the previous defaults. */
const DIRS: ToolBox.DragDir[] = ["off", "both", "fwd", "rev"];
const is_dir = (v: unknown): v is ToolBox.DragDir =>
  DIRS.includes(v as ToolBox.DragDir);
const load_drag_dirs = (
  raw: unknown,
  raw_defaults: unknown
): ToolBox.DragDir[] => {
  const init = Model.init.tools.dragActive;
  if (!Array.isArray(raw) || raw.length !== init.length) return init;
  const was: ToolBox.DragDir[] =
    Array.isArray(raw_defaults) &&
    raw_defaults.length === init.length &&
    raw_defaults.every(is_dir)
      ? raw_defaults
      : Model.init.tools.transforms.map((t) => ToolBox.default_dir_v1(t.name));
  return raw.map((v, i) => {
    if (typeof v === "boolean") {
      if (!v) return "off";
      const d = init[i];
      return d === "fwd" || d === "rev" ? d : "both";
    }
    if (!is_dir(v)) return init[i];
    return v === was[i] ? init[i] : v;
  });
};

export const load = (): Model.t | null => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || !s.exp) return null;
    ID.bump(s.id_gen ?? 0);
    const stage = Stage.put_exp(Model.init.stage, s.exp);
    return {
      ...Model.init,
      stage: { ...stage, selection: s.selection ?? "unselected" },
      settings: sanitize_settings({
        ...Model.init.settings,
        ...(s.settings ?? {}),
      }),
      tools: {
        ...Model.init.tools,
        dragActive: load_drag_dirs(s.dragActive, s.dragDefaults),
        size: s.size ?? Model.init.tools.size,
      },
      history: s.history ?? { past: [], future: [] },
    };
  } catch {
    return null;
  }
};
