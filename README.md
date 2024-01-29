## ∩∞ᒐ?

is a syntactic fidget spinner

## is n∞l?

n∞l is: https://andrewblinn.com/nool/

(needs view transitions api (currently only in chrome) for animations to play)

## n∞l n∞b?
1. `do clicks`.

## n∞lnatomy
`_______________________`<br>
`| s                 s |`<br>
`|  _____       _____  |`<br>
`| |     |     |     | |`<br>
`| noolbox  ∞  |stage| |`<br>
`| |_____|     |_____| |`<br>
`|                     |`<br>
`|_s_________________s_|`<br>

where s = settings

## Keyboard

### `↑` `↓` `→` `←` (stage hand)
### `w` `a` `s` `d` (tool hand)
### `SPACE` (sing) `ESCAPE` (die)

(keyboard controls aren't a priority. hand movements directions aren't yet localized per projection, so it might be hard to move in non-default layouts)

## make n∞l

### `nool` ⊃ `typescript`, `solid.js`

1. install node (21.2.0 works)
   - see https://nodejs.org/en/learn/getting-started/how-to-install-nodejs
   - `node --version`
2. install pnpm (8.10.5 works)<
   - `npm install --global pnpm@8.10.5 && SHELL=bash pnpm setup`
   - `source /home/runner/.bashrc`
3. build deps and run
   - `pnpm install`
   - `pnpm run build`

### `pnpm dev` or `pnpm start`

run in dev mode. reload on edits.
open [http://localhost:3000](http://localhost:3000)

### `pnpm run build`

builds deployable in `dist` folder
