/**
 * English UI catalogue. The app ships English only; this module is the single
 * source of truth for static UI copy.
 */

import { screensEn } from "./en/screens";
import { screensBn } from "./bn-IN/screens";
import { uiEn } from "./en/ui";
import { uiBn } from "./bn-IN/ui";

export const en = {
  common: {
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    close: "Close",
    back: "Back",
    remove: "Remove",
    change: "Change",
    upload: "Upload",
    logOut: "Log out",
    logOutQuestion: "Are you sure you want to log out?",
    settings: "Settings",
  },
  nav: {
    home: "Home",
    flags: "Flags",
    wins: "Wins",
    badges: "Badges",
    activity: "Activity",
  },
  drawer: {
    resetDate: "Reset No Contact Date",
    invite: "Invite Friends",
    privacy: "Privacy Policy",
    terms: "Terms & Conditions",
    about: "About",
    restore: "Restore Purchases",
    feedback: "Give Feedback",
    redoOnboarding: "Redo Onboarding",
    version: "Version",
    developer: "Developer",
    privacyNote:
      "Privacy commitment: your flags, wins and letters are stored on your device first and only synced to your private account. We never sell or share your data.",
  },
  reset: {
    title: "Reset Streak?",
    description: "This will permanently reset your No Contact timer.",
    action: "Reset",
    pickNew: "Pick your new start",
    since: "No contact since",
    saveNewDate: "Save new date",
    done: "Your no-contact date has been reset.",
    failed: "Couldn't reset right now — it will retry.",
  },
  settings: {
    title: "Settings",
    editProfile: "Edit profile",
    editProfileDesc: "Name, bio and photo.",
    profilePhoto: "Profile photo",
    photoHint: "Upload a photo from your device.",
    cropTitle: "Crop your photo",
    cropHint: "Drag to reposition, pinch or use the slider to zoom.",
    cropPreview: "Preview",
    zoom: "Zoom",
    appearance: "Appearance",
    appearanceDesc: "Light, dark or match your device.",
    themeLight: "Light",
    themeDark: "Dark",
    themeSystem: "System default",
    displayName: "Display name",
    bio: "Bio",
    recoveryStart: "Recovery start date",
    saveChanges: "Save changes",
    notifications: "Notifications",
    notificationsDesc: "Choose what you want to hear about.",
    morningReminder: "Morning reminder (9:00)",
    eveningReminder: "Evening reminder (16:30)",
    eveningReminderDesc: "Reflect on your day before the evening ends.",
    language: "Language",
    languageDesc: "App language",
    exportTitle: "Export my data",
    exportDesc: "Download a copy as JSON.",
    exportBtn: "Export",
    backup: "Backup & sync",
    connected: "Connected",
    offline: "Offline mode — changes save on this device",
    status: "Status",
    syncing: "Syncing",
    upToDate: "Up to date",
    waiting: "Waiting for network",
    pendingUploads: "Pending uploads",
    lastSync: "Last sync",
    notYet: "Not yet",
    syncNow: "Sync now",
    goPremium: "Go Premium",
    goPremiumDesc: "7 days free, then unlock everything.",
    premiumActive: "Premium active",
    deleteAccount: "Delete account",
    deleteTitle: "Delete account?",
    deleteDesc:
      "All of your cloud data — streak, flags, wins, badges and letters — will be deleted permanently. Confirm with your password to continue.",
    deleteForever: "Delete forever",
    yourPassword: "Your password",
    sendTest: "Send a test notification",
    testSent: "Test push sent to your device.",
    testSentLocal: "Sent a local test notification — remote push isn't configured yet.",
    testFailed: "Couldn't send a test notification on this device.",
    notificationsOn: "Reminders are on.",
    notificationsOnDevice: "Notifications are on for this device.",
    notificationsOff: "Notifications turned off.",
    permissionDenied:
      "Notifications are blocked. You can turn them on any time from your device settings.",
    notificationsSystemOff: "Notifications are disabled in your device settings.",
    openSystemNotifications: "Open device notification settings",
    notificationsSystemOffHint:
      "Turn notifications on for this app in Android settings, then come back — we'll re-check automatically.",
    openingSystemSettings: "Opening your device notification settings…",
    deleteBody1:
      "Deleting your account will permanently remove all data associated with your account from our servers. This action cannot be undone.",
    deleteBody2:
      "If you simply don't want to use the app right now and may return later, you can safely uninstall the app instead. Your account and progress will remain available when you sign back in.",
    typeDelete: 'Type "delete" to confirm',
    deleteConfirmTitle: "Delete your account?",
    deleteConfirmDesc:
      "This action is permanent and cannot be undone. Are you sure you want to delete your account?",
    keepAccount: "Keep account",
    deletedTitle: "Account deleted",
    deletedDesc:
      "Your account has been permanently deleted. We're sorry to see you go. If you ever decide to return, you're always welcome to create a new account.",
    redirecting: "Redirecting to the Sign In page in {{count}} seconds...",
  },
  notif: {
    daily_motivation: "Daily motivation",
    morning: "Morning reminder (9:00)",
    evening: "Evening reminder (20:00)",
    milestone: "No contact milestone",
    streak: "Streak reminder",
    sos: "SOS encouragement",
    inactivity: "Inactivity reminder",
  },
  home: {
    greeting: "Hi {{name}}",
    yourReset: "Your reset",
    hrs: "hrs",
    min: "min",
    sec: "sec",
  },
  toast: {
    saved: "Saved. It syncs automatically when you're online.",
    languageSaved: "Language updated.",
    exported: "Your data was exported.",
    backupComplete: "Backup complete.",
    loggedOut: "Logged out successfully.",
    photoUpdated: "Profile photo updated.",
    photoRemoved: "Profile photo removed.",
    photoFailed: "We couldn't use that image. Please try another.",
    badgeUnlocked: "🎉 Badge unlocked: {{name}}",
    badgesUnlocked: "🎉 {{count}} badges unlocked: {{names}}",
  },
} as const;


/** Shallow-per-namespace merge of the English section catalogues. */
function mergeCatalog(...parts: Record<string, unknown>[]): Record<string, unknown> {
  const out: Record<string, Record<string, unknown>> = {};
  for (const part of parts) {
    for (const [ns, values] of Object.entries(part ?? {})) {
      out[ns] = { ...(out[ns] ?? {}), ...(values as Record<string, unknown>) };
    }
  }
  return out;
}

const english = mergeCatalog(en as never, screensEn as never, uiEn as never);

const bengali = mergeCatalog(en as never, screensBn as never, uiBn as never);

export const resources = {
  en: { translation: english },
  "bn-IN": { translation: bengali },
} as const;
