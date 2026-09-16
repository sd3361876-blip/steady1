# Add the 7-Day Free Trial onboarding screen

## What will change
- Add one new onboarding step immediately after “Social Proof + Transformation.”
- Recreate the attached Steady trial artwork as a responsive in-app layout, preserving the tortoise/heart branding and portrait composition.
- Add a real fixed bottom button labeled “See my FREE offer,” styled to match the green reference button.
- Send that button to the existing next paywall/trial screen.
- Shift the remaining onboarding steps forward without changing their content or behavior.

## Technical details
- Keep the screen inside the existing questionnaire flow so progress, back navigation, and onboarding state remain intact.
- Use the existing bundled Steady mascot and semantic theme colors rather than embedding text or the button inside an image.
- Exclude the standard onboarding footer on this dedicated full-screen step and account for phone safe areas.
- Update the onboarding step count and conditional step indexes consistently.
- Verify the transition from Transformation to the trial offer, the button destination, and mobile portrait rendering.
