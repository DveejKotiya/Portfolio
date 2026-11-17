# Dveej Kotiya Portfolio — Vercel Deployment

This is a static HTML, CSS, and JavaScript portfolio. It is ready to deploy on Vercel; no framework, build step, or environment variables are required.

## Deploy with the Vercel website

1. Extract this ZIP file.
2. Push the contents of this folder to a GitHub repository (make sure `index.html` is in the repository root).
3. Open https://vercel.com/new and import that GitHub repository.
4. In the project configuration, choose **Other** as the framework preset.
5. Leave **Build Command** empty and set **Output Directory** to `.` (the project root).
6. Select **Deploy**.

## Deploy with the Vercel CLI

Install the Vercel CLI, sign in, then run these commands from this folder:

```bash
npm i -g vercel
vercel
```

Follow the prompts. For a production deployment, run:

```bash
vercel --prod
```

## Project files

- `index.html` — portfolio page
- `style.css` — responsive styling and animations
- `script.js` — mobile navigation and dynamic copyright year
- `assets/` — favicon and profile artwork
- `vercel.json` — Vercel static hosting configuration

The GitHub Activity section fetches public profile/repository data from the GitHub REST API and renders statistics cards and a language distribution chart directly in the page. It requires a browser connection and is subject to GitHub's unauthenticated API rate limits.