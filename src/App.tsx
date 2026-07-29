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
  let activeTransition: ViewTransition | null = null;
  let pendingHoverAction: Action.t | null = null;

  Animate.init();

  const inject = (a: Action.t) => {
    // CRITICAL: setHover actions must be deferred during view transitions.
    // Transform actions trigger hover changes when tool sides flip (mouse position changes),
    // causing DOM updates that interfere with ongoing view transitions and break animations.
    // Solution: defer hover actions until transition completes, then apply the final hover state.
    if (a.t === "setHover") {
      if (activeTransition) {
        pendingHoverAction = a;
        return;
      }
      go(model, setModel, a);
      return;
    }

    if (!document.startViewTransition) {
      go(model, setModel, a);
      return;
    }

    const main = document.getElementById("main");
    main?.classList.add(a.t);

    // Assign transition names just before transition
    Animate.assignTransitionNames(main, a.t);

    activeTransition = document.startViewTransition(() => {
      go(model, setModel, a);
      // Re-assign transition names to NEW elements after DOM update
      const mainAfter = document.getElementById("main");
      // Force style recomputation before reassigning transition names
      mainAfter?.offsetHeight;
      Animate.assignTransitionNames(mainAfter, a.t);
    });

    activeTransition.finished.then(() => {
      main?.classList.remove(a.t);
      Animate.cleanupTransitionNames(main);
      activeTransition = null;

      // Process any pending hover action
      if (pendingHoverAction) {
        const deferredAction = pendingHoverAction;
        pendingHoverAction = null;
        go(model, setModel, deferredAction);
      }
    });
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
