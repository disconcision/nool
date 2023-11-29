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
import { Model } from "./Model";

const blah = () => (
  <div class="toolbar2">
    {" "}
    <ul class="tools">
      <li class="tool">A</li>
      <li>B</li>
      <li>C</li>
      <li>D</li>
      <li>E</li>
    </ul>
  </div>
);

const SuperStage: Component<{ model: Model; inject: Action.Inject }> = (
  props
) => (
  <div class="superstage">
    {ToolsView({ model: props.model, inject: props.inject })}
    {StageView({ model: props.model, inject: props.inject })}
    {props.model.settings.preview
      ? AdjacentPossible({
          stage: props.model.stage,
          tools: props.model.tools.transforms,
          inject: props.inject,
        })
      : null}
  </div>
);

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
      {/*Toolbar({ model, inject })*/}
      {SuperStage({ model, inject })}
      {SettingsView({ model, inject })}
    </div>
  );
};

export default App;
