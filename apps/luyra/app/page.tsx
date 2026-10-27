import { redirect } from "next/navigation";

// Reachable only when authenticated — the proxy redirects unauthenticated
// requests for "/" straight to /login before this ever renders.
export default function Home() {
  redirect("/finance");
}
