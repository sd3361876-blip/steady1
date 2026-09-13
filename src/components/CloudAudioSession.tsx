import { CloudOff, Loader2, Pause, Play, RotateCcw, Square } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { CalmOrb } from "@/components/CalmOrb";
import { SubScreen } from "@/components/SubScreen";
import { Button } from "@/components/ui/button";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { claimAudio, releaseAudio } from "@/lib/audio/activeAudio";
import { formatClock } from "@/lib/meditation";
import { haptic } from "@/lib/native/haptics";
import { refreshNetworkStatus } from "@/lib/offline/network";

export const AUDIO_OFFLINE_MESSAGE =
  "Internet connection required to play this audio. Please check your connection and try again.";
export const AUDIO_ERROR_MESSAGE =
  "We couldn't load this audio right now. Please check your connection and try again.";

export type CloudAudioTrack = { label: string; src: string };

/**
 * Reusable cloud audio player used by Mindful Meditation, the Journey
 * meditation activity and every Healing Audio session. Streams the given URL,
 * reads the real duration from metadata, keeps timer + progress bar in sync and
 * tears everything down on unmount so nothing keeps playing in the background.
 */
export function CloudAudioSession({
  track,
  screenTitle = "Mindful Meditation",
  onExit,
  onComplete,
  completionTitle = "Meditation Complete",
  completionMessage,
  doneLabel = "Done",
}: {
  track: CloudAudioTrack;
  onExit: () => void;
  /** Fired once when the audio session finishes playing. */
  onComplete?: (() => void) | undefined;
  completionTitle?: string | undefined;
  completionMessage?: string | undefined;
  doneLabel?: string | undefined;
  screenTitle?: string | undefined;
}) {
  const { online } = useNetworkStatus();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const completedRef = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    completedRef.current = false;
    setComplete(false);
    setElapsed(0);
    setDuration(0);
    setError(null);
    setLoading(true);
    setPlaying(false);

    const audio = new Audio();
    audio.preload = "metadata";
    audioRef.current = audio;
    claimAudio(audio);

    const onMeta = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const onTime = () => setElapsed(audio.currentTime);
    const onWaiting = () => setLoading(true);
    const onCanPlay = () => setLoading(false);
    const onPlaying = () => {
      setLoading(false);
      setError(null);
      setPlaying(true);
    };
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      setPlaying(false);
      setComplete(true);
      haptic.success();
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete?.();
      }
    };
    const onError = () => {
      setLoading(false);
      setPlaying(false);
      setError(AUDIO_ERROR_MESSAGE);
    };

    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("durationchange", onMeta);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    void (async () => {
      const connected = await refreshNetworkStatus();
      if (cancelled) return;
      if (!connected) {
        setLoading(false);
        setError(AUDIO_OFFLINE_MESSAGE);
        return;
      }
      audio.src = track.src;
      audio.load();
      try {
        await audio.play();
        if (!cancelled) setPlaying(true);
      } catch (err) {
        if (cancelled) return;
        // Autoplay may be blocked — the player still works via the Play button.
        if ((err as { name?: string })?.name !== "AbortError") setPlaying(false);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("durationchange", onMeta);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      releaseAudio(audio);
      audioRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track.src, attempt]);

  // Pause immediately if the connection drops mid-session.
  useEffect(() => {
    if (online) return;
    const audio = audioRef.current;
    if (audio && !audio.paused) {
      audio.pause();
      setPlaying(false);
      setError(AUDIO_OFFLINE_MESSAGE);
    }
  }, [online]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || complete) return;
    haptic.select();
    if (audio.paused) {
      claimAudio(audio);
      void audio
        .play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false));
    } else {
      audio.pause();
      setPlaying(false);
    }
  }, [complete]);

  const remaining = duration > 0 ? Math.max(0, duration - elapsed) : 0;
  const progress = duration > 0 ? Math.min(100, (elapsed / duration) * 100) : 0;

  if (error) {
    return (
      <SubScreen title={screenTitle} description={track.label}>
        <div className="animate-in fade-in flex flex-col items-center py-10 text-center duration-300">
          <span className="flex size-16 items-center justify-center rounded-full bg-muted">
            <CloudOff className="size-7 text-muted-foreground" aria-hidden />
          </span>
          <p className="mt-5 text-sm text-muted-foreground">{error}</p>
          <Button
            className="press mt-8 h-12 w-full rounded-2xl"
            onClick={() => {
              haptic.light();
              setAttempt((n) => n + 1);
            }}
          >
            <RotateCcw className="size-4" aria-hidden /> Retry
          </Button>
          <Button
            variant="secondary"
            className="press mt-3 h-12 w-full rounded-2xl"
            onClick={onExit}
          >
            Exit
          </Button>
        </div>
      </SubScreen>
    );
  }

  return (
    <SubScreen title={complete ? completionTitle : screenTitle} description={track.label}>
      <CalmOrb active={playing} className="my-6" />

      <div className="text-center">
        <p className="text-4xl font-semibold tabular-nums">{formatClock(complete ? 0 : remaining)}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {duration > 0 ? `of ${formatClock(duration)}` : "Loading audio…"}
        </p>
      </div>

      {/* Seekable progress bar: a native range input so touch (Android) and
          pointer (web) dragging both move playback position. */}
      <input
        type="range"
        min={0}
        max={duration > 0 ? duration : 0}
        step={0.1}
        value={complete ? duration : Math.min(elapsed, duration || 0)}
        disabled={duration <= 0}
        aria-label="Seek audio position"
        onChange={(event) => {
          const audio = audioRef.current;
          const next = Number(event.target.value);
          if (!audio || !Number.isFinite(next)) return;
          audio.currentTime = next;
          setElapsed(next);
          if (complete) setComplete(false);
        }}
        className="mt-5 h-2 w-full cursor-pointer appearance-none rounded-full bg-muted outline-none [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-primary [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
        style={{
          background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${complete ? 100 : progress}%, hsl(var(--muted)) ${complete ? 100 : progress}%, hsl(var(--muted)) 100%)`,
          touchAction: "none",
        }}
      />

      {complete ? (
        <>
          {completionMessage ? (
            <p className="animate-in fade-in mt-6 text-center text-sm text-muted-foreground duration-500">
              {completionMessage}
            </p>
          ) : null}
          <Button className="press mt-8 h-12 w-full rounded-2xl" onClick={onExit}>
            {doneLabel}
          </Button>
        </>
      ) : (
        <div className="mt-8 flex gap-3">
          <Button className="press h-12 flex-1 rounded-2xl" onClick={toggle} disabled={loading && !playing}>
            {loading && !playing ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden /> Loading
              </>
            ) : playing ? (
              <>
                <Pause className="size-4" aria-hidden /> Pause
              </>
            ) : (
              <>
                <Play className="size-4" aria-hidden /> Resume
              </>
            )}
          </Button>
          <Button
            variant="secondary"
            className="press h-12 flex-1 rounded-2xl"
            onClick={() => {
              haptic.light();
              onExit();
            }}
          >
            <Square className="size-4" aria-hidden /> Stop
          </Button>
        </div>
      )}
    </SubScreen>
  );
}
