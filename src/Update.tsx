import { at_path } from "./Transform";
import Flipping from "flipping/lib/adapters/web";
import * as Model from "./Model";
import * as Sound from "./Sound";
import * as Settings from "./Settings";
import * as Stage from "./Stage";
import * as Action from "./Action";
import * as Transform from "./Transform";
import * as Tools from "./Tools";
import * as Hover from "./Hover";
import { freshen } from "./syntax/Node";
import * as Exp from "./syntax/Exp";
import { TransformResult } from "./syntax/Pat";
import { SetStoreFunction } from "solid-js/store";
import * as Path from "./syntax/Path";

export type result = Model.t | "NoChange";

export const sound = (model: Model.t, action: Action.t): void => {
  switch (action.t) {
    case "transformNode":
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
      Sound.select(action.path.length);
      break;
    case "moveTool":
    case "moveStage":
      Sound.select(model.stage.selection.length);
      break;
    case "setSetting":
      Sound.sfx("pew")();
      break;
    case "setHover":
    case "flipTransform":
    case "applyTransform":
    case "applyTransformSelected":
      undefined;
  }
};

const update_stage = (model: Model.t, result: TransformResult): Model.t =>
  /* Freshening as-is is a hack to deal with e.g. distributivity which copies nodes */
  result == "NoMatch"
    ? model
    : { ...model, stage: Stage.put_exp(model.stage, result) };

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
      return { ...model, hover: action.target };
    case "moveStage":
      return { ...model, stage: Stage.move(model.stage, action.direction) };
    case "moveTool":
      let tools = Tools.move(model.tools, action.direction);
      const hover: Hover.t = {
        t: "TransformSource",
        pat: Tools.get_pat(tools),
      };
      return { ...model, tools, hover: hover };
    case "unsetSelections":
      return {
        ...model,
        stage: Stage.unset_selection(model.stage),
        tools: Tools.unset(model.tools),
        hover: Hover.init,
      };
    case "transformNode":
      let result = action.f(model.stage.exp);
      return update_stage(model, result);
    case "applyTransform":
      if (
        action.idx < 0 ||
        action.idx >= model.tools.transforms.length ||
        model.stage.selection === "unselected"
      )
        return model;
      const transform1 = model.tools.transforms[action.idx];
      const transform =
        action.direction == "forward" ? transform1 : Transform.rev(transform1);
      const result2 = at_path(
        transform,
        model.stage.selection
      )(model.stage.exp);
      if (result2 != "NoMatch") transform.sound(); //TODO
      return update_stage(model, result2);
    case "applyTransformSelected":
      const model2 = {
        ...model,
        tools: {
          ...model.tools,
          selector: Transform.init_selector(model.tools.selector),
        },
      };
      return update(
        model2,
        Transform.get(Transform.init_selector(model.tools.selector))
      );
    case "flipTransform":
      return {
        ...model,
        tools: {
          ...model.tools,
          transforms: Transform.flip_at_index(
            model.tools.transforms,
            action.idx
          ),
        },
      };
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

export const go = (
  model: Model.t,
  setModel: SetStoreFunction<Model.t>,
  action: Action.t
): void => {
  if (model.settings.sound) sound(model, action);
  if (model.settings.motion != "Off") flipping.read();
  if (model.settings.motion == "On") flipping_comp.read();
  const result = update(model, action);
  if (result == "NoChange") {
    console.log("NoChange");
    return;
  } else {
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
  //if (action.t != 'setSelect') return setModel(update(model, action));
  //const new_model = update(model, action);
  //console.log("path old:",model.stage.selection);
  //console.log("path new:",new_model.stage.selection);
  //console.log("path eq:",Path.eq(new_model.stage.selection, model.stage.selection));
  //console.log("path_eq_2:",JSON.stringify(new_model.stage.selection) == JSON.stringify(model.stage.selection));
  /*if (action.t == 'setSelect' &&  !Path.doesp1startwithp2( model.stage.selection,new_model.stage.selection)) {
    console.log("setSelect new model");
   setModel(new_model)};*/
  if (model.settings.motion == "On") flipping_comp.flip();
  if (model.settings.motion != "Off") flipping.flip();
};
