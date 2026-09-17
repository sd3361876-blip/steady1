# Your Steady Promise onboarding screen

## Scope
Update only onboarding step 12 of 18, currently titled “Building your personalized Steady plan…”, plus the native review package needed by its Rate STEADY button.

## Changes
- Replace the title and subtitle with “Your Steady Promise” and the supplied supporting copy.
- Remove the three animated personalized-plan checklist rows and the 4.9/rating-count content.
- Remove this step’s timers and automatic advance so it remains visible until Back or Continue is tapped.
- Center the title, subtitle, wreath section, review prompt, and rating action as one balanced mobile layout while preserving the existing dark theme, green accent, typography, progress indicator, and step count.
- Add an elegant green laurel composition containing the supplied three-line message. Animate the wreath and message together once on entry with a restrained 600ms fade-and-scale ease-out, respecting reduced-motion preferences.
- Add “Would you rate STEADY?” and the green “★★  Rate STEADY ★★” button.
- Restore this step to the shared bottom Back and Continue controls. Back returns to the immediately preceding onboarding step; Continue advances through the existing step state. Neither depends on rating.
- Remove the special-case hiding of navigation controls for this step. Keep the existing special handling for the separate rating screen unchanged.
- Install `@capawesome/capacitor-app-review` at the Capacitor 8-compatible version without upgrading Capacitor or other packages.
- On this step only, call `AppReview.requestReview()` from the Rate STEADY button. Catch failures silently and always release the button state, without advancing or blocking onboarding.
- Keep Android hardware-back behavior within the existing onboarding/browser history architecture; no separate navigation system will be introduced.

## Verification
- Confirm the old title, subtitle, checklist, 4.9 content, and all step-12 auto-advance timers are gone.
- Confirm the progress indicator still reads 12/18 on this step and remains unchanged elsewhere.
- Confirm Back returns to step 11 and Continue advances to step 13.
- Confirm Continue is always enabled on this step, including during or after a review request.
- Confirm the wreath entrance runs once per entry without continuous motion.
- Confirm the review action invokes Capawesome App Review and silently tolerates rejection or no visible Google dialog.
- Check the 392×852 Android-sized preview for centered content and non-overlapping controls, then run the project typecheck.
