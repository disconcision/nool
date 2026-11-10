// nool's algebra studies gallery: upstream Dragology's DemoPage (its live
// demo cards, its settings bar), with only the algebra demos and
// nool's header in place of "Demos".

import { listedDemos } from "../dragology/demo/registry";
import {
  DemoCard,
  DemoSettingsBar,
  DemoSettingsProvider,
} from "../dragology/demo/ui";
import { useTitle } from "../dragology/useTitle";

// the hub's wordmark (public/wordmark.svg), relative so it works under any base
const wordmark = new URL("../wordmark.svg", document.baseURI).href;

export function StudiesPage() {
  useTitle("algebra studies · nool");
  return (
    <DemoSettingsProvider>
      <div className="studies-page min-h-screen flex flex-col">
        <div className="studies-sky" aria-hidden="true" />
        <header className="studies-header py-10 px-5 max-w-3xl mx-auto w-full">
          <a href="../" className="studies-home" title="back to nool">
            <img src={wordmark} alt="nool" width="7430" height="1812" />
          </a>
          <p className="studies-kicker">declarative dragging × nool</p>
          <h1 className="studies-title">algebra studies</h1>
          <p className="studies-sub">
            <span className="scaffold">
              Dragology demos about rewriting algebra by dragging, copied here
              to iterate on.
            </span>{" "}
            <span className="scaffold">Originals:</span>{" "}
            <a href="https://joshuahhh.com/dragology/#/demos">
              the Dragology demo gallery
            </a>
            <span className="scaffold"> and the</span>{" "}
            <a href="https://declarative-dragging.github.io/">
              declarative dragging page
            </a>
            .
          </p>
          <nav className="studies-toc" aria-label="Demos">
            {listedDemos.map((demo) => (
              // (buttons, not #fragment links: the hash is the router's)
              <button
                key={demo.id}
                type="button"
                onClick={() =>
                  document
                    .getElementById(demo.id)
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
              >
                {demo.id}
              </button>
            ))}
          </nav>
        </header>
        <div className="flex flex-col gap-5 px-5 pb-5 max-w-3xl mx-auto flex-1 w-full">
          {listedDemos.map((demo) => (
            <div key={demo.id} id={demo.id} className="study">
              <DemoCard demo={demo} linkTitle />
            </div>
          ))}
        </div>
        <div className="pb-14" />
        <DemoSettingsBar />
      </div>
    </DemoSettingsProvider>
  );
}
