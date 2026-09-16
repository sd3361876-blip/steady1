# Add reusable page banners

## Implementation
- Add one shared image-banner component with a responsive 2:1 frame, 20px rounded clipping, full-width `object-cover` image, and consistent 16px spacing below.
- Bundle the ten verified JPEG uploads directly into the app so they work in the offline Capacitor Android WebView.
- Place the exact assigned banner first in each page’s content, directly beneath its existing title and subtitle:
  - Add a Picture: `picture.jpg`
  - Red Flags: `redflag.jpg`
  - Wins: `wins.jpg`
  - Affirmations: `affirmations.jpg`
  - Healing Tools: `healing.jpg`
  - Journey: `journey.jpg`
  - Triggers: `trigger.jpg`
  - Unsent letters: `unsent.jpg`
  - Rituals: `ritual.jpg`
  - Daily Guided Exercise: `exercise.jpg`
- Preserve all existing illustrations, cards, controls, navigation, SOS behavior, and page logic.

## Verification
- Confirm all ten bundled files remain valid JPEGs and are emitted by the production asset pipeline.
- Check representative AppShell, ActivityListScreen, and SubScreen pages at the Android-sized viewport for rendered images, correct clipping, spacing, and no broken-image indicators.
- Run the project’s automatic typecheck/build validation.
