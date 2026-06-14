/**
 * Capture a single still frame from a live camera MediaStream into a JPEG File,
 * then stop the stream (US-0.2 AC-2: granted camera → live capture, handed to
 * the US-1.2 upload pipeline as a normal File). Kept tiny and isolated from the
 * upload logic, which US-1.2 owns.
 */
export async function capturePhotoFromStream(stream: MediaStream): Promise<File> {
  const video = document.createElement("video");
  video.srcObject = stream;
  video.muted = true;
  await video.play();
  // Wait one frame so dimensions are known.
  await new Promise((r) => requestAnimationFrame(() => r(null)));

  const w = video.videoWidth || 1280;
  const h = video.videoHeight || 720;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (ctx) ctx.drawImage(video, 0, 0, w, h);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.92),
  );
  // Always release the camera once we have the frame.
  stream.getTracks().forEach((tk) => tk.stop());
  video.srcObject = null;

  if (!blob) throw new Error("photo capture failed");
  // A camera-captured frame carries no EXIF GPS, so nothing to strip here.
  return new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" });
}
