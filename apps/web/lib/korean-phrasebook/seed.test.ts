import { describe, expect, it } from "vitest"
import { phraseCardContentSchema } from "./schemas"
import {
  SEED_PACKS,
  planSeedUpsert,
  isSeedPlanEmpty,
  isStarterPackKey,
  seedContentKey,
  type ExistingSeedCard,
  type ExistingSeedCollection,
  type PhraseSeedCollection,
} from "./seed"

describe("seed data validity", () => {
  it("has the three starter packs: workplace, daily, and Korean for my work", () => {
    expect(SEED_PACKS.map((p) => p.sourceKey).sort()).toEqual([
      "daily-life-essentials",
      "work-communication",
      "workplace-essentials",
    ])
  })

  it("workplace pack has 10 cards, daily pack has 10 cards", () => {
    const workplace = SEED_PACKS.find((p) => p.sourceKey === "workplace-essentials")!
    const daily = SEED_PACKS.find((p) => p.sourceKey === "daily-life-essentials")!
    expect(workplace.cards).toHaveLength(10)
    expect(daily.cards).toHaveLength(10)
  })

  it("every card passes phraseCardContentSchema", () => {
    for (const pack of SEED_PACKS) {
      for (const card of pack.cards) {
        const result = phraseCardContentSchema.safeParse(card)
        expect(
          result.success,
          `${pack.sourceKey}/${card.sourceKey}: ${JSON.stringify(result.success ? null : result.error?.issues)}`,
        ).toBe(true)
      }
    }
  })

  it("every card has at least one recommended answer", () => {
    for (const pack of SEED_PACKS) {
      for (const card of pack.cards) {
        expect(card.answers.some((a) => a.isRecommended)).toBe(true)
      }
    }
  })

  it("every question/answer has non-empty romanization (no silently blank romanization)", () => {
    for (const pack of SEED_PACKS) {
      for (const card of pack.cards) {
        expect(card.question.romanization.trim().length).toBeGreaterThan(0)
        for (const answer of card.answers) {
          expect(answer.romanization.trim().length).toBeGreaterThan(0)
        }
      }
    }
  })

  it("never labels 해요체-style polite content as casual", () => {
    // Register is a closed enum of formal|polite — this is a structural
    // guarantee (there is no "casual" value to accidentally pick), verified
    // directly against the zod schema.
    for (const pack of SEED_PACKS) {
      for (const card of pack.cards) {
        expect(["formal", "polite"]).toContain(card.question.register)
        for (const answer of card.answers) {
          expect(["formal", "polite"]).toContain(answer.register)
        }
      }
    }
  })

  it("source keys are unique within and across packs", () => {
    const allKeys = SEED_PACKS.flatMap((p) => [p.sourceKey, ...p.cards.map((c) => c.sourceKey)])
    expect(new Set(allKeys).size).toBe(allKeys.length)
  })
})

