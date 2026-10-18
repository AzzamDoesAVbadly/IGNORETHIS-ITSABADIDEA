# Cheap AI — landing site

The public site for the project. Plain HTML + CSS + JS, built with Vite, deployed to Netlify (or Vercel).

## Run it locally

```bash
cd my-project
npm install
npm run dev       # http://localhost:5173
npm run build     # outputs dist/
npm run preview   # serve the built dist/
```

## Layout

```text
my-project/
├── index.html          # the page
├── src/main.js         # scroll-spy route panel, live clock, lead form
├── src/styles.css
├── public/             # copied as-is: favicon.svg, thanks.html
└── netlify.toml
```

## Lead form

The form uses [Netlify Forms](https://docs.netlify.com/forms/setup/). Netlify finds the form in
`index.html` at deploy time, and submissions show up under **Site → Forms** in the Netlify
dashboard. You may need to enable form detection there once.

- In `npm run dev` the submission is faked (logged to the console), since Netlify Forms only exists on the deployed site.
- Without JavaScript the form still works: it posts normally and lands on `/thanks.html`.
- On Vercel the form won't store anything. Netlify is the intended host.

## Deploy

The repo-root `netlify.toml` and `vercel.json` both point at this folder, so connecting the repo
to either host with default settings deploys this site.
