import { AnswerPracticeSession } from "@/components/interview/AnswerPracticeSession"

// Answer practice (Listen → Answer → Review → Retry), AI check first. Opens
// straight into Today's 5; the Exam Prep home's "?start=today" link lands here.
export default function SpeakingPracticePage() {
  return <AnswerPracticeSession preset="speaking" />
}
