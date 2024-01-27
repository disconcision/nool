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
import * as Animate from "./Animate";

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
  case "unsetSelections":
    Sound.unselect("D2", 0.6);
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
    : { ...model, stage: Stage.put_exp(model.stage, freshen(result)) };

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

export const go = (
  model: Model.t,
  setModel: SetStoreFunction<Model.t>,
  action: Action.t
): void => {
  if (model.settings.sound) sound(model, action);
  /* Catching because problem on build server */
  try {
    //Animate.read(model, action);
  } catch (e) {
    console.error(e);
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
  /* Catching because problem on build server */
  try {
    //Animate.flip(model, action);
  } catch (e) {
    console.error(e);
  }
};
