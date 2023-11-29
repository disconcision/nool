import * as Action from "./Action";

export const keydown = (inject: Action.Inject) => (event: KeyboardEvent) => {
  //console.log("keydown:" + keyName);
  switch (event.key) {
    case "ArrowLeft":
      inject({ t: "moveStage", direction: "left" });
      break;
    case "ArrowRight":
      inject({ t: "moveStage", direction: "right" });
      break;
    case "ArrowUp":
      inject({ t: "moveStage", direction: "up" });
      break;
    case "ArrowDown":
      inject({ t: "moveStage", direction: "down" });
      break;
    case "1":
      inject({ t: "applyTransform", idx: 0, direction: "forward" });
      break;
    case "2":
      inject({ t: "applyTransform", idx: 1, direction: "forward" });
      break;
    case "3":
      inject({ t: "applyTransform", idx: 2, direction: "forward" });
      break;
    case "4":
      inject({ t: "applyTransform", idx: 3, direction: "forward" });
      break;
    case "w":
      inject({ t: "moveTool", direction: "up" });
      break;
    case "s":
      inject({ t: "moveTool", direction: "down" });
      break;
    case "a":
      inject({ t: "moveTool", direction: "left" });
      break;
    case "d":
      inject({ t: "moveTool", direction: "right" });
      break;
    case " ":
      inject({ t: "applyTransformSelected" });
  }
};

export const keyup = (_inject: Action.Inject) => (event: KeyboardEvent) => {
  //console.log("keyup:" + keyName);
  switch (event.key) {
  }
};
