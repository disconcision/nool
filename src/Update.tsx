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

export const update = (model: Model.t, action: Action.t): Model.t => {
  switch (action.t) {
    case "restart":
      return Model.init;
    case "setSetting":
      return {
        ...model,
        settings: Settings.update(model.settings, action.action),
      };
    case "setSelect":
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
      if (result != "NoMatch") {
        const new_stage = Stage.put_exp(model.stage, result);
        return { ...model, stage: new_stage };
      } else {
        return model;
      }
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
      if (result2 != "NoMatch") {
        transform.sound(); //TODO
        return { ...model, stage: Stage.put_exp(model.stage, result2) };
      } else {
        return model;
      }
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

export const go = (model: Model.t, setModel: any, action: Action.t): void => {
  if (model.settings.sound) sound(model, action);
  if (model.settings.motion != "Off") flipping.read();
  if (model.settings.motion == "On") flipping_comp.read();
  setModel(update(model, action));
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
