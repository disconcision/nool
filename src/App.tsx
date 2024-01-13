import { Component } from "solid-js";
import { createStore } from "solid-js/store";
import { go } from "./Update";
import * as Model from "./Model";
import * as Action from "./Action";
import * as Keyboard from "./Keyboard";
import { SettingsView } from "./view/SettingsView";
import { Seed } from "./view/SeedView";
import { Toolbar } from "./view/ToolsView";

const App: Component = () => {
  const [model, setModel] = createStore({ ...Model.init });
  const inject = (a: Action.t) => {
    console.log(a);
    go(model, setModel, a);
  };
  document.addEventListener("keydown", Keyboard.keydown(inject), false);
  document.addEventListener("keyup", Keyboard.keyup(inject), false);
  return (
    <div id="main">
      <div class="logo" />
      {/*Toolbar({ model, inject })*/}
      {Seed({ model, inject })}
      {SettingsView({ model, inject })}
    </div>
  );
};

export default App;
