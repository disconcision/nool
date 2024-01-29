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
//import { Toolbar } from "./view/ToolsView";

export type SetModel = SetStoreFunction<Model.t>;


const App: Component = () => {
  const [model, setModel] = createStore({ ...Model.init });
  Animate.init();
  const inject = (a: Action.t) => {
    console.log(a);
    if (a.t === "setHover" || !document.startViewTransition) {
      console.log("sethover dont transition:" + a.t);
      go(model, setModel, a);
      return;
    }
    const guy2 = document.getElementById("main");
    guy2 ? guy2.classList.add(a.t) : console.log("no guy r add");
    let v = document.startViewTransition(() => go(model, setModel, a));
    v.finished.then(() =>
      guy2 ? guy2.classList.remove(a.t) : console.log("no guy 2 rm")
    );
  };
  document.addEventListener("keydown", Keyboard.keydown(inject), false);
  document.addEventListener("keyup", Keyboard.keyup(inject), false);
  // document.addEventListener("transitionstart", (e) => {
  //   in_transition = true;
  // });
  // document.addEventListener("transitionend", (e) => {
  //   in_transition = false;
  // });
  return (
    <div
      id="main"
      class={model.settings.theme}
      classList={{ selected: model.stage.selection === "unselected" }}
    >
      {/* <div class="logo" /> */}
      {/* Toolbar({ model, inject }) */}
      {Seed({ model, inject })}
      {SettingsView({ model, inject })}
    </div>
  );
};
ExpToPat.test();
export default App;
