import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { SubScreen } from "@/components/SubScreen";
import { WorryBoxArt } from "@/components/illustrations/wellness";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { worryRepo } from "@/data/repository";
import { useAuth } from "@/hooks/useAuth";
import { humanizeError } from "@/lib/analytics";
import { haptic } from "@/lib/native/haptics";
import type { WorryEntry } from "@/data/types";

export const Route = createFileRoute("/_authenticated/motivation/worry-box")({
  head: () => ({
    meta: [
      { title: "Worry Box | SOLACE: BREAKUP RECOVERY" },
      {
        name: "description",
        content: "Write down what is worrying you and store it safely until you are ready.",
      },
      { property: "og:title", content: "Worry Box | SOLACE: BREAKUP RECOVERY" },
      {
        property: "og:description",
        content: "A calm place to put your worries down for a while.",
      },
    ],
  }),
  component: WorryBoxScreen,
});

function formatLongDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

type Stage = "box" | "write" | "stored";

function WorryBoxScreen() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const queryClient = useQueryClient();
  const [stage, setStage] = useState<Stage>("box");
  const [text, setText] = useState("");
  const [saved, setSaved] = useState<WorryEntry | null>(null);
  const [openWorry, setOpenWorry] = useState<WorryEntry | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<WorryEntry | null>(null);

  const worries = useQuery({
    queryKey: ["worries", userId],
    queryFn: () => worryRepo.list(userId),
    enabled: Boolean(userId),
  });

  const save = useMutation({
    mutationFn: async (value: string) => worryRepo.save(userId, { worry_text: value }),
    onSuccess: (rows) => {
      queryClient.setQueryData(["worries", userId], rows);
      setSaved(rows[0] ?? null);
      setText("");
      setStage("stored");
      haptic.success();
    },
    onError: (error) => toast.error(humanizeError(error)),
  });

  const resolve = useMutation({
    mutationFn: async (id: string) => worryRepo.resolve(userId, id),
    onSuccess: (rows) => {
      queryClient.setQueryData(["worries", userId], rows);
      setOpenWorry(null);
      haptic.success();
      toast.success("Marked as resolved.");
    },
    onError: (error) => toast.error(humanizeError(error)),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => worryRepo.remove(userId, id),
    onSuccess: (rows) => {
      queryClient.setQueryData(["worries", userId], rows);
      setConfirmDelete(null);
      setOpenWorry(null);
      haptic.success();
      toast.success("Worry deleted.");
    },
    onError: (error) => toast.error(humanizeError(error)),
  });

  if (stage === "write") {
    return (
      <WriteWorry
        value={text}
        onChange={setText}
        pending={save.isPending}
        onBack={() => {
          haptic.light();
          setStage("box");
        }}
        onDone={() => {
          if (save.isPending) return;
          const value = text.trim();
          if (!value) {
            toast.error("Write a worry first.");
            return;
          }
          save.mutate(value);
        }}
      />
    );
  }

  if (stage === "stored") {
    return (
      <SubScreen
        title="Stored safely!"
        description="Process your worries now or revisit them later?"
        headerClassName="bg-sky/40"
      >
        <div className="animate-in fade-in zoom-in-95 soft-card rounded-3xl p-5 duration-500">
          <p className="text-xs text-muted-foreground">
            {saved ? formatLongDate(saved.created_at) : ""}
          </p>
          <p className="mt-2 whitespace-pre-wrap text-[0.95rem] leading-relaxed">
            {saved?.worry_text}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            haptic.light();
            setSaved(null);
            setStage("box");
          }}
          className="press mt-10 w-full text-center text-sm text-muted-foreground opacity-50"
        >
          I&apos;ll revisit later
        </button>
      </SubScreen>
    );
  }

  const all = worries.data ?? [];
  const active = all.filter((item) => !item.resolved_at);
  const resolved = all.filter((item) => item.resolved_at);

  return (
    <SubScreen
      title="Worry Box"
      description="There are moments we find ourselves overwhelmed by worries. Worry Box will help you when you feel overly anxious."
      headerClassName="bg-sky/40"
    >
      <div className="flex flex-col items-center">
        <WorryBoxArt className="w-44" />

        <Button
          className="press mt-8 h-12 w-full rounded-2xl"
          onClick={() => {
            haptic.select();
            setStage("write");
          }}
        >
          Write Worries
        </Button>
      </div>

      {worries.isLoading ? null : all.length === 0 ? (
        <div className="soft-card mt-8 rounded-3xl p-5 text-center">
          <p className="font-medium">Nothing in the box yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Write down what&apos;s on your mind — putting it here makes it easier to carry.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {active.length > 0 ? (
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground">Your worries</h2>
              <ul className="mt-3 space-y-3">
                {active.map((item) => (
                  <li key={item.id}>
                    <WorryRow item={item} onOpen={() => setOpenWorry(item)} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {resolved.length > 0 ? (
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground">Resolved</h2>
              <ul className="mt-3 space-y-3">
                {resolved.map((item) => (
                  <li key={item.id}>
                    <WorryRow item={item} onOpen={() => setOpenWorry(item)} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}

      <Dialog open={Boolean(openWorry)} onOpenChange={(open) => !open && setOpenWorry(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>{openWorry?.resolved_at ? "Resolved worry" : "Your worry"}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            {openWorry ? formatLongDate(openWorry.created_at) : ""}
          </p>
          <p className="max-h-[45vh] overflow-y-auto whitespace-pre-wrap text-[0.95rem] leading-relaxed">
            {openWorry?.worry_text}
          </p>
          <div className="mt-2 space-y-2">
            {openWorry && !openWorry.resolved_at ? (
              <Button
                className="press h-12 w-full rounded-2xl"
                disabled={resolve.isPending}
                onClick={() => {
                  haptic.light();
                  resolve.mutate(openWorry.id);
                }}
              >
                Mark as resolved
              </Button>
            ) : null}
            <Button
              variant="secondary"
              className="press h-12 w-full rounded-2xl text-destructive"
              onClick={() => {
                haptic.light();
                setConfirmDelete(openWorry);
              }}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(confirmDelete)}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this worry?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes it from your Worry Box. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-2xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-2xl"
              onClick={() => confirmDelete && remove.mutate(confirmDelete.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SubScreen>
  );
}

function WorryRow({ item, onOpen }: { item: WorryEntry; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={() => {
        haptic.light();
        onOpen();
      }}
      className="press soft-card w-full rounded-3xl p-4 text-left"
    >
      <p className="text-xs text-muted-foreground">{formatLongDate(item.created_at)}</p>
      <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-[0.95rem] leading-relaxed">
        {item.worry_text}
      </p>
      {item.resolved_at ? (
        <span className="mt-2 inline-flex items-center rounded-full bg-mint px-2.5 py-1 text-xs font-medium text-on-tint">
          Resolved
        </span>
      ) : null}
    </button>
  );
}

function WriteWorry({
  value,
  onChange,
  onBack,
  onDone,
  pending,
}: {
  value: string;
  onChange: (value: string) => void;
  onBack: () => void;
  onDone: () => void;
  pending: boolean;
}) {
  return (
    <div className="animate-in slide-in-from-right-6 fade-in mx-auto flex min-h-screen w-full max-w-md flex-col duration-300">
      <header className="flex items-center justify-between px-5 pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-2">
        <Button variant="ghost" className="press h-10 rounded-2xl px-3" onClick={onBack}>
          Back
        </Button>
        <Button className="press h-10 rounded-2xl px-5" disabled={pending} onClick={onDone}>
          {pending ? "Saving…" : "Done"}
        </Button>
      </header>
      <main className="flex-1 px-5 pb-24 pt-4">
        <h1 className="text-xl font-semibold tracking-tight">What am I worrying about?</h1>
        <Textarea
          autoFocus
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Let it all out…"
          className="mt-4 min-h-[45vh] rounded-3xl text-[0.95rem] leading-relaxed"
        />
      </main>
    </div>
  );
}
