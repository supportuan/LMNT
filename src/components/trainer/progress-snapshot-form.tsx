"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";

const inputCls =
  "mt-1 block w-full rounded-md border border-[var(--workspace-border)] bg-[var(--workspace-elevated)] px-3 py-2";

export function ProgressSnapshotForm({
  memberId,
  mode = "full",
}: {
  memberId: string;
  mode?: "full" | "measurements" | "photos";
}) {
  const router = useRouter();
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [chest, setChest] = useState("");
  const [waist, setWaist] = useState("");
  const [hips, setHips] = useState("");
  const [arm, setArm] = useState("");
  const [thigh, setThigh] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function onFiles(files: FileList | null) {
    if (!files) return;
    const next: string[] = [];
    for (const file of Array.from(files).slice(0, 4)) {
      if (!file.type.startsWith("image/") || file.size > 400_000) continue;
      next.push(await fileToDataUrl(file));
    }
    setPhotos(next);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const measurements: Record<string, number> = {};
    if (chest) measurements.chest = Number(chest);
    if (waist) measurements.waist = Number(waist);
    if (hips) measurements.hips = Number(hips);
    if (arm) measurements.arm = Number(arm);
    if (thigh) measurements.thigh = Number(thigh);

    const res = await fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memberId,
        weight: weight ? Number(weight) : undefined,
        bodyFat: bodyFat ? Number(bodyFat) : undefined,
        measurements: Object.keys(measurements).length ? measurements : undefined,
        photos: photos.length ? photos : undefined,
      }),
    });
    setLoading(false);
    if (res.ok) {
      setWeight("");
      setBodyFat("");
      setChest("");
      setWaist("");
      setHips("");
      setArm("");
      setThigh("");
      setPhotos([]);
      router.refresh();
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {mode !== "photos" && (
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="text-[var(--workspace-muted)]">Weight (kg)</span>
            <input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} className={`${inputCls} w-28`} />
          </label>
          <label className="text-sm">
            <span className="text-[var(--workspace-muted)]">Body fat %</span>
            <input type="number" step="0.1" value={bodyFat} onChange={(e) => setBodyFat(e.target.value)} className={`${inputCls} w-28`} />
          </label>
        </div>
      )}
      {mode !== "photos" && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <label className="text-sm">
            <span className="text-[var(--workspace-muted)]">Chest (cm)</span>
            <input type="number" step="0.1" value={chest} onChange={(e) => setChest(e.target.value)} className={inputCls} />
          </label>
          <label className="text-sm">
            <span className="text-[var(--workspace-muted)]">Waist (cm)</span>
            <input type="number" step="0.1" value={waist} onChange={(e) => setWaist(e.target.value)} className={inputCls} />
          </label>
          <label className="text-sm">
            <span className="text-[var(--workspace-muted)]">Hips (cm)</span>
            <input type="number" step="0.1" value={hips} onChange={(e) => setHips(e.target.value)} className={inputCls} />
          </label>
          <label className="text-sm">
            <span className="text-[var(--workspace-muted)]">Arm (cm)</span>
            <input type="number" step="0.1" value={arm} onChange={(e) => setArm(e.target.value)} className={inputCls} />
          </label>
          <label className="text-sm">
            <span className="text-[var(--workspace-muted)]">Thigh (cm)</span>
            <input type="number" step="0.1" value={thigh} onChange={(e) => setThigh(e.target.value)} className={inputCls} />
          </label>
        </div>
      )}
      {mode !== "measurements" && (
        <label className="block text-sm">
          <span className="text-[var(--workspace-muted)]">Progress photos</span>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => onFiles(e.target.files)}
            className="mt-1 block w-full text-xs text-[var(--workspace-muted)]"
          />
          {photos.length > 0 && (
            <span className="mt-1 block text-xs text-[var(--status-success)]">{photos.length} photo(s) ready</span>
          )}
        </label>
      )}
      <Button type="submit" size="sm" disabled={loading}>
        {loading ? "Saving…" : "Save progress"}
      </Button>
    </form>
  );
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
