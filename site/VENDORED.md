# Vendored Dragology

`src/dragology/` is a slice of upstream Dragology's `src/`, copied so the algebra studies can be changed here without touching the Dragology repo.

- Upstream: [joshuahhh/dragology](https://github.com/joshuahhh/dragology) (also `declarative-dragging/dragology`), branch `main`
- Commit: `9ebd42c08c525c39863bb8075536a4729ddda639` (2026-11-02, "Pluggable value views, so pretty-print isn't a dependency")
- Licence: upstream's, copied to `src/dragology/LICENSE`

## What was copied

Exactly the files listed in `dragology-files.txt` (paths in upstream's tree), at the same paths under `src/dragology/` (upstream `src/x` is `src/dragology/x`). That list is the import closure of:

- the library (`lib.ts`, `DraggableRenderer`, `DragSpec`, `ops/`, `svgx/`, `math/`, …)
- the demo kit (`demo/`: registry, `ui.tsx`, `DemoPage`, `SingleDemoPage`, …) and `autoRoute`, `ValueView`, `index.css`
- the three algebra demos, `demos/animate-algebra/{tree,stage-builder,tree-macro}.tsx`, with `asts.ts`, `nool-tree.ts` and the peggy pattern parser (its `.peggy` source and `build.sh` too)

(The list also has `math/cobyla.d.ts`, a declaration file an import scan misses.)

## What was left out

Every other demo, `main.tsx` (nool's entry is `src/studies/main.tsx`), and `studio/` (except `StudioHackContext.tsx`, which the library imports), `study/`, `retro/`, `bench/`, `fuzz/` (except `fuzzDraggable.ts`, which `demo/index.ts` imports a type from), `IndexPage`, `NaturalNeighborTestPage`, all tests, and upstream's build tooling (vite plugins for QR codes and React prod mode, vitest, eslint).

## What was changed

Every vendored file is byte-identical to upstream except two, each edit marked `nool edit`:

- `demo/list.ts`: the demo list is just the four studies.
- `demo/ui.tsx`: a demo card's "github" link points at nool's copy (`disconcision/nool`, `site/src/dragology/demos/…`), and its "open in editor" path at `src/dragology/demos/…`.

## What's nool's own

- `demos/tiny-nool/index.tsx`: the D2 page's "algebra" demo card (`declarative-dragging.github.io/page/themes/demos/algebra.tsx`, a themed, cut-down animate-algebra): (−🍄 + ⭐) + 🐢 with commutativity and operand associativity. Logic and rendering byte-for-byte except imports (vendored lib instead of the `dragology` package; `asts` from `../animate-algebra/`), the page palette's INK/RED inlined, and the card's theme context replaced by an icon-set radio in the standard demo shell.
- `demos/whiteboard/index.tsx`: the whiteboard sketches as a standalone demo.
- `demos/whiteboard/wb.tsx`: copied from `declarative-dragging.github.io/page/whiteboard-live/wb.tsx` (itself from the D2 talk); only its imports changed.
- `../home/whiteboard.tsx` and `../home/tap-to-wake.ts`: the D2 project page's whiteboard figure, re-accented and exporting `mountWhiteboard()`.
- `../studies/`: the gallery page and the app's entry.

Toolchain differences: Vite 6 and `@vitejs/plugin-react` 4 (upstream: Vite 8, plugin-react 6, which need a newer Node than this machine's default 20.10); npm instead of pnpm.

## Resyncing

To pull a newer upstream into this copy (the demos here may have diverged on purpose, so look at the diff before keeping it):

```bash
# from site/, with an upstream checkout at $UP (e.g. git archive of upstream/main)
while read f; do mkdir -p "src/dragology/$(dirname "${f#src/}")"; cp "$UP/$f" "src/dragology/${f#src/}"; done < dragology-files.txt
git diff --stat src/dragology   # then re-apply the two "nool edit"s above
npm run typecheck && npm run build
```

If upstream adds imports, the build fails on the missing files; copy them in and add them to `dragology-files.txt`.
