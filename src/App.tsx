import { Component } from "solid-js";
import { createStore } from "solid-js/store";
import { Action, go } from "./Update";
import { init_model } from "./Model";
import { Stage } from "./view/StageView";
import { Toolbar, TransformsBox } from "./view/ToolsView";
import * as Keyboard from "./Keyboard";

const App: Component = () => {
  const [model, setModel] = createStore(init_model);
  const inject = (a: Action) => {
    console.log(a);
    go(model, setModel, a);
  };
  document.addEventListener("keydown", Keyboard.keydown(inject), false);
  document.addEventListener("keyup", Keyboard.keyup(inject), false);
  return (
    <div id="main">
      <div class="logo" />
      {Toolbar({ model, inject })}
      {TransformsBox({ model, inject })}
      {Stage({ model, inject })}
    </div>
  );
};

export default App;
