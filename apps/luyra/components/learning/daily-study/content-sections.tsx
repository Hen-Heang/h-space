import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DailyStudyContent, DailyStudyExpression } from "@/types/learning";

function ExpressionRow({ item }: { item: DailyStudyExpression }) {
  return (
    <div className="border-b border-border/60 py-2 last:border-0">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-medium">{item.korean}</span>
        <span className="text-xs text-muted-foreground">{item.english}</span>
      </div>
      <p className="text-xs italic text-muted-foreground">[{item.romanization}]</p>
    </div>
  );
}

// Roleplay/spoken-practice content is shown as read-only text (model answers
// included) rather than run through a live voice coach — Korean Coach is
// deferred, so this is self-practice: read the question aloud, then compare
// with the model answer.
export function ContentSections({ content }: { content: DailyStudyContent }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Review cards</CardTitle>
        </CardHeader>
        <CardContent>
          {content.reviewCards.map((item) => (
            <ExpressionRow key={item.id} item={item} />
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Useful words</CardTitle>
        </CardHeader>
        <CardContent>
          {content.usefulWords.map((item) => (
            <ExpressionRow key={item.id} item={item} />
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Practical expressions</CardTitle>
        </CardHeader>
        <CardContent>
          {content.practicalExpressions.map((item) => (
            <ExpressionRow key={item.id} item={item} />
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Dialogue: {content.dialogue.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
          <p className="text-xs text-muted-foreground">{content.dialogue.situation}</p>
          {content.dialogue.lines.map((line, i) => (
            <p key={i} className="text-sm">
              <span className="font-medium">{line.speaker}:</span> {line.korean}{" "}
              <span className="text-xs text-muted-foreground">({line.english})</span>
            </p>
          ))}
        </CardContent>
      </Card>
      <Card className="sm:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm">Spoken practice: {content.roleplay.scenario}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            You: {content.roleplay.learnerRole} · Practice with: {content.roleplay.coachRole}
          </p>
          {content.spokenQuestions.map((q) => (
            <div key={q.id} className="rounded-md border border-border p-3">
              <p className="font-medium">{q.korean}</p>
              <p className="text-xs italic text-muted-foreground">
                [{q.romanization}] — {q.english}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Hint: {q.hint}</p>
              <p className="mt-1 text-sm text-emerald-600 dark:text-emerald-400">Model answer: {q.modelAnswer}</p>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card className="sm:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm">Real-world mission</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{content.realWorldMission}</p>
        </CardContent>
      </Card>
    </div>
  );
}
