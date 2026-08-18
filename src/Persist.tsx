import * as Model from "./Model";
import * as Stage from "./Stage";
import * as ID from "./syntax/ID";

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
        dragActive: s.dragActive ?? Model.init.tools.dragActive,
        size: s.size ?? Model.init.tools.size,
      },
      history: s.history ?? { past: [], future: [] },
    };
  } catch {
    return null;
  }
};
