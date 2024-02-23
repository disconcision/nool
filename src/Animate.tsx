const blah = (s: string) => `
::view-transition-old(${s}),
::view-transition-new(${s}) {
  transition: transform 550ms cubic-bezier(0.68, -0.6, 0.32, 1.6);
}
`;

export const init = ():void => {
  //TODO: unhardcode id max
  var style = document.createElement("style");
  for (let id = 0; id < 200; id++) {
    style.innerHTML += `#node-${id}.animate { view-transition-name: flip-node-${id}; }\n`;
    style.innerHTML += `#main.unsetSelections #sym-${id}, #main.setSelect #sym-${id}, #main.moveStage #sym-${id} { view-transition-name: flip-sym-${id}; }\n`;
    
    //style.innerHTML += `#main.setSelect #pat-${id} { view-transition-name: flip-pat-${id}; }`;
    //style.innerHTML += blah(`flip-node-${id}`);
    //style.innerHTML += blah(`flip-pat-${id}`);
  }
  style.innerHTML += `#main.setSelect .logo, #main.unsetSelections .logo  { view-transition-name: setSelect-logo  }\n`;
  style.innerHTML += `#main.setSelect #seed, #main.unsetSelections #seed  { view-transition-name: setSelect-seed  }\n`;
  //style.innerHTML += `#node.selected { view-transition-name: flip-node-selected; }\n`;
  document.getElementsByTagName("head")[0].appendChild(style);
};
