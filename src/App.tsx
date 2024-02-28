import { Component } from "solid-js";
import { createStore, SetStoreFunction } from "solid-js/store";
import { go } from "./Update";
import * as Model from "./Model";
import * as Action from "./Action";
import * as Keyboard from "./Keyboard";
import { SettingsView } from "./view/SettingsView";
import { Seed } from "./view/SeedView";
import * as ExpToPat from "./syntax/ExpToPat";
import * as Animate from "./Animate";

export type SetModel = SetStoreFunction<Model.t>;

const App: Component = () => {
  const [model, setModel] = createStore({ ...Model.init });
  Animate.init();
  const inject = (a: Action.t) => {
    console.log(a);
    go(model, setModel, a);
  };
  document.addEventListener("keydown", Keyboard.keydown(inject), false);
  document.addEventListener("keyup", Keyboard.keyup(inject), false);
  return (
    <div
      id="main"
      class={model.settings.theme}
      classList={{ selected: model.stage.selection === "unselected" }}
    >
      {Seed({ model, inject })}
      {SettingsView({ model, inject })}
    </div>
  );
};
ExpToPat.test();
export default App;
