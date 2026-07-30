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

export type SetModel = SetStoreFunction<Model.t>;

const App: Component = () => {
  const [model, setModel] = createStore({ ...Model.init });

  const inject = (a: Action.t) => {
    if (a.t === "setHover") {
      go(model, setModel, a);
      return;
    }
    Motion.animate(
      () => go(model, setModel, a),
      model.settings.motion !== "Off"
    );
  };
  document.addEventListener("keydown", Keyboard.keydown(inject), false);
  document.addEventListener("keyup", Keyboard.keyup(inject), false);
  // Debug toggles: Shift+S all shadows off; Shift+D cheap toolbox shadows
  document.addEventListener("keydown", (e) => {
    if (e.key === "S") document.body.classList.toggle("noshadows");
    if (e.key === "D") document.body.classList.toggle("cheapshadows");
  });
  return (
    <div
      id="main"
      /* single class expression: a `class` re-evaluation (theme toggle)
       * would clobber classList-managed names */
      class={
        model.settings.theme +
        (model.stage.selection === "unselected" ? " selected" : "")
      }
    >
      <Seed model={model} inject={inject} />
      <SettingsView model={model} inject={inject} />
    </div>
  );
};
ExpToPat.test();
export default App;
