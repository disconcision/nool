import { Component } from "solid-js";
import { createStore, SetStoreFunction } from "solid-js/store";
import { go, blah } from "./Update";
import * as Model from "./Model";
import * as Action from "./Action";
import * as Keyboard from "./Keyboard";
import { SettingsView } from "./view/SettingsView";
import { Seed } from "./view/SeedView";
import * as ExpToPat from "./syntax/ExpToPat";
import * as Animate from "./Animate";
//import { Toolbar } from "./view/ToolsView";

export type SetModel = SetStoreFunction<Model.t>;

// var in_transition = false;

const App: Component = () => {
  const [model, setModel] = createStore({ ...Model.init });
  Animate.init();
  const inject = (a: Action.t) => {
    console.log(a);
    // if (in_transition && a.t === "setHover") {
    //   console.log("blocked:" + a.t);
    //   return;
    // }
    
    if (!document.startViewTransition || model.settings.motion === "On") {
      /* Catching because problem on build server */
      try {
        Animate.read(model, a);
      } catch (e) {
        console.error(e);
      }
      go(model, setModel, a);
      try {
        Animate.flip(model, a);
      } catch (e) {
        console.error(e);
      }
    } else if (model.settings.motion === "Half"){
      if (a.t === "setHover") {
        console.log("sethover dont transition:" + a.t);
        go(model, setModel, a);
        return;
      }
      document.startViewTransition(async () => go(model, setModel, a));
    } else {
      go(model, setModel, a);
    }
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
    <div id="main" class={model.settings.theme}>
      <div class="logo" />
      {/*Toolbar({ model, inject })*/}
      {Seed({ model, inject })}
      {SettingsView({ model, inject })}
    </div>
  );
};
ExpToPat.test();
export default App;
