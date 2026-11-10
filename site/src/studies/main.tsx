// The algebra studies: upstream Dragology's demo app (src/main.tsx there),
// cut down to its gallery and single-demo pages, with nool's own gallery
// page in front. `#/` and `#/demos` are the gallery (SingleDemoPage's
// "back to all demos" goes to `/demos`); `#/demos/:id` is one demo, as
// upstream (`?minimal` included).

import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes } from "react-router-dom";
import { autoRoute } from "../dragology/autoRoute";
import { PrettyValueView } from "../dragology/demo/PrettyValueView";
import { SingleDemoPage } from "../dragology/demo/SingleDemoPage";
import "../dragology/index.css";
import { ValueViewProvider } from "../dragology/ValueView";
import { StudiesPage } from "./StudiesPage";
import "./studies.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ValueViewProvider component={PrettyValueView}>
      <HashRouter>
        <Routes>
          {autoRoute("/", StudiesPage)}
          {autoRoute("/demos", StudiesPage)}
          {autoRoute("/demos/:id", SingleDemoPage)}
        </Routes>
      </HashRouter>
    </ValueViewProvider>
  </React.StrictMode>,
);
