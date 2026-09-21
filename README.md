# قائمة التشغيل الخاصة بالقبة

Arabic, right-to-left planetarium startup and shutdown checklists, with equipment
photos and a reference for shows. Runs directly in a browser without a build step
or a Claude account.

Website: [قائمة التشغيل الخاصة بالقبة](https://udtwarrior.github.io/planetarium_op/)

Repository: [UDTWarrior/planetarium_op](https://github.com/UDTWarrior/planetarium_op)

## Use

Open the deployed site on a phone, tablet, or computer. On Android, use the browser's
Install app / Add to Home Screen command. On iPhone or iPad, open it in Safari and
choose Share > Add to Home Screen.

After the first successful online load, the checklist and embedded pictures are
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
make the app independent. The app includes the original embedded equipment images.
