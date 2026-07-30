import * as Action from "./Action";
import * as Model from "./Model";
import * as Navigate from "./Navigate";

const arrow_of = (key: string): Navigate.Direction | null => {
  switch (key) {
    case "ArrowLeft":
      return "left";
    case "ArrowRight":
      return "right";
    case "ArrowUp":
      return "up";
    case "ArrowDown":
      return "down";
    default:
      return null;
  }
};

const action_of = (key: string): Action.t | "NoBinding" => {
  switch (key) {
    case "Escape":
      return { t: "restart" };
    case "1":
      return { t: "applyTransform", idx: 0, direction: "forward" };
    case "2":
      return { t: "applyTransform", idx: 1, direction: "forward" };
    case "3":
      return { t: "applyTransform", idx: 2, direction: "forward" };
    case "4":
      return { t: "applyTransform", idx: 3, direction: "forward" };
    case "w":
      return { t: "moveTool", direction: "up" };
    case "s":
      return { t: "moveTool", direction: "down" };
    case "a":
      return { t: "moveTool", direction: "left" };
    case "d":
      return { t: "moveTool", direction: "right" };
    case " ":
      return { t: "applyTransformSelected" };
    default:
      return "NoBinding";
  }
};

export const keydown =
  (inject: Action.Inject, model: Model.t) => (event: KeyboardEvent) => {
    const dir = arrow_of(event.key);
    if (dir) {
      event.preventDefault();
      /* drag mode has no selection mechanic to move */
      if (model.settings.dragging) return;
      /* Screen-space movement, measured off the rendered stage at press
       * time; no candidate in that direction means no move (and no sound) */
      const path = Navigate.next(model.stage, dir);
      if (path) inject({ t: "setSelect", path });
      return;
    }
    let action = action_of(event.key);
    if (action == "NoBinding") return;
    event.preventDefault();
    inject(action);
  };

export const keyup = (_inject: Action.Inject) => (event: KeyboardEvent) => {
  //console.log("keyup:" + keyName);
  switch (event.key) {
  }
};
