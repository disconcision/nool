import * as Action from "./Action";

export const keydown = (inject: Action.Inject) => (event: KeyboardEvent) => {
  //console.log("keydown:" + keyName);
  switch (event.key) {
    case "ArrowLeft":
      inject({ t: "selectParent" });
      break;
    case "ArrowRight":
      inject({ t: "selectFirstChild" });
      break;
    case "ArrowUp":
      inject({ t: "cycleSelectKids", direction: "up" });
      break;
    case "ArrowDown":
      inject({ t: "cycleSelectKids", direction: "down" });
      break;
    case "1":
      inject({ t: "applyTransform", idx: 0 });
      break;
    case "2":
      inject({ t: "applyTransform", idx: 1 });
      break;
    case "3":
      inject({ t: "applyTransform", idx: 2 });
      break;
    case "4":
      inject({ t: "applyTransform", idx: 3 });
      break;
  }
};

export const keyup = (_inject: Action.Inject) => (event: KeyboardEvent) => {
  //console.log("keyup:" + keyName);
  switch (event.key) {
  }
};
