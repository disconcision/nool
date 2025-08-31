import { Component, createSignal } from "solid-js";
import { createStore, SetStoreFunction } from "solid-js/store";
import { go } from "./Update";
import * as Model from "./Model";
import * as Action from "./Action";
import * as Keyboard from "./Keyboard";
import { SettingsView } from "./view/SettingsView";
import { Seed } from "./view/SeedView";
import * as ExpToPat from "./syntax/ExpToPat";
import * as Animate from "./Animate";
import { useHazelIntegration } from "./hazel/useHazelIntegration";
import { serializeForHazel, deserializeFromHazel } from "./hazel/hazel-serialization";
//import { Toolbar } from "./view/ToolsView";

export type SetModel = SetStoreFunction<Model.t>;


const App: Component = () => {
  // Get URL parameters for Hazel integration
  const urlParams = new URLSearchParams(window.location.search);
  const hazelId = urlParams.get("id");
  const isHazelEmbed = !!hazelId;

  const [model, setModel] = createStore({ ...Model.init });
  const [constraints, setConstraints] = createSignal<{
    maxWidth: number;
    maxHeight: number;
  } | null>(null);

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

  // Setup Hazel integration if running as exolivelit
  let hazelIntegration: ReturnType<typeof useHazelIntegration> | null = null;
  let enhancedInject = inject;
  
  if (isHazelEmbed) {
    hazelIntegration = useHazelIntegration({
      id: hazelId,
      codec: "json",
      onInit: (valueStr: string) => {
        console.log("Received init from Hazel:", valueStr);
        const exp = deserializeFromHazel(valueStr);
        setModel("stage", "exp", exp);
      },
      onConstraints: (c) => {
        console.log("Received constraints from Hazel:", c);
        setConstraints(c);
      },
    });

    // Send updates to Hazel when expression changes
    const sendUpdate = () => {
      if (hazelIntegration) {
        const serialized = serializeForHazel(model.stage.exp);
        hazelIntegration.setSyntax(serialized);
      }
    };

    // Enhanced inject that also sends updates to Hazel
    enhancedInject = (a: Action.t) => {
      inject(a);
      // Send update after actions that modify the expression
      if (a.t !== "setHover" && a.t !== "unsetSelections") {
        setTimeout(sendUpdate, 0); // Delay to ensure model update completes
      }
    };
  }
  document.addEventListener("keydown", Keyboard.keydown(enhancedInject), false);
  document.addEventListener("keyup", Keyboard.keyup(enhancedInject), false);
  // document.addEventListener("transitionstart", (e) => {
  //   in_transition = true;
  // });
  // document.addEventListener("transitionend", (e) => {
  //   in_transition = false;
  // });
  // Apply Hazel constraints to main container
  const mainStyle = () => {
    const c = constraints();
    return c ? {
      "max-width": `${c.maxWidth}px`,
      "max-height": `${c.maxHeight}px`,
    } : {};
  };

  return (
    <div
      id="main"
      class={model.settings.theme}
      classList={{ selected: model.stage.selection === "unselected" }}
      style={mainStyle()}
    >
      {Seed({ model, inject: enhancedInject })}
      {!isHazelEmbed && SettingsView({ model, inject: enhancedInject })}
    </div>
  );
};
ExpToPat.test();
export default App;