describe("planSeedUpsert", () => {
  it("plans inserting every whole collection when the database is empty", () => {
    const plan = planSeedUpsert([], [])
    expect(plan.collectionsToInsert.map((c) => c.sourceKey).sort()).toEqual([
      "daily-life-essentials",
      "work-communication",
      "workplace-essentials",
    ])
    expect(plan.cardsToInsert).toHaveLength(0) // cards ship inline with a new collection insert
    expect(plan.collectionsToBumpVersion).toHaveLength(0)
  })

  it("is a no-op when everything is already seeded", () => {
    const existingCollections: ExistingSeedCollection[] = SEED_PACKS.map((p, i) => ({
      id: `col-${i}`,
      sourceKey: p.sourceKey,
      seedVersion: p.seedVersion,
    }))
    const existingCards: ExistingSeedCard[] = SEED_PACKS.flatMap((p) =>
      p.cards.map((c) => ({
        id: `card-${c.sourceKey}`,
        sourceKey: c.sourceKey,
        isUserEdited: false,
      })),
    )
    const plan = planSeedUpsert(existingCollections, existingCards)
    expect(isSeedPlanEmpty(plan)).toBe(true)
  })

  it("inserts only missing cards for an existing collection, never re-inserting existing ones", () => {
    const workplace = SEED_PACKS.find((p) => p.sourceKey === "workplace-essentials")!
    const existingCollections: ExistingSeedCollection[] = [
      { id: "col-1", sourceKey: workplace.sourceKey, seedVersion: workplace.seedVersion },
    ]
    // Only the first card of the workplace pack already exists.
    const existingCards: ExistingSeedCard[] = [
      { id: "card-1", sourceKey: workplace.cards[0].sourceKey, isUserEdited: false },
    ]
    const plan = planSeedUpsert(existingCollections, existingCards, [workplace])
    expect(plan.cardsToInsert).toHaveLength(workplace.cards.length - 1)
    expect(plan.cardsToInsert.some((c) => c.card.sourceKey === workplace.cards[0].sourceKey)).toBe(
      false,
    )
    expect(plan.collectionsToInsert).toHaveLength(0)
  })

  it("never plans inserting a card whose source key already exists, even if it was user-edited", () => {
    const workplace = SEED_PACKS.find((p) => p.sourceKey === "workplace-essentials")!
    const existingCollections: ExistingSeedCollection[] = [
      { id: "col-1", sourceKey: workplace.sourceKey, seedVersion: workplace.seedVersion },
    ]
    const existingCards: ExistingSeedCard[] = [
      { id: "card-1", sourceKey: workplace.cards[0].sourceKey, isUserEdited: true },
    ]
    const plan = planSeedUpsert(existingCollections, existingCards, [workplace])
    expect(plan.cardsToInsert.some((c) => c.card.sourceKey === workplace.cards[0].sourceKey)).toBe(
      false,
    )
  })

  it("bumps collection seed_version when the pack version increases, and inserts newly-added cards", () => {
    const workplace = SEED_PACKS.find((p) => p.sourceKey === "workplace-essentials")!
    const v2Pack: PhraseSeedCollection = {
      ...workplace,
      seedVersion: 2,
      cards: [
        ...workplace.cards,
        { ...workplace.cards[0], sourceKey: "workplace-brand-new-v2-card" },
      ],
    }
    const existingCollections: ExistingSeedCollection[] = [
      { id: "col-1", sourceKey: workplace.sourceKey, seedVersion: 1 },
    ]
    const existingCards: ExistingSeedCard[] = workplace.cards.map((c) => ({
      id: `card-${c.sourceKey}`,
      sourceKey: c.sourceKey,
      isUserEdited: false,
    }))
    const plan = planSeedUpsert(existingCollections, existingCards, [v2Pack])
    expect(plan.collectionsToBumpVersion).toEqual([{ id: "col-1", seedVersion: 2 }])
    expect(plan.cardsToInsert).toHaveLength(1)
    expect(plan.cardsToInsert[0].card.sourceKey).toBe("workplace-brand-new-v2-card")
  })

  it("does not bump version when the stored version is already current or newer", () => {
    const workplace = SEED_PACKS.find((p) => p.sourceKey === "workplace-essentials")!
    const existingCollections: ExistingSeedCollection[] = [
      { id: "col-1", sourceKey: workplace.sourceKey, seedVersion: workplace.seedVersion },
    ]
    const existingCards: ExistingSeedCard[] = workplace.cards.map((c) => ({
      id: `card-${c.sourceKey}`,
      sourceKey: c.sourceKey,
      isUserEdited: false,
    }))
    const plan = planSeedUpsert(existingCollections, existingCards, [workplace])
    expect(plan.collectionsToBumpVersion).toHaveLength(0)
  })
})

describe("content-level dedup (a card the learner already has under another key)", () => {
  const work = SEED_PACKS.find((p) => p.sourceKey === "work-communication")!

  it("skips a pack card whose question + recommended answer already exist, for a new collection", () => {
    const imported: ExistingSeedCard = {
      id: "imported-1",
      sourceKey: null,
      isUserEdited: true,
      contentKey: seedContentKey(work.cards[0]),
    }
    const plan = planSeedUpsert([], [imported], [work])
    expect(plan.collectionsToInsert).toHaveLength(1)
    const cards = plan.collectionsToInsert[0].cards
    expect(cards).toHaveLength(work.cards.length - 1)
    expect(cards.some((c) => c.sourceKey === work.cards[0].sourceKey)).toBe(false)
  })

  it("skips it for an existing collection too, and never plans an update", () => {
    const plan = planSeedUpsert(
      [{ id: "col-w", sourceKey: work.sourceKey, seedVersion: work.seedVersion }],
      [{ id: "x", sourceKey: null, isUserEdited: true, contentKey: seedContentKey(work.cards[1]) }],
      [work],
    )
    expect(plan.cardsToInsert).toHaveLength(work.cards.length - 1)
    expect(plan.cardsToInsert.some((c) => c.card.sourceKey === work.cards[1].sourceKey)).toBe(false)
  })

  it("normalizes whitespace and Unicode form when comparing content", () => {
    const card = work.cards[0]
    const spaced = {
      question: { korean: `  ${card.question.korean.replace(/ /g, "   ")} ` },
      answers: card.answers.map((a) => ({ ...a, korean: a.korean.normalize("NFD") })),
    }
    expect(seedContentKey(spaced)).toBe(seedContentKey(card))
  })

  it("seeding twice plans nothing the second time", () => {
    const first = planSeedUpsert([], [])
    const collections: ExistingSeedCollection[] = first.collectionsToInsert.map((c, i) => ({
      id: `col-${i}`,
      sourceKey: c.sourceKey,
      seedVersion: c.seedVersion,
    }))
    const cards: ExistingSeedCard[] = first.collectionsToInsert.flatMap((c) =>
      c.cards.map((card) => ({
        id: card.sourceKey,
        sourceKey: card.sourceKey,
        isUserEdited: false,
        contentKey: seedContentKey(card),
      })),
    )
    expect(isSeedPlanEmpty(planSeedUpsert(collections, cards))).toBe(true)
  })
})

describe("isStarterPackKey", () => {
  it("is true only for the curated starter packs", () => {
    expect(isStarterPackKey("work-communication")).toBe(true)
    expect(isStarterPackKey("workplace-essentials")).toBe(true)
    expect(isStarterPackKey("user-work-messages")).toBe(false)
    expect(isStarterPackKey(null)).toBe(false)
  })
})
