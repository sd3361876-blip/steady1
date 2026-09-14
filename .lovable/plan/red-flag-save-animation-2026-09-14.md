# Red Flag save animation

## Implementation
- Store the uploaded MP4 as an app asset without changing its video or audio content.
- Add a Red-Flag-only success state triggered exclusively after a successful save.
- Render the video through a document-level, full-viewport overlay above every app control.
- Block scrolling and pointer interaction while it plays, then dismiss on video completion with a safety timeout.
- Preserve the current Red Flag screen, save behavior, navigation, and all other animations.

## Verification
- Confirm the video format, dimensions, and duration remain unchanged.
- Verify the overlay covers the viewport, uses the existing light/dark treatment, and cannot appear on save failure.
- Run the project’s automatic validation checks.
