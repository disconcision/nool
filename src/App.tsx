import { Component } from "solid-js";
import { createStore } from "solid-js/store";
import { go } from "./Update";
import { init_model } from "./Model";
import { StageView } from "./view/StageView";
import { Toolbar, ToolsView } from "./view/ToolsView";
import * as Keyboard from "./Keyboard";
import { SettingsView } from "./view/SettingsView";
import { AdjacentPossible } from "./view/PreView";
import * as Action from "./Action";

const App: Component = () => {
  const [model, setModel] = createStore(init_model);
  const inject = (a: Action.t) => {
    console.log(a);
    go(model, setModel, a);
  };
  document.addEventListener("keydown", Keyboard.keydown(inject), false);
  document.addEventListener("keyup", Keyboard.keyup(inject), false);
  return (
    <div id="main">
      <div class="logo" />
      {SettingsView({ model, inject })}
      {Toolbar({ model, inject })}
      {ToolsView({ model, inject })}
      {StageView({ model, inject })}
      {model.settings.preview
        ? AdjacentPossible({ stage: model.stage, tools: model.tools, inject })
        : null}
    </div>
  );
};

export default App;
