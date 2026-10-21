import Link from "next/link"
import Image from "next/image"
import type { Metadata } from "next"
import { ArrowLeft } from "lucide-react"

export const metadata: Metadata = {
  title: "Privacy Policy — H-Space",
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))] sm:px-8">
      <div className="mb-10 flex items-center justify-between">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl shadow-sm">
            <Image src="/hengo-icon.png" alt="" width={36} height={36} className="h-full w-full" />
          </span>
          <span className="text-lg font-semibold tracking-tight text-foreground">H-Space</span>
        </Link>
        <Link
          href="/login"
          className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={15} /> Back to sign in
        </Link>
      </div>

      <article className="prose prose-sm dark:prose-invert max-w-none break-words [overflow-wrap:anywhere] prose-headings:font-semibold prose-headings:tracking-tight">
        <h1>Privacy Policy</h1>
        <p className="text-muted-foreground">Last updated: 2026</p>

        <p>
          This describes what H-Space collects and how it&apos;s used. H-Space supports personal
          learning and productivity features and only collects what those features need.
        </p>

        <h2>What we collect</h2>
        <ul>
          <li>
            <strong>Account information</strong> — email address, and (if you sign in with Google)
            your Google profile name and photo.
          </li>
          <li>
            <strong>Profile details you provide</strong> — Korean level, country, native language,
            occupation, years of experience, and learning goals, used to personalize lessons and AI
            responses.
          </li>
          <li>
            <strong>Study activity</strong> — vocabulary decks and review history, chat
            conversations, corrections, interview practice sessions and scores, reading/listening
            progress, goals and tasks, and notes you write.
          </li>
          <li>
            <strong>Device information</strong> — a push-notification token if you opt in to
            notifications.
          </li>
          <li>
            <strong>Google Calendar events</strong> — if you connect Google Calendar from Settings,
            we read your event titles and times (read-only) to display them in H-Space.
          </li>
        </ul>

        <h2>How it&apos;s used</h2>
        <p>
          Your profile and activity are used to run the app&apos;s features: generating personalized
          vocabulary and lessons, streaming AI chat and feedback, tracking your streaks and
          progress, and sending reminders you&apos;ve opted into. We don&apos;t sell your data.
        </p>

        <h2>Third parties</h2>
        <ul>
          <li>
            <strong>Supabase</strong> stores your account and study data, protected by row-level
            security so only you can read your own records.
          </li>
          <li>
            <strong>OpenAI</strong> processes the text and audio you submit to AI features (chat,
            analyzer, message generator, interview simulator, listening generator, text-to-speech)
            in order to generate a response. It is not used to train H-Space&apos;s own product
            beyond that request.
          </li>
          <li>
            <strong>Google</strong> is used if you choose &quot;Sign in with Google,&quot; to verify
            your identity. If you connect Google Calendar from Settings, we request read-only access
            (<code>calendar.readonly</code>) to your calendar events so we can show them in H-Space;
            we don&apos;t modify or delete your Google Calendar data. You can disconnect this access
            at any time from Settings or from your{" "}
            <a
              href="https://myaccount.google.com/permissions"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google Account permissions
            </a>
            .
          </li>
        </ul>

        <h2>Your choices</h2>
        <p>
          You can update or delete your profile information from Settings, and disable push
          notifications at any time. To delete your account and associated data, use the account
          actions in Settings or contact us as described below.
        </p>

        <h2>Data retention</h2>
        <p>
          We keep your data for as long as your account is active. If you delete your account, your
          data is removed within a reasonable period, except where we&apos;re required to keep
          records for legal reasons.
        </p>

        <h2>Changes to this policy</h2>
        <p>
          We may update this policy as the product evolves and will reflect the current version
          here.
        </p>

        <h2>Contact</h2>
        <p>Questions about this policy can be sent through your H-Space account settings.</p>
      </article>
    </main>
  )
}
