import { at_path } from "./Transform";
import Flipping from "flipping/lib/adapters/web";
import * as Model from "./Model";
import * as Sound from "./Sound";
import * as Settings from "./Settings";
import * as Stage from "./Stage";
import * as Action from "./Action";
import * as Transform from "./Transform";
import * as ToolBox from "./ToolBox";
import * as Hover from "./Hover";
import { freshen } from "./syntax/Node";
import * as Exp from "./syntax/Exp";
import * as Pat from "./syntax/Pat";
import { SetStoreFunction } from "solid-js/store";
import * as Path from "./syntax/Path";

export type result = Model.t | "NoChange";

export const of_theme = (theme: Settings.theme): [number, number] => {
  switch (theme) {
    case "Light":
      return [8, -20];
    case "Dark":
      return [2, -8];
  }
};

export const sound = (model: Model.t, action: Action.t): void => {
  const [pitch, volume] = of_theme(model.settings.theme);
  switch (action.t) {
    case "transformNodeAndFlipTransform":
      let result = action.f(model.stage.exp);
      if (result != "NoMatch") {
        return action.transform.reversed
          ? action.transform.sound_rev()
          : action.transform.sound();
      } else {
        Sound.noop();
      }
      break;
    case "setSelect":
      Sound.select(action.path.length, pitch, volume);
      break;
    case "moveTool":
    case "moveStage":
      Sound.select(model.stage.selection.length, pitch, volume);
      break;
    case "setSetting":
      Sound.sfx("pew")();
      break;
    case "Noop":
      Sound.noop();
      break;
    case "setHover":
    case "flipTransform":
    case "applyTransform":
    case "applyTransformSelected":
      undefined;
  }
};

const update_stage = (model: Model.t, result: Pat.TransformResult): result =>
  /* Freshening as-is is a hack to deal with e.g. distributivity which copies nodes */
  result == "NoMatch"
    ? "NoChange"
    : { ...model, stage: Stage.put_exp(model.stage, result) };

type ModelField =
  | { t: "stage"; path: Path.t; updater: any }
  | { t: "tools"; path: Path.t; updater: any }
  | { t: "hover"; hover: Hover.t }
  | { t: "settings"; settings: Settings.t };

/*export const imperative_update = (
  setModel: SetStoreFunction<Model.t>,
  model: Model.t,
  field: ModelField
): void => {
  switch (field.t) {
    case "hover":
      setModel({ ...model, hover: field.hover });
      break;
    case "settings":
      setModel({ ...model, settings: field.settings });
      break;
    case "tools":
      setModel({
        ...model,
        tools: ToolBox.update_path(field.updater, model.tools, field.path),
      });
      break;
    case "stage":
      setModel({
        ...model,
        stage: Stage.update_path(field.updater, model.stage, field.path),
      });
      break;
  }
};*/

