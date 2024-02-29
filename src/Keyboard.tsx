import * as Action from "./Action";

const action_of = (key: string): Action.t | "NoBinding" => {
  switch (key) {
    case "Escape":
      return { t: "restart" };
    case "ArrowLeft":
      return { t: "moveStage", direction: "left" };
    case "ArrowRight":
      return { t: "moveStage", direction: "right" };
    case "ArrowUp":
      return { t: "moveStage", direction: "up" };
    case "ArrowDown":
      return { t: "moveStage", direction: "down" };
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
    case "f":
      return { t: "Project", action: "toggleEnfoldCurrent", id: undefined };
    default:
      return "NoBinding";
  }
};

export const keydown = (inject: Action.Inject) => (event: KeyboardEvent) => {
  //console.log("keydown:" + keyName);
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
