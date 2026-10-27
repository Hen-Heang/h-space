"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CreateVocabCardInput, UpdateVocabCardInput } from "@/lib/validation/learning";
import type { VocabCard } from "@/types/learning";

export function VocabForm({
  mode,
  card,
  onSave,
  onCancel,
}: {
  mode: "create" | "edit";
  card?: VocabCard;
  onSave: (input: CreateVocabCardInput & UpdateVocabCardInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [category, setCategory] = useState(card?.category ?? "General");
  const [term, setTerm] = useState(card?.term ?? "");
  const [meaning, setMeaning] = useState(card?.meaning ?? "");
  const [pronunciation, setPronunciation] = useState(card?.pronunciation ?? "");
  const [example, setExample] = useState(card?.example ?? "");
  const [exampleTranslation, setExampleTranslation] = useState(card?.exampleTranslation ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!term.trim() || !meaning.trim()) {
      setError("Term and meaning are required.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await onSave({
        category: category.trim() || "General",
        term: term.trim(),
        meaning: meaning.trim(),
        pronunciation: pronunciation.trim() || undefined,
        example: example.trim() || undefined,
        exampleTranslation: exampleTranslation.trim() || undefined,
      });
    } catch {
      setError("Couldn't save the word. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <div className="grid grid-cols-1 gap-2 xs:grid-cols-[minmax(0,1fr)_8rem]">
        <Input placeholder="Korean term" value={term} onChange={(e) => setTerm(e.target.value)} required lang="ko" className="flex-1" autoFocus />
        <Input placeholder="Deck" value={category} onChange={(e) => setCategory(e.target.value)} className="w-full" />
      </div>
      <Input placeholder="Meaning" value={meaning} onChange={(e) => setMeaning(e.target.value)} required />
      <Input placeholder="Pronunciation (optional)" value={pronunciation} onChange={(e) => setPronunciation(e.target.value)} />
      <Input placeholder="Example sentence (optional)" value={example} onChange={(e) => setExample(e.target.value)} lang="ko" />
      <Input
        placeholder="Example translation (optional)"
        value={exampleTranslation}
        onChange={(e) => setExampleTranslation(e.target.value)}
      />
      {error && <span className="text-xs text-destructive">{error}</span>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {mode === "create" ? "Add word" : "Save"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
