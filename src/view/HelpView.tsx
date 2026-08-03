import { Component, Show } from "solid-js";

/* Bottom-right help badge: deliberately bigger and higher-contrast than
 * the corner settings icons — the one control a newcomer should find.
 * Hovering reveals a terse guide to the two modes. */
export const HelpView: Component<{ dragging: boolean }> = (props) => (
  <div id="help">
    <div class="badge">?</div>
    <div class="panel">
      <p>
        <b>nool</b> makes math tweakable, tuggable, and fussable. it's a work in
        progress. there isn't much to do yet. but you can bop it. on the left is
        the <b>noolbox</b>, and on the right is the <b>stage</b>.
      </p>
      <p>
        there are two different ways to play; switch using the top-left corner
        icon:
      </p>
      <p>
        <b>drag mode</b>
        <Show when={props.dragging}> (you're in it)</Show>: grab part of the
        stage and pull. things can only go where tools in the noolbox let them.
        tools light up when you pull things in the way they describe. pull far
        enough and the stage will stick like that. de/activate tools by clicking
        them; the more tools active, the more soupy pulling will be.
      </p>
      <p>
        <b>select mode</b>
        <Show when={!props.dragging}> (you're in it)</Show>: click part of the
        stage to select it, or use arrow keys; matching tools light up in the
        box. click one to transform your selection.
      </p>
      <p>
        see if you can simplify the stage. the drag guides (the icon below the
        mode switch) help show where pulls can lead.
      </p>
    </div>
  </div>
);
