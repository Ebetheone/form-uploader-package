# form-uploader example (Next.js)

Demo app showing the `form-uploader` package in a real Next.js site. It uses the local
package via a `file:..` dependency, so no publish needed. The page renders the
`<form-uploader>` element with an extra `company` field and a 3-image limit, and shows
the submitted payload below the form.

## Run

```bash
npm --prefix .. install   # once: root toolchain for building the package
npm install               # install example deps
npm run dev               # builds the package, then starts Next.js on port 3000
```

Open http://localhost:3000 in your browser.

## Scripts

- `npm run dev`: rebuild the package, then `next dev --port 3000`.
- `npm run build`: rebuild the package, then `next build`.
- `npm start`: serve the production build on port 3000 (run `npm run build` first).

## Troubleshooting

If `npm install` fails with an `EPERM` error on `~/.npm`, your npm cache has
root-owned files. Either fix it with the `chown` command from npm's error message,
or install with a temp cache: `npm install --cache /tmp/npm-cache`.
