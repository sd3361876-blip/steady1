# Reorganize the hamburger menu and add Journal Lock back navigation

## What will change

- Keep **Pro**, **Reset No Contact Date**, **Invite Friends**, **Rate Us on Google**, **Journal Lock**, and **Log Out** directly visible in the hamburger menu.
- Add two expandable menu groups:
  - **HELP & ACCOUNT**: Give Feedback, Submit Bug, Redo Onboarding, Restore Purchases.
  - **INFO & LEGAL**: Privacy Policy, About, Terms & Conditions.
- Reuse the existing `JournalLockSetting` control inside the hamburger menu, so setup, disabling, authentication, and saved state remain shared with Settings.
- Add a top-left back arrow to the Journal Locked screen. It will navigate to the previous screen without unlocking or changing Journal Lock.

## Preserved behavior

- Existing actions, icons, dialogs, navigation, haptics, and subscription behavior remain unchanged.
- Existing light/dark theme tokens and drawer styling remain unchanged.
- The Journal content and Journal Lock security logic remain unchanged.

## Verification

- Check the drawer’s direct items and both expandable groups.
- Check Journal Lock from both Settings and the drawer.
- Check that Back leaves the locked Journal while the lock remains active.