export const update = (model: Model.t, action: Action.t): result => {
  switch (action.t) {
    case "restart":
      return Model.init;
    case "setSetting":
      return {
        ...model,
        settings: Settings.update(model.settings, action.action),
      };
    case "setSelect":
      if (
        model.stage.selection === "unselected"
          ? false
          : Path.eq(model.stage.selection, action.path)
      )
        return "NoChange";
      return { ...model, stage: Stage.put_selection(model.stage, action.path) };
    case "setHover":
      if (Hover.eq(model.hover, action.target)) return "NoChange";
      return { ...model, hover: action.target };
    case "moveStage":
      return { ...model, stage: Stage.move(model.stage, action.direction) };
    case "moveTool":
      let tools = ToolBox.move(model.tools, action.direction);
      const hover: Hover.t = {
        t: "TransformSource",
        pat: ToolBox.get_pat(tools),
      };
      return { ...model, tools, hover: hover };
    case "unsetSelections":
      return {
        ...model,
        stage: Stage.unset_selection(model.stage),
        tools: ToolBox.unset(model.tools),
        hover: Hover.init,
      };
    case "transformNode":
      let result = action.f(model.stage.exp);
      return update_stage(model, result);
    case "transformNodeAndFlipTransform":
      let result3 = action.f(model.stage.exp);
      let model3: Model.t = {
        ...model,
        tools: ToolBox.flip_transform(model.tools, action.idx),
        hover:
          action.target === "Source"
            ? { t: "TransformSource", pat: action.transform.result }
            : { t: "TransformResult", pat: action.transform.source },
      };
      return update_stage(model3, result3);
    case "applyTransform":
      if (
        action.idx < 0 ||
        action.idx >= model.tools.transforms.length ||
        model.stage.selection === "unselected"
      )
        return "NoChange";
      const transform1 = model.tools.transforms[action.idx];
      const transform =
        action.direction == "forward" ? transform1 : Transform.flip(transform1);
      const result2 = at_path(
        transform,
        model.stage.selection
      )(model.stage.exp);
      if (result2 != "NoMatch") transform.sound(); //TODO
      return update_stage(model, result2);
    case "applyTransformSelected":
      const selector = ToolBox.init_selector(model.tools.selector);
      const model2 = {
        ...model,
        tools: ToolBox.update_selector(model.tools, (_) => selector),
      };
      return update(model2, ToolBox.get(selector));
    case "flipTransform":
      return {
        ...model,
        tools: ToolBox.flip_transform(model.tools, action.idx),
      };
    case "Noop":
      return "NoChange";
  }
};

const flipping = new Flipping({
  attribute: "data-flip-key",
  duration: 250,
  easing: "cubic-bezier(0.68, -0.6, 0.32, 1.6)",
  //parent: document.getElementById("stage")!,
  //stagger: 1,
  //selector:  (_el:Element) => {return [_el]},
  parent: this,
  //activeSelector: (_el:any) => {return (true)},
});

const flipping_comp = new Flipping({
  attribute: "data-flip-key-comp",
  duration: 250,
  easing: "cubic-bezier(0.68, -0.6, 0.32, 1.6)",
});

const tool_flip = new Flipping({
  attribute: "tool-flip",
  duration: 50,
  easing: "linear",
});

export const go = (
  model: Model.t,
  setModel: SetStoreFunction<Model.t>,
  action: Action.t
): void => {
  tool_flip.read();
  if (model.settings.sound) sound(model, action);
  if (model.settings.motion != "Off") flipping.read();
  if (model.settings.motion == "On") {
    flipping_comp.read();
  } else if (action.t === "transformNodeAndFlipTransform") {
    console.log("reading comp");
    flipping_comp.read();
  }
  const result = update(model, action);
  if (result == "NoChange") {
    //Sound.noop();
    console.log("Action NoChange:" + action.t);
    return;
  } else {
    console.log("Action Success: " + action.t);
    setModel(result);
  }
  /* HACK: We want transforms the duplicate subtrees e.g. distributivity to
   * retain their duplicate ids for animations, but then we need to freshen
   * them so that they don't get confused with the original subtree. So we
   * freshen them after a delay. THIS WILL CAUSE PROBLEMS!!!! */
  setTimeout(() => {
    const freshened = freshen(model.stage.exp);
    if (!Exp.equals_id(model.stage.exp, freshened))
      setModel({
        ...model,
        stage: Stage.put_exp(model.stage, freshened),
      });
  }, 250);
  if (action.t === "transformNodeAndFlipTransform")
    console.log("shouldanimate: " + action.transform.should_animate);
  //(action.t === "transformNode" && action.transform.should_animate)
  if (model.settings.motion == "On") {
    console.log("flipping on");
    flipping_comp.flip();
    flipping.flip();
  } else if (
    action.t === "transformNodeAndFlipTransform" &&
    action.transform.should_animate
  ) {
    console.log("flipping comp");
    flipping_comp.flip();
    /* HACK: for ??? flipping twice is load bearing for this for some reason.
       But we don't want to flip twice in other cases e.g. reprojection,
       or it fucks it up. */
    flipping.flip();
  } else if (action.t === "transformNodeAndFlipTransform") {
    flipping.flip();
  }

  if (model.settings.motion != "Off") flipping.flip();
  tool_flip.flip();
};
