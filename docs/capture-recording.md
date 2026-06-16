# Live capture: photo + audio/video recording (FEAT-RTD)

Reusable primitives that turn a granted camera/mic stream into a saved `File` the
existing upload path consumes — so a moment can be captured **live**, not only
uploaded. Built on the permission layer in
[capture-permissions.md](./capture-permissions.md); a non-grant never dead-ends
(it falls back to file upload, per US-0.2 AC-3).

## What it provides

| Capability | Entry point | Returns |
|------------|-------------|---------|
| Take a still photo from the camera | `capturePhoto()` / `takePhoto()` | `image/jpeg` File (or null on non-grant) |
| Record audio | `useRecorder("audio")` | `audio/webm` (or mp4 on Safari) File on stop |
| Record video | `useRecorder("video")` | `video/webm` (or mp4) File on stop |

### Photo

`capturePhoto()` opens the camera just long enough to draw one video frame to a
canvas, encodes it to JPEG (q=0.92), and **always stops the stream** before
returning — the camera indicator never lingers. `takePhoto()` is the React-caller
convenience that returns the File on grant or null otherwise.

### Recording (state machine)

`useRecorder(kind)` drives one recorder through **idle → recording → stopping →
idle** and exposes:

- `start()` — opens the device (mic for audio; camera+mic for video), starts a
  `MediaRecorder`; resolves `false` on a non-grant (sets `denied`).
- `stop()` — stops and resolves the captured `File` named for the moment.
- `cancel()` — aborts without producing a file.
- `elapsed` — `mm:ss` readout, ticked ~4×/s while recording.
- `previewStream` — the live `MediaStream` to attach to a `<video>` for a video
  preview.
- `denied` — the last non-grant result enum, for showing the upload fallback.

The hook **owns teardown**: unmounting mid-recording cancels it and releases the
device.

## How it works

| Concern | Where |
|---------|-------|
| Photo capture, MediaRecorder recorder, pure helpers | [src/lib/capture/record.ts](../src/lib/capture/record.ts) |
| React hook + `takePhoto` | [src/lib/capture/useRecorder.ts](../src/lib/capture/useRecorder.ts) |
| Underlying permission grant + stream | [src/lib/capture/permissions.ts](../src/lib/capture/permissions.ts) (`requestMediaStream`) |
| Saved File → upload | [src/lib/media/client-upload.ts](../src/lib/media/client-upload.ts) (`uploadFile`) |

### MIME selection

`pickRecordingMime(kind)` walks a widest-support-first candidate list and returns
the first `MediaRecorder.isTypeSupported` match — webm/opus on Chromium/Firefox,
mp4 on Safari, `""` (let the browser choose) if nothing matches. The chosen
container drives the file extension via `extensionForMime`.

### SSR safety

Every browser API is guarded (`typeof MediaRecorder`, `hasNavigator`), so the
module is safe to import from a server component; the pure helpers run in Node for
unit tests.

## Notes / limits

- Recording produces webm where supported; Safari yields mp4. Both round-trip
  through the existing upload + media pipeline unchanged.
- No pause/resume yet — only start/stop/cancel. A future story could add pause.
- The browser-only lifecycle (getUserMedia, MediaRecorder, canvas grab) is
  exercised end-to-end by the moment-popup feature (FEAT-JZW); the unit tests
  cover the pure decision logic only.
