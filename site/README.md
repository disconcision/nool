# nool site

nool's project page (`index.html`, the hub) and its algebra studies (`studies/`), a React + Vite package of its own, separate from nool classic (the Solid app at the repo root).

```bash
npm install
npm run dev        # http://localhost:3200/ (hub) and /studies/
npm run build      # dist/, relative paths, so it can be published under any prefix
npm run typecheck
```

- `index.html`: the hub. Its live whiteboard is `src/home/whiteboard.tsx` (`mountWhiteboard(figure)`).
- `studies/index.html` → `src/studies/`: the algebra studies gallery (`#/`), each demo at `#/demos/<id>`.
- `src/dragology/`: vendored Dragology, see [VENDORED.md](VENDORED.md).
- `public/shots/`: 1200×750 screenshots of the four demos, for the hub's cards.

Text in `<span class="scaffold">` (orange) is placeholder prose to rewrite.
