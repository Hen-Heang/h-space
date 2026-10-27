import Link from "next/link"
import Image from "next/image"
import type { Metadata } from "next"
import { ArrowLeft } from "lucide-react"

export const metadata: Metadata = {
  title: "Terms of Service — H-Space",
}

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))] sm:px-8">
      <div className="mb-10 flex items-center justify-between">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl shadow-sm">
            <Image
              src="/H%20Space%20Icon.png"
              alt=""
              width={36}
              height={36}
              className="h-full w-full"
            />
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
        <h1>Terms of Service</h1>
        <p className="text-muted-foreground">Last updated: 2026</p>

        <p>
          These terms govern your use of H-Space, a personal software workspace that includes the
          Hengo Learning experience and related productivity and AI-assisted features. By creating
          an account, you agree to these terms.
        </p>

        <h2>Your account</h2>
        <p>
          You&apos;re responsible for keeping your login credentials secure and for the activity
          that happens under your account. You must be able to legally enter into this agreement to
          use H-Space.
        </p>

        <h2>Using the AI features</h2>
        <p>
          H-Space&apos;s chat, analyzer, message generator, interview simulator, and related
          features send the text you submit to a third-party AI provider (OpenAI) to generate a
          response. Don&apos;t submit content that is illegal, infringes someone else&apos;s rights,
          or contains sensitive personal information you wouldn&apos;t want processed by an AI
          model. AI output may be inaccurate — treat it as a study aid, not professional, legal,
          medical, or immigration advice (including for K-Specialist exam preparation).
        </p>

        <h2>Acceptable use</h2>
        <p>
          Don&apos;t attempt to disrupt the service, reverse-engineer it, scrape it at scale, or use
          it to generate content that harasses or harms others.
        </p>

        <h2>Your content</h2>
        <p>
          You keep ownership of what you write (messages, notes, vocabulary, interview scripts). You
          grant H-Space the limited right to store and process that content in order to provide the
          service to you.
        </p>

        <h2>Service availability</h2>
        <p>
          H-Space is provided &quot;as is,&quot; without warranty of any kind. Features may change,
          and the service may be interrupted for maintenance or otherwise.
        </p>

        <h2>Changes to these terms</h2>
        <p>
          We may update these terms as the product evolves. Continued use after an update means you
          accept the revised terms.
        </p>

        <h2>Contact</h2>
        <p>Questions about these terms can be sent through your H-Space account settings.</p>
      </article>
    </main>
  )
}
