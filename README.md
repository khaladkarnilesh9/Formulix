<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/10ba11e5-c7b2-4f97-aa23-63bfe07edb5f

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Start the Django backend in a separate terminal using the Windows setup in [backend/README.md](./backend/README.md).
   It listens on `127.0.0.1:8001` by default; the Vite proxy uses this backend.
3. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
4. Run the frontend:
   `npm run dev`

The frontend catalog is loaded from Django. Anonymous users see published records only;
authorized staff can sign in to preview unpublished drafts. Imported drafts are not public.

## Responsive Navigation

Public pages use React Router URLs, including `/products`, `/formulations`,
`/ingredients`, `/compare`, `/workspace`, and `/workspace/research`. Product
and scientific record selections are preserved in URL query parameters.
Production hosting must serve `index.html` for unknown application paths.

Below 768px, the public portal has five bottom navigation items. The admin
portal at `/admin` has its own drawer and no public bottom navigation.
The existing operator roles are a local demo, not authentication or backend
authorization. The public mobile drawer shows the admin shortcut only after
the admin context has been visited in the current session.

## Browser Checks

Start a local preview on port 3002:

```sh
npm run dev -- --host 127.0.0.1 --port 3002
```

With Google Chrome installed, run `npm run test:responsive`. The suite checks
all routes at eight mobile, tablet, and desktop sizes, plus drawer keyboard
behavior, navigation history, search, filters, themes, admin forms, ingredient
rows, and import file selection. Screenshots are written to `test-results/`.
"# Formulix" 
