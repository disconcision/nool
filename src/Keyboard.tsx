import { Inject } from "./Update";

export const keydown = (inject: Inject) => (event: KeyboardEvent) => {
  const keyName = event.key;
  //console.log("keydown:" + keyName);
  switch (keyName) {
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
  }
};

export const keyup = (_inject: Inject) => (event: KeyboardEvent) => {
  const keyName = event.key;
  //console.log("keyup:" + keyName);
  switch (keyName) {
  }
};
