import { AnswerPracticeSession } from "@/components/interview/AnswerPracticeSession"

// The same answer practice with the listening preset: audio only until you
// answer, play limits by level, and a free "Reveal & compare" first.
export default function ListeningPracticePage() {
  return <AnswerPracticeSession preset="listening" />
}
