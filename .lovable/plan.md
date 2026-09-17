# Refine the Your Steady Promise screen

## Scope
Update only onboarding step 12 of 18 and verify its existing Android in-app review integration.

## Changes
- Keep the title and subtitle centered at the top.
- Move the three-line “YOU'RE NOT ALONE…” message directly below the subtitle and give it clear visual prominence.
- Replace the current circular leaf arrangement with a larger, open laurel composition modeled on the supplied reference, built from existing green leaf icons so the reference image itself is not embedded.
- Place “YOUR HEALING STARTS WITH YOU” as a single centered line inside the wreath.
- Apply the existing 600ms fade-and-scale entrance only to the wreath and its inner text, once each time this step is entered; keep reduced-motion support and use CSS animation compatible with Android release WebViews.
- Keep the review prompt and button below the wreath, and retain the shared Back/Continue controls without introducing scrolling or overlap at the 392×852 Android viewport.
- Add only the new inner-wreath copy to the existing English onboarding strings.

## Native review verification
- Confirm `@capawesome/capacitor-app-review` remains installed at the Capacitor 8-compatible version.
- Confirm Android Gradle and Capacitor plugin registration are present.
- Confirm the Rate STEADY action calls `AppReview.requestReview()` only on native platforms, catches failures silently, never advances onboarding, and always restores the button state.

## Verification
- Check the screen at 392×852 for order, centering, legibility, and non-overlapping controls.
- Confirm the entrance animation is non-looping and scoped to the wreath group.
- Confirm Back, Continue, and the 12/18 progress indicator remain unchanged.
- Run the project typecheck.
