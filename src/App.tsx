import { Component } from "solid-js";
import { createStore } from "solid-js/store";
import { go } from "./Update";
import * as Model from "./Model";
import { StageView } from "./view/StageView";
import { Toolbar, ToolsView } from "./view/ToolsView";
import * as Keyboard from "./Keyboard";
import { SettingsView } from "./view/SettingsView";
import { AdjacentPossible } from "./view/PreView";
import * as Action from "./Action";

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

const SuperStage: Component<{ model: Model.t; inject: Action.Inject }> = (
  props
) => (
  <div
    class="superstage"
    classList={{
      notransition: props.model.settings.motion === "Off",
      noanimation:
        props.model.settings.motion === "Off",
      notransformation: props.model.settings.motion === "Off",
    }}
    onmousedown={(e) => {
      e.preventDefault();
      props.inject({ t: "unsetSelections" });
    }}
  >
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
      {SuperStage({ model, inject })}
      {SettingsView({ model, inject })}
    </div>
  );
};

export default App;
