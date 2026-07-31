import { Component } from "solid-js";
import { createStore, SetStoreFunction } from "solid-js/store";
import { go } from "./Update";
import * as Model from "./Model";
import * as Action from "./Action";
import * as Keyboard from "./Keyboard";
import { SettingsView } from "./view/SettingsView";
import { Seed } from "./view/SeedView";
import * as ExpToPat from "./syntax/ExpToPat";
import * as Motion from "./motion/Motion";
import * as Sound from "./Sound";
import * as Persist from "./Persist";
import * as Drag from "./drag/Drag";
import { id_at } from "./syntax/Node";

export type SetModel = SetStoreFunction<Model.t>;

const App: Component = () => {
  const [model, setModel] = createStore(Persist.load() ?? { ...Model.init });

  const inject = (a: Action.t) => {
    if (a.t === "setHover") {
      go(model, setModel, a);
      return;
    }
    /* Click-path emerge/converge: transforms applied at the selection get
     * the same provenance geometry as drags (clone/grow, merge/absorb;
     * the selected node plays the grab's trigger role). Drag commits pass
     * through untouched: in drag mode the selection is always unselected,
     * and their provenance already resolved during the manual morph. */
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
  document.addEventListener("keydown", Keyboard.keydown(inject, model), false);
  document.addEventListener("keyup", Keyboard.keyup(inject), false);
  // Debug toggles: Shift+S all shadows off; Shift+D cheap toolbox
  // shadows; Shift+A toggles the drag-pluck harmony experiment
  document.addEventListener("keydown", (e) => {
    if (e.key === "S") document.body.classList.toggle("noshadows");
    if (e.key === "D") document.body.classList.toggle("cheapshadows");
    if (e.key === "A") console.log("drag sound:", Sound.toggle_harmony());
  });
  return (
    <div
      id="main"
      /* single class expression: a `class` re-evaluation (theme toggle)
       * would clobber classList-managed names */
      /* window-as-root-node selection metaphor: suppressed in drag mode,
       * where the selection mechanic (and its page-level pseudo-node) is
       * disabled entirely */
      class={
        model.settings.theme +
        (model.stage.selection === "unselected" && !model.settings.dragging
          ? " selected"
          : "")
      }
    >
      <Seed model={model} inject={inject} />
      <SettingsView model={model} inject={inject} />
    </div>
  );
};
ExpToPat.test();
export default App;
