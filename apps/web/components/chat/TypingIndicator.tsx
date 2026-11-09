export function TypingIndicator() {
  return (
    <div
      role="status"
      aria-label="Hengo is typing"
      className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-border bg-muted/60 px-4 py-3.5"
    >
      <span
        className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60"
        style={{ animationDelay: "0ms", animationDuration: "1s" }}
      />
      <span
        className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60"
        style={{ animationDelay: "160ms", animationDuration: "1s" }}
      />
      <span
        className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60"
        style={{ animationDelay: "320ms", animationDuration: "1s" }}
      />
    </div>
  )
}
