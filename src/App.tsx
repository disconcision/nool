import { Component } from "solid-js";
import { createStore } from "solid-js/store";
import { Action, update } from "./Update";
import { init_model } from "./Model";
import { Toolbar, TransformsBox, Stage } from "./View";

const App: Component = () => {
  const [model, setModel] = createStore(init_model);
  const inject = (a: Action) => {
    console.log(a);
    update(model, setModel, a);
  };
  return (
    <div id="main">
      <div class="logo" />
      {Toolbar({ model, inject })}
      {TransformsBox({ model, inject })}
      {Stage({ model: model, inject })}
    </div>
  );
};

export default App;
