# قائمة التشغيل الخاصة بالقبة

Arabic, right-to-left planetarium startup and shutdown checklists, with equipment
photos and a reference for shows. Runs directly in a browser without a build step
or a Claude account.

Website: [قائمة التشغيل الخاصة بالقبة](https://udtwarrior.github.io/planetarium_op/)

Previous UI: [Classic checklist](https://udtwarrior.github.io/planetarium_op/classic.html)

The classic page preserves the pre-redesign layout with full-size inline photos.
Both pages use the latest image files and share this browser's saved edits, progress,
and theme. The classic page also works offline and has its own installation start URL.
When updating default checklist text or image order, keep the `DEF` data in
`index.html` and `classic.html` identical so saved checkmarks stay aligned between them.

Repository: [UDTWarrior/planetarium_op](https://github.com/UDTWarrior/planetarium_op)

## Use

Open the deployed site on a phone, tablet, or computer. On Android, use the browser's
Install app / Add to Home Screen command. On iPhone or iPad, open it in Safari and
choose Share > Add to Home Screen.

After the first successful online load, the checklist and reference pictures are
cached for offline use. The optional Google font needs internet; an Arabic system
font is used when it is unavailable.

Progress, theme, and edits are saved in that device's browser. They do not sync
between devices. Clearing browser data removes them. Editing a list resets that
list's checked steps so old checkmarks cannot move onto different instructions.

Use the section selector or Next step button to navigate without changing any
checkmarks. Tap a reference photo to view it full-size and toggle zoom. Resetting
progress, restoring defaults, and discarding unsaved edits require confirmation.
Keyboard users can switch tabs with the arrow keys and close dialogs with Escape.

The shutdown list retains the original note identifying steps inferred from the
startup sequence. The equipment instructions have not been independently verified.

## Development

### Editing Photos

The website loads `images/reference-01.webp` through `reference-17.webp` directly.
Edit these files in Photoshop and export over the same filename with transparency
enabled. Refresh the page to load the edited files. No Base64 replacement is needed.
The image elements do not paint a background; transparent pixels show the surrounding
card or viewer color (use dark mode to distinguish transparency from white pixels).

The online app revalidates images and keeps the latest successful copy for offline
use. Publish image changes to GitHub for other devices to see them; local edits alone
do not update the hosted site. Keep layered Photoshop originals separately.

PNG paths are also supported. If changing filenames or formats, update the `!images/…`
lines in `index.html`, the precache list in `sw.js`, and the deployment verifier.
Existing saved lists automatically replace recognized old embedded photos with the
new file paths, without changing custom instructions, custom pictures or checkmarks.

### Local Testing

Open `index.html` directly for basic use. To test installation and offline support:

```sh
npm install
npm run dev
```

Open `http://localhost:4173/planetarium_op/`.

```sh
npx playwright install chromium webkit
npm test
```

## Deployment

GitHub Pages serves the root of the `main` branch. `.nojekyll` keeps the files as
plain static assets. All application paths are relative to support repository URLs.
Increment `CACHE_NAME` in `sw.js` when changing deployed application files.
The GitHub Actions verification checks that the live HTML and offline assets match
the committed files after each push.

## Source

Imported from the [shared Claude conversation](https://claude.ai/share/d2e1ec88-6f38-4f27-b79a-ab1c01d91b97)
and its published HTML artifact. Claude's injected hosting runtime was removed to
make the app independent. Equipment images were extracted into editable files; some
have since been edited to remove their backgrounds.
