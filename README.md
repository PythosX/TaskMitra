# TaskMitra — Offline Voice Task Assistant

## Important limitation

This project is **offline-first**, not a guarantee of offline browser speech recognition.

After the web app has been opened online once and its files are cached, the UI, task storage, task parser and text-to-speech can work without internet.

However, Chrome/Android browser speech recognition (`SpeechRecognition` / `webkitSpeechRecognition`) may depend on an online speech service on the A2 Core. Therefore, with Wi-Fi/mobile data completely OFF, the microphone may not work.

The typed command box is the reliable offline fallback.

For guaranteed offline voice recognition, the next version should be a native Android app with an offline speech-recognition engine.

## Upload to GitHub from the phone

1. Extract this ZIP.
2. Open github.com in Chrome.
3. Create a new repository, for example `taskmitra`.
4. Use "Add file" → "Upload files".
5. Upload `index.html`, `style.css`, `app.js`, `sw.js`, `manifest.json`, `icon.svg`, and this README.
6. Commit the files.

You can do all of this from the A2 Core browser, although GitHub's mobile interface may be easier in desktop-site mode.

## Deploy on Render

1. Open render.com.
2. Create a new **Static Site**.
3. Connect the GitHub repository.
4. Build Command: leave empty.
5. Publish Directory: `.`
6. Create the site.
7. Open the Render URL on the A2 Core.

## IMPORTANT: make it offline before turning data off

1. Open the Render URL while internet is ON.
2. Wait for the page to finish loading.
3. Open the app once or twice.
4. If Chrome offers "Install app", install TaskMitra.
5. Keep the app loaded long enough for the service worker to cache its files.
6. Test it once in airplane mode.
7. Turn Wi-Fi/mobile data OFF.
8. Open TaskMitra again.

## What works offline

- Existing tasks
- Add/edit/delete through the UI
- Task parsing from typed commands
- LocalStorage
- Task list
- Text-to-speech if the installed Android TTS engine has the required voice
- Cached PWA files

## What may NOT work offline

- Browser speech-to-text
- Anything requiring Render
- AI APIs
- Cloud synchronization
- Server-side reminders

## Recommended next version

For a truly independent A2 Core appliance:

A2 Core → native Android app → offline speech recognition → local database → AlarmManager → Android Text-to-Speech.

That is the correct architecture if the requirement is **100% offline voice commands**, including when airplane mode is on.
