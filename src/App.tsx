import { Component, createSignal } from "solid-js";
import { createStore, SetStoreFunction } from "solid-js/store";
import { go } from "./Update";
import * as Model from "./Model";
import * as Action from "./Action";
import * as Stage from "./Stage";
import * as Keyboard from "./Keyboard";
import { SettingsView } from "./view/SettingsView";
import { Seed } from "./view/SeedView";
import * as ExpToPat from "./syntax/ExpToPat";
import * as Animate from "./Animate";
import { useHazelIntegration } from "./hazel/useHazelIntegration";
import {
  serializeForHazel,
  deserializeFromHazel,
} from "./hazel/hazel-serialization";
//import { Toolbar } from "./view/ToolsView";

export type SetModel = SetStoreFunction<Model.t>;

const App: Component = () => {
  // Get URL parameters for Hazel integration
  const urlParams = new URLSearchParams(window.location.search);
  const hazelId = urlParams.get("id");
  const [isHazelEmbed] = createSignal(!!hazelId);

  const [model, setModel] = createStore({ ...Model.init });
  const [constraints, setConstraints] = createSignal<{
    maxWidth: number;
    maxHeight: number;
  } | null>(null);
  const [hazelReady, setHazelReady] = createSignal(!isHazelEmbed());
  let activeTransition: ViewTransition | null = null;
  let pendingHoverAction: Action.t | null = null;

  Animate.init();

  const inject = (a: Action.t) => {
    // CRITICAL: setHover actions must be deferred during view transitions.
    // Transform actions trigger hover changes when tool sides flip (mouse position changes),
    // causing DOM updates that int`erfere with ongoing view transitions and break animations.
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

  // Setup Hazel integration if running as exolivelit
  let hazelIntegration: ReturnType<typeof useHazelIntegration> | null = null;
  let enhancedInject = inject;

  if (isHazelEmbed()) {
    hazelIntegration = useHazelIntegration({
      id: hazelId,
      codec: "json",
      onInit: (valueStr: string) => {
        console.log("Received init from Hazel:", valueStr);
        const exp = deserializeFromHazel(valueStr);
        // Use proper stage update to recalculate statics and projectors
        const newStage = Stage.put_exp(model.stage, exp);
        setModel("stage", newStage);
        setHazelReady(true); // Show UI now that we have hazel data

        // Force reflow/repaint after a short delay to fix rendering issues
        setTimeout(() => {
          document.body.offsetHeight; // Force reflow
          if (hazelIntegration) {
            const rect = document
              .getElementById("main")
              ?.getBoundingClientRect();
            if (rect) {
              hazelIntegration.resize(rect.width, rect.height);
            }
          }
        }, 100);
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
  // Apply Hazel constraints with responsive scaling
  const mainStyle = () => {
    const c = constraints();
    if (!c) return {};

    // Nool's natural dimensions (tight around content with padding)
    const naturalWidth = 640;
    const naturalHeight = 480;

    // Calculate scale factor - never scale up, only down
    const scaleX = c.maxWidth / naturalWidth;
    const scaleY = c.maxHeight / naturalHeight;
    const scale = Math.min(1, scaleX, scaleY);

    if (scale < 1) {
      // Scale down when constrained
      return {
        transform: `scale(${scale})`,
        "transform-origin": "top left",
        width: `${naturalWidth}px`,
        height: `${naturalHeight}px`,
      };
    } else {
      // Use natural size with max constraints
      return {
        "max-width": `${c.maxWidth}px`,
        "max-height": `${c.maxHeight}px`,
      };
    }
  };

  return (
    <div
      id="main"
      class={model.settings.theme}
      classList={{
        selected: model.stage.selection === "unselected",
        "hazel-embed": isHazelEmbed(),
      }}
      style={mainStyle()}
    >
      <div style={{ opacity: hazelReady() ? 1 : 0 }}>
        {Seed({ model, inject: enhancedInject })}
        {!isHazelEmbed() && SettingsView({ model, inject: enhancedInject })}
      </div>
    </div>
  );
};
ExpToPat.test();
export default App;
