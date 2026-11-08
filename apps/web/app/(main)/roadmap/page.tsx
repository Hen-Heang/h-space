"use client"

import { useState, useSyncExternalStore } from "react"
import { motion, AnimatePresence } from "motion/react"
import {
  BookOpen,
  BrainCircuit,
  Check,
  ChevronDown,
  ChevronRight,
  Database,
  Flame,
  Layers,
  Lock,
  Pencil,
  Plus,
  Rocket,
  RotateCcw,
  Server,
  Settings2,
  Sparkles,
  Target,
  Trash2,
  Trophy,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { AnimatedCircularProgressBar } from "@/components/ui/animated-circular-progress-bar"
import { BorderBeam } from "@/components/ui/border-beam"
import { Skeleton } from "@/components/ui/skeleton"

type Topic = { id: string; text: string }
type Phase = {
  id: string
  number: number
  title: string
  subtitle: string
  months: string
  level: string
  levelColor: string
  iconName: string
  color: string
  accent: string
  topics: Topic[]
  project: string
  exitTest: string
}

const ICON_MAP: Record<string, React.ElementType> = {
  BookOpen,
  BrainCircuit,
  Database,
  Flame,
  Layers,
  Lock,
  Rocket,
  Server,
  Settings2,
  Sparkles,
  Target,
  Trophy,
}

const NEW_PHASE_STYLES = [
  {
    iconName: "BrainCircuit",
    color: "from-pink-500/20 to-pink-500/5",
    accent: "border-pink-500/30",
    levelColor: "text-pink-500 bg-pink-500/10",
  },
  {
    iconName: "Sparkles",
    color: "from-teal-500/20 to-teal-500/5",
    accent: "border-teal-500/30",
    levelColor: "text-teal-500 bg-teal-500/10",
  },
  {
    iconName: "Target",
    color: "from-indigo-500/20 to-indigo-500/5",
    accent: "border-indigo-500/30",
    levelColor: "text-indigo-500 bg-indigo-500/10",
  },
  {
    iconName: "Flame",
    color: "from-rose-500/20 to-rose-500/5",
    accent: "border-rose-500/30",
    levelColor: "text-rose-500 bg-rose-500/10",
  },
]

const DEFAULT_PHASES: Phase[] = [
  {
    id: "phase-1",
    number: 1,
    title: "Java Foundations",
    subtitle: "JVM, OOP, Memory, Exceptions",
    months: "Months 1–3",
    level: "Beginner",
    levelColor: "text-emerald-500 bg-emerald-500/10",
    iconName: "BookOpen",
    color: "from-emerald-500/20 to-emerald-500/5",
    accent: "border-emerald-500/30",
    topics: [
      { id: "p1-t1", text: "JDK vs JRE vs JVM — what they are and why" },
      { id: "p1-t2", text: "Stack vs Heap — trace any code by hand" },
      { id: "p1-t3", text: "Garbage Collection — generational GC, G1GC, ZGC" },
      { id: "p1-t4", text: "Primitive types — all 8, sizes, when to use each" },
      { id: "p1-t5", text: "BigDecimal for money — NEVER use double or float" },
      { id: "p1-t6", text: "String immutability and String pool" },
      { id: "p1-t7", text: "Pass-by-value — for primitives AND references" },
      { id: "p1-t8", text: "Encapsulation — private fields, controlled access" },
      { id: "p1-t9", text: "Inheritance — when to use, when composition is better" },
      { id: "p1-t10", text: "Polymorphism — method overriding, dynamic dispatch" },
      { id: "p1-t11", text: "Abstraction — interfaces vs abstract classes" },
      { id: "p1-t12", text: "Checked vs unchecked exceptions" },
      { id: "p1-t13", text: "Try-with-resources — always for connections" },
      { id: "p1-t14", text: "Custom exceptions — hierarchy for your domain" },
    ],
    project: "Banking domain model: Account, Transaction, TransactionHistory with JUnit 5 tests",
    exitTest: "5 OOP questions + design Account/Transaction classes on paper without notes",
  },
  {
    id: "phase-2",
    number: 2,
    title: "Java Advanced",
    subtitle: "Collections, Streams, Concurrency",
    months: "Months 3–5",
    level: "Junior",
    levelColor: "text-blue-500 bg-blue-500/10",
    iconName: "Layers",
    color: "from-blue-500/20 to-blue-500/5",
    accent: "border-blue-500/30",
    topics: [
      { id: "p2-t1", text: "ArrayList vs LinkedList — time complexity, when to choose" },
      { id: "p2-t2", text: "HashMap internals — hashing, buckets, collisions" },
      { id: "p2-t3", text: "equals() + hashCode() contract — must override both or neither" },
      { id: "p2-t4", text: "TreeMap, LinkedHashMap — ordering strategies" },
      { id: "p2-t5", text: "ConcurrentHashMap — thread-safe operations" },
      { id: "p2-t6", text: "Generics — bounded types, type erasure" },
      { id: "p2-t7", text: "Streams API — filter, map, flatMap, collect, groupingBy" },
      { id: "p2-t8", text: "Lambda expressions and method references" },
      { id: "p2-t9", text: "Functional interfaces — Predicate, Function, Consumer, Supplier" },
      { id: "p2-t10", text: "Optional — avoid NPE with explicit missing-value type" },
      { id: "p2-t11", text: "Race conditions — banking example, synchronized" },
      { id: "p2-t12", text: "AtomicInteger / AtomicLong — lock-free counters" },
      { id: "p2-t13", text: "CompletableFuture — async composition" },
      { id: "p2-t14", text: "Virtual Threads (Java 21) — lightweight concurrency" },
    ],
    project:
      "Extend bank model: Streams reporting, parallel processing, thread-safe transfer simulation",
    exitTest: "Explain HashMap internals + 3 collection-choice scenarios without notes",
  },
  {
    id: "phase-3",
    number: 3,
    title: "SQL & Database",
    subtitle: "Indexes, Transactions, PL/SQL",
    months: "Months 5–7",
    level: "Junior",
    levelColor: "text-blue-500 bg-blue-500/10",
    iconName: "Database",
    color: "from-sky-500/20 to-sky-500/5",
    accent: "border-sky-500/30",
    topics: [
      { id: "p3-t1", text: "B-tree indexes — when they help, when they hurt" },
      { id: "p3-t2", text: "ACID — Atomicity, Consistency, Isolation, Durability" },
      { id: "p3-t3", text: "All 4 isolation levels — dirty read, non-repeatable, phantom" },
      { id: "p3-t4", text: "Locking — shared vs exclusive, SELECT FOR UPDATE" },
      { id: "p3-t5", text: "Deadlocks — how they happen, how to prevent them" },
      { id: "p3-t6", text: "INNER / LEFT / FULL OUTER JOIN" },
      { id: "p3-t7", text: "GROUP BY, HAVING, subqueries" },
      { id: "p3-t8", text: "Window functions — ROW_NUMBER, SUM OVER PARTITION BY" },
      { id: "p3-t9", text: "CTEs — readable multi-step queries" },
      { id: "p3-t10", text: "EXPLAIN ANALYZE — read execution plans, find missing indexes" },
      { id: "p3-t11", text: "Normalization (1NF–3NF) and when to denormalize" },
      { id: "p3-t12", text: "Oracle PL/SQL — stored procedures, packages (primary target!)" },
      { id: "p3-t13", text: "Oracle cursors, exceptions, %ROWTYPE" },
      { id: "p3-t14", text: "HikariCP connection pool — sizing, timeout config" },
    ],
    project:
      "Banking schema + 10 SQL queries + 1 PL/SQL transfer procedure + EXPLAIN ANALYZE each query",
    exitTest: "Design banking schema + write transfer procedure + explain isolation level choice",
  },
  {
    id: "phase-4",
    number: 4,
    title: "Spring Core & Boot",
    subtitle: "IoC, DI, REST, AOP",
    months: "Months 7–10",
    level: "Junior → Mid",
    levelColor: "text-violet-500 bg-violet-500/10",
    iconName: "Server",
    color: "from-violet-500/20 to-violet-500/5",
    accent: "border-violet-500/30",
    topics: [
      { id: "p4-t1", text: "IoC container — ApplicationContext, BeanDefinition" },
      { id: "p4-t2", text: "Dependency Injection — constructor (preferred), field, setter" },
      { id: "p4-t3", text: "Bean scopes — singleton, prototype, request, session" },
      { id: "p4-t4", text: "Bean lifecycle — @PostConstruct, @PreDestroy" },
      { id: "p4-t5", text: "Spring Boot auto-configuration — how @ConditionalOn* works" },
      { id: "p4-t6", text: "Profiles — dev/prod/test configuration separation" },
      { id: "p4-t7", text: "@ConfigurationProperties — type-safe config binding" },
      { id: "p4-t8", text: "@Transactional — proxy mechanism, propagation levels" },
      { id: "p4-t9", text: "Self-invocation bug — why and 2 ways to fix it" },
      { id: "p4-t10", text: "REST controller — @GetMapping, @PostMapping, @PathVariable" },
      { id: "p4-t11", text: "@Valid — Bean Validation + custom validators" },
      { id: "p4-t12", text: "@RestControllerAdvice — global exception handler" },
      { id: "p4-t13", text: "HTTP status codes — correct code for each error case" },
      { id: "p4-t14", text: "AOP — @Around, how @Transactional uses it" },
      { id: "p4-t15", text: "Idempotency — Idempotency-Key header for payment APIs" },
    ],
    project:
      "Full banking REST API: CRUD, validation, exception handler, idempotency, MockMvc tests",
    exitTest: "7 Spring questions mixing IoC + @Transactional + REST + idempotency",
  },
  {
    id: "phase-5",
    number: 5,
    title: "Spring Data JPA + Security",
    subtitle: "JPA, JWT, Caching, Async",
    months: "Months 10–14",
    level: "Mid",
    levelColor: "text-amber-500 bg-amber-500/10",
    iconName: "Lock",
    color: "from-amber-500/20 to-amber-500/5",
    accent: "border-amber-500/30",
    topics: [
      { id: "p5-t1", text: "Entity mapping — @Entity, @Column, @ManyToOne, @OneToMany" },
      { id: "p5-t2", text: "Spring Data repositories — findBy*, @Query, native SQL" },
      { id: "p5-t3", text: "N+1 problem — identify it, fix with JOIN FETCH or EntityGraph" },
      { id: "p5-t4", text: "Projections — return less data for performance" },
      { id: "p5-t5", text: "LAZY vs EAGER loading — defaults and pitfalls" },
      { id: "p5-t6", text: "Optimistic locking — @Version, OptimisticLockException" },
      { id: "p5-t7", text: "Pessimistic locking — @Lock, SELECT FOR UPDATE" },
      { id: "p5-t8", text: "@Transactional propagation — REQUIRED vs REQUIRES_NEW" },
      { id: "p5-t9", text: "JWT — structure, signing, validation, stateless auth" },
      { id: "p5-t10", text: "JwtFilter + SecurityFilterChain — complete implementation" },
      { id: "p5-t11", text: "@PreAuthorize — method-level security" },
      { id: "p5-t12", text: "CORS + CSRF — when each applies to REST APIs" },
      { id: "p5-t13", text: "Top 5 security mistakes — IDOR, SQL injection, logging passwords" },
      { id: "p5-t14", text: "Redis caching — @Cacheable, @CacheEvict, TTL" },
      { id: "p5-t15", text: "@Async + @Scheduled — notifications, daily jobs" },
    ],
    project: "Add JWT auth, Redis caching, and Testcontainers integration tests to Phase 4 API",
    exitTest: "N+1 quiz + JWT flow from memory + top security mistakes",
  },
  {
    id: "phase-6",
    number: 6,
    title: "Advanced Spring",
    subtitle: "Kafka, Docker, Testing, Monitoring",
    months: "Months 14–17",
    level: "Mid → Senior",
    levelColor: "text-orange-500 bg-orange-500/10",
    iconName: "Settings2",
    color: "from-orange-500/20 to-orange-500/5",
    accent: "border-orange-500/30",
    topics: [
      { id: "p6-t1", text: "Kafka — topics, partitions, consumer groups, offsets" },
      { id: "p6-t2", text: "Kafka producer — KafkaTemplate, key ordering, acks" },
      { id: "p6-t3", text: "Kafka consumer — @KafkaListener, idempotency, DLT" },
      { id: "p6-t4", text: "Transactional Outbox Pattern — guaranteed delivery" },
      { id: "p6-t5", text: "Docker — multi-stage Dockerfile for Spring Boot" },
      { id: "p6-t6", text: "docker-compose — PostgreSQL + Redis + Kafka + app" },
      { id: "p6-t7", text: "Testing pyramid — 70% unit / 20% integration / 10% E2E" },
      { id: "p6-t8", text: "Mockito — @Mock, @InjectMocks, verify(), ArgumentCaptor" },
      { id: "p6-t9", text: "@WebMvcTest — controller tests with MockMvc" },
      { id: "p6-t10", text: "@SpringBootTest — full integration tests" },
      { id: "p6-t11", text: "Testcontainers — real PostgreSQL in tests" },
      { id: "p6-t12", text: "Spring Actuator — /health, /metrics, /prometheus" },
      { id: "p6-t13", text: "Micrometer — custom Counter, Timer, Gauge metrics" },
      { id: "p6-t14", text: "Prometheus + Grafana — scrape metrics, build dashboards" },
      { id: "p6-t15", text: "Structured logging — SLF4J best practices, what NOT to log" },
    ],
    project: "Add Kafka event publishing, Docker Compose, Testcontainers, and Grafana dashboard",
    exitTest:
      "Kafka consumer idempotency quiz + draw the Outbox Pattern + testing pyramid question",
  },
  {
    id: "phase-7",
    number: 7,
    title: "System Design",
    subtitle: "Scale, Resilience, Architecture",
    months: "Months 17–24",
    level: "Senior",
    levelColor: "text-red-500 bg-red-500/10",
    iconName: "Rocket",
    color: "from-red-500/20 to-red-500/5",
    accent: "border-red-500/30",
    topics: [
      { id: "p7-t1", text: "CAP theorem — CP vs AP with concrete banking examples" },
      { id: "p7-t2", text: "Design a payment/transfer system end to end" },
      { id: "p7-t3", text: "Double-entry ledger — SUM(DEBIT) = SUM(CREDIT) always" },
      { id: "p7-t4", text: "Idempotency end-to-end — Idempotency-Key → DB unique constraint" },
      { id: "p7-t5", text: "Read replicas — replication lag, routing strategy" },
      { id: "p7-t6", text: "Database sharding — consistent hashing, cross-shard problems" },
      { id: "p7-t7", text: "Caching strategies — Cache-Aside, Write-Through, Write-Behind" },
      { id: "p7-t8", text: "Cache stampede — probabilistic early expiry fix" },
      { id: "p7-t9", text: "Rate limiting — token bucket algorithm, Redis implementation" },
      { id: "p7-t10", text: "Saga pattern — choreography vs orchestration" },
      { id: "p7-t11", text: "Circuit Breaker — Resilience4j, CLOSED/OPEN/HALF-OPEN states" },
      { id: "p7-t12", text: "Bakong KHQR flow — NBC payment system, QR to ledger" },
      { id: "p7-t13", text: "FLEXCUBE integration — Oracle core banking patterns" },
      { id: "p7-t14", text: "CI/CD — GitHub Actions: test → build → Docker → deploy" },
      { id: "p7-t15", text: "OpenTelemetry — distributed tracing across services" },
    ],
    project:
      "Capstone: KHQR Payment Service — QR flow, double-entry ledger, Kafka, Redis, CI/CD, deployed",
    exitTest:
      "Design KHQR bank-to-bank transfer on whiteboard. Handle: timeout, double-scan, partial failure.",
  },
]

const COMPLETED_KEY = "roadmap_completed_topics"
const PHASES_KEY = "roadmap_phases"

function loadCompleted(): Set<string> {
  if (typeof window === "undefined") return new Set()
  try {
    const raw = localStorage.getItem(COMPLETED_KEY)
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch {
    return new Set()
  }
}

function saveCompleted(set: Set<string>) {
  try {
    localStorage.setItem(COMPLETED_KEY, JSON.stringify(Array.from(set)))
  } catch {}
}

function loadPhases(): Phase[] {
  if (typeof window === "undefined") return DEFAULT_PHASES
  try {
    const raw = localStorage.getItem(PHASES_KEY)
    return raw ? (JSON.parse(raw) as Phase[]) : DEFAULT_PHASES
  } catch {
    return DEFAULT_PHASES
  }
}

function savePhases(phases: Phase[]) {
  try {
    localStorage.setItem(PHASES_KEY, JSON.stringify(phases))
  } catch {}
}

function PhaseCard({
  phase,
  completed,
  onToggle,
  isOpen,
  isCurrent,
  onToggleOpen,
  onAddTopic,
  onEditTopic,
  onDeleteTopic,
  onEditPhase,
  onDeletePhase,
}: {
  phase: Phase
  completed: Set<string>
  onToggle: (id: string) => void
  isOpen: boolean
  isCurrent: boolean
  onToggleOpen: () => void
  onAddTopic: (phaseId: string, text: string) => void
  onEditTopic: (phaseId: string, topicId: string, text: string) => void
  onDeleteTopic: (phaseId: string, topicId: string) => void
  onEditPhase: (phaseId: string, updates: Partial<Phase>) => void
  onDeletePhase: (phaseId: string) => void
}) {
  const Icon = ICON_MAP[phase.iconName] ?? BookOpen
  const done = phase.topics.filter((t) => completed.has(t.id)).length
  const total = phase.topics.length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  const isComplete = total > 0 && done === total

  const [editingTopicId, setEditingTopicId] = useState<string | null>(null)
  const [editTopicText, setEditTopicText] = useState("")
  const [addingTopic, setAddingTopic] = useState(false)
  const [newTopicText, setNewTopicText] = useState("")
  const [editingPhase, setEditingPhase] = useState(false)
  const [editPhaseData, setEditPhaseData] = useState({
    title: phase.title,
    subtitle: phase.subtitle,
    months: phase.months,
    level: phase.level,
  })
  const [confirmDeleteTopic, setConfirmDeleteTopic] = useState<string | null>(null)
  const [confirmDeletePhase, setConfirmDeletePhase] = useState(false)

  function commitEditTopic(topicId: string) {
    if (editTopicText.trim()) onEditTopic(phase.id, topicId, editTopicText.trim())
    setEditingTopicId(null)
  }

  function commitAddTopic() {
    if (newTopicText.trim()) onAddTopic(phase.id, newTopicText.trim())
    setNewTopicText("")
    setAddingTopic(false)
  }

  function commitEditPhase() {
    onEditPhase(phase.id, {
      title: editPhaseData.title.trim() || phase.title,
      subtitle: editPhaseData.subtitle.trim(),
      months: editPhaseData.months.trim(),
      level: editPhaseData.level.trim(),
    })
    setEditingPhase(false)
  }

  function startEditingPhase() {
    setEditPhaseData({
      title: phase.title,
      subtitle: phase.subtitle,
      months: phase.months,
      level: phase.level,
    })
    setConfirmDeletePhase(false)
    setEditingPhase(true)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={cn(
        "relative overflow-hidden rounded-3xl border bg-card shadow-sm dark:bg-slate-900/40",
        isComplete ? "border-emerald-500/30" : isCurrent ? "border-blue-500/35" : "border-border",
      )}
    >
      {isCurrent && !isComplete ? (
        <BorderBeam size={72} duration={7} colorFrom="#3b82f6" colorTo="#8b5cf6" />
      ) : null}
      <button
        type="button"
        onClick={onToggleOpen}
        className="flex w-full items-center gap-4 px-5 py-5 text-left transition-colors hover:bg-accent/40 active:scale-[0.995] sm:px-6"
      >
        <div
          className={cn(
            "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br",
            phase.color,
          )}
        >
          <Icon size={20} className="text-foreground/70" />
          {isComplete && (
            <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500">
              <Check size={11} strokeWidth={3} className="text-white" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">
              Phase {phase.number}
            </span>
            <span
              className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", phase.levelColor)}
            >
              {phase.level}
            </span>
            <span className="text-xs font-medium text-muted-foreground">{phase.months}</span>
            {isCurrent && !isComplete ? (
              <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
                Current
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-sm font-bold text-foreground">{phase.title}</p>
          <p className="text-xs font-medium text-muted-foreground">{phase.subtitle}</p>
        </div>
        <AnimatedCircularProgressBar
          value={pct}
          gaugePrimaryColor={isComplete ? "#10b981" : "var(--primary)"}
          gaugeSecondaryColor="var(--muted)"
          label={`Progress for ${phase.title}`}
          className="size-12 shrink-0 font-mono text-xs"
        />
        <ChevronDown
          size={16}
          className={cn(
            "shrink-0 text-muted-foreground transition-transform",
            isOpen && "rotate-180",
          )}
        />
      </button>

      <div className="mx-5 mb-1 h-1 overflow-hidden rounded-full bg-foreground/5 sm:mx-6">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className={cn("h-full rounded-full", isComplete ? "bg-emerald-500" : "bg-blue-500")}
        />
      </div>
      <p className="px-5 pb-4 text-xs font-medium text-muted-foreground sm:px-6">
        {done} / {total} topics completed
      </p>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div
              className={cn(
                "mx-5 mb-4 rounded-2xl border px-4 py-4 sm:mx-6",
                phase.accent,
                "bg-accent/5",
              )}
            >
              {editingPhase ? (
                <div className="mb-4 space-y-2 rounded-xl bg-accent/30 p-3">
                  <input
                    value={editPhaseData.title}
                    onChange={(e) => setEditPhaseData((d) => ({ ...d, title: e.target.value }))}
                    placeholder="Phase title"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                  <input
                    value={editPhaseData.subtitle}
                    onChange={(e) => setEditPhaseData((d) => ({ ...d, subtitle: e.target.value }))}
                    placeholder="Subtitle"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                  <div className="flex gap-2">
                    <input
                      value={editPhaseData.months}
                      onChange={(e) => setEditPhaseData((d) => ({ ...d, months: e.target.value }))}
                      placeholder="Timeframe"
                      className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                    <input
                      value={editPhaseData.level}
                      onChange={(e) => setEditPhaseData((d) => ({ ...d, level: e.target.value }))}
                      placeholder="Level"
                      className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={commitEditPhase}
                      className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-500 active:scale-95"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPhase(false)
                        setConfirmDeletePhase(false)
                      }}
                      className="rounded-lg border border-border px-4 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground active:scale-95"
                    >
                      Cancel
                    </button>
                    {confirmDeletePhase ? (
                      <>
                        <span className="ml-auto text-xs font-medium text-red-500">
                          Delete this phase?
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            onDeletePhase(phase.id)
                            setConfirmDeletePhase(false)
                          }}
                          className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-600 active:scale-95"
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeletePhase(false)}
                          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground active:scale-95"
                        >
                          No
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeletePhase(true)}
                        className="ml-auto flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-500/10 active:scale-95"
                      >
                        <Trash2 size={12} />
                        Delete Phase
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mb-3 flex justify-end">
                  <button
                    type="button"
                    onClick={startEditingPhase}
                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:scale-95"
                  >
                    <Pencil size={11} />
                    Edit Phase
                  </button>
                </div>
              )}

              <div className="space-y-1.5">
                {phase.topics.map((topic) => {
                  const isDone = completed.has(topic.id)
                  const isEditing = editingTopicId === topic.id
                  const isConfirm = confirmDeleteTopic === topic.id

                  if (isEditing)
                    return (
                      <div
                        key={topic.id}
                        className="flex items-center gap-2 rounded-xl bg-accent/30 px-2 py-1.5"
                      >
                        <input
                          autoFocus
                          value={editTopicText}
                          onChange={(e) => setEditTopicText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitEditTopic(topic.id)
                            if (e.key === "Escape") setEditingTopicId(null)
                          }}
                          className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
                        />
                        <button
                          type="button"
                          onClick={() => commitEditTopic(topic.id)}
                          className="rounded-lg bg-blue-600 p-1.5 text-white hover:bg-blue-500 active:scale-95"
                        >
                          <Check size={12} strokeWidth={3} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingTopicId(null)}
                          className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-foreground active:scale-95"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )

                  if (isConfirm)
                    return (
                      <div
                        key={topic.id}
                        className="flex items-center gap-2 rounded-xl bg-red-500/5 px-2 py-1.5"
                      >
                        <span className="flex-1 text-xs text-red-500">Delete this topic?</span>
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteTopic(phase.id, topic.id)
                            setConfirmDeleteTopic(null)
                          }}
                          className="rounded-lg bg-red-500 px-3 py-1 text-xs font-bold text-white hover:bg-red-600 active:scale-95"
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteTopic(null)}
                          className="rounded-lg border border-border px-3 py-1 text-xs font-medium text-muted-foreground active:scale-95"
                        >
                          No
                        </button>
                      </div>
                    )

                  return (
                    <div
                      key={topic.id}
                      className="flex w-full items-start gap-2 rounded-xl px-1 py-1 transition-colors hover:bg-accent/20"
                    >
                      {/* A real checkbox to assistive tech (name + checked state),
                          20px to look at with a 40px tap area. */}
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={isDone}
                        aria-label={topic.text}
                        onClick={() => onToggle(topic.id)}
                        className={cn(
                          "relative mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all after:absolute after:-inset-2.5 after:content-[''] active:scale-95",
                          isDone
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : "border-border text-transparent hover:border-primary/50",
                        )}
                      >
                        <Check size={11} strokeWidth={3} />
                      </button>
                      <span
                        className={cn(
                          "flex-1 text-sm font-medium leading-snug",
                          isDone ? "text-muted-foreground line-through" : "text-foreground",
                        )}
                      >
                        {topic.text}
                      </span>
                      <div className="flex shrink-0 items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTopicId(topic.id)
                            setEditTopicText(topic.text)
                          }}
                          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:scale-95 [@media(pointer:coarse)]:p-3"
                          title="Edit"
                          aria-label={`Edit "${topic.text}"`}
                        >
                          <Pencil size={11} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteTopic(topic.id)}
                          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500 active:scale-95 [@media(pointer:coarse)]:p-3"
                          title="Delete"
                          aria-label={`Delete "${topic.text}"`}
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  )
                })}

                {addingTopic ? (
                  <div className="flex items-center gap-2 rounded-xl bg-accent/30 px-2 py-1.5">
                    <input
                      autoFocus
                      value={newTopicText}
                      onChange={(e) => setNewTopicText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitAddTopic()
                        if (e.key === "Escape") {
                          setAddingTopic(false)
                          setNewTopicText("")
                        }
                      }}
                      placeholder="New topic…"
                      className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                    <button
                      type="button"
                      onClick={commitAddTopic}
                      className="rounded-lg bg-blue-600 p-1.5 text-white hover:bg-blue-500 active:scale-95"
                    >
                      <Check size={12} strokeWidth={3} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAddingTopic(false)
                        setNewTopicText("")
                      }}
                      className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-foreground active:scale-95"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAddingTopic(true)}
                    className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-accent/30 hover:text-muted-foreground active:scale-95"
                  >
                    <Plus size={12} />
                    Add topic
                  </button>
                )}
              </div>

              {(phase.project || phase.exitTest) && (
                <div className="mt-4 space-y-2 border-t border-border/60 pt-4">
                  {phase.project && (
                    <div className="flex gap-2">
                      <Sparkles size={14} className="mt-0.5 shrink-0 text-violet-500" />
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Mini Project
                        </p>
                        <p className="text-xs font-medium text-foreground/70">{phase.project}</p>
                      </div>
                    </div>
                  )}
                  {phase.exitTest && (
                    <div className="flex gap-2">
                      <Target size={14} className="mt-0.5 shrink-0 text-orange-500" />
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Exit Test
                        </p>
                        <p className="text-xs font-medium text-foreground/70">{phase.exitTest}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function AddPhaseForm({
  onAdd,
  onCancel,
}: {
  onAdd: (title: string, subtitle: string, months: string, level: string) => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState("")
  const [subtitle, setSubtitle] = useState("")
  const [months, setMonths] = useState("")
  const [level, setLevel] = useState("")

  return (
    <div className="rounded-3xl border border-dashed border-blue-500/40 bg-blue-500/5 p-5 space-y-3">
      <p className="text-xs font-bold uppercase tracking-wider text-blue-500/70">New Phase</p>
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Phase title *"
        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/30"
      />
      <input
        value={subtitle}
        onChange={(e) => setSubtitle(e.target.value)}
        placeholder="Subtitle"
        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
      />
      <div className="flex gap-2">
        <input
          value={months}
          onChange={(e) => setMonths(e.target.value)}
          placeholder="Timeframe"
          className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
        />
        <input
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          placeholder="Level"
          className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={!title.trim()}
          onClick={() => onAdd(title.trim(), subtitle.trim(), months.trim(), level.trim())}
          className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white hover:bg-blue-500 disabled:opacity-40 active:scale-95"
        >
          Add Phase
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-border px-5 py-2 text-sm font-medium text-muted-foreground hover:text-foreground active:scale-95"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

function RoadmapSkeleton() {
  return (
    <div className="space-y-6 pb-16">
      <div className="space-y-2">
        <Skeleton className="h-4 w-40 rounded-full" />
        <Skeleton className="h-3 w-56 rounded-full" />
      </div>

      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm dark:bg-slate-900/40">
        <div className="p-5 sm:p-6">
          <div className="flex items-center gap-5">
            <Skeleton className="h-[72px] w-[72px] shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-32 rounded-full" />
              <Skeleton className="h-3 w-44 rounded-full" />
              <Skeleton className="h-3 w-52 rounded-full" />
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-1.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-14 rounded-xl" />
            ))}
          </div>
        </div>
        <Skeleton className="h-1.5 w-full rounded-none" />
      </div>

      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-3xl border border-border bg-card p-5 shadow-sm dark:bg-slate-900/40"
          >
            <div className="flex items-center gap-4">
              <Skeleton className="h-11 w-11 shrink-0 rounded-2xl" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3 rounded-full" />
                <Skeleton className="h-3 w-1/2 rounded-full" />
              </div>
              <Skeleton className="h-5 w-5 shrink-0 rounded-full" />
            </div>
            <Skeleton className="mt-4 h-1.5 w-full rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function RoadmapPage() {
  const [phases, setPhases] = useState<Phase[]>(loadPhases)
  const [completed, setCompleted] = useState<Set<string>>(loadCompleted)
  const [openPhase, setOpenPhase] = useState<string | null>("phase-1")
  const [showAddPhase, setShowAddPhase] = useState(false)
  const [resetConfirm, setResetConfirm] = useState(false)

  const mounted = useSyncExternalStore(
    (callback) => {
      queueMicrotask(callback)
      return () => undefined
    },
    () => true,
    () => false,
  )

  function toggle(id: string) {
    setCompleted((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      saveCompleted(next)
      return next
    })
  }

  function handleAddTopic(phaseId: string, text: string) {
    setPhases((prev) => {
      const next = prev.map((p) =>
        p.id !== phaseId
          ? p
          : {
              ...p,
              topics: [...p.topics, { id: `${phaseId}-t${Date.now()}`, text }],
            },
      )
      savePhases(next)
      return next
    })
  }

  function handleEditTopic(phaseId: string, topicId: string, text: string) {
    setPhases((prev) => {
      const next = prev.map((p) =>
        p.id !== phaseId
          ? p
          : {
              ...p,
              topics: p.topics.map((t) => (t.id === topicId ? { ...t, text } : t)),
            },
      )
      savePhases(next)
      return next
    })
  }

  function handleDeleteTopic(phaseId: string, topicId: string) {
    setPhases((prev) => {
      const next = prev.map((p) =>
        p.id !== phaseId
          ? p
          : {
              ...p,
              topics: p.topics.filter((t) => t.id !== topicId),
            },
      )
      savePhases(next)
      return next
    })
    setCompleted((prev) => {
      const next = new Set(prev)
      next.delete(topicId)
      saveCompleted(next)
      return next
    })
  }

  function handleEditPhase(phaseId: string, updates: Partial<Phase>) {
    setPhases((prev) => {
      const next = prev.map((p) => (p.id === phaseId ? { ...p, ...updates } : p))
      savePhases(next)
      return next
    })
  }

  function handleDeletePhase(phaseId: string) {
    const phase = phases.find((p) => p.id === phaseId)
    setPhases((prev) => {
      const next = prev.filter((p) => p.id !== phaseId).map((p, i) => ({ ...p, number: i + 1 }))
      savePhases(next)
      return next
    })
    if (phase) {
      setCompleted((prev) => {
        const next = new Set(prev)
        phase.topics.forEach((t) => next.delete(t.id))
        saveCompleted(next)
        return next
      })
    }
    if (openPhase === phaseId) setOpenPhase(null)
  }

  function handleAddPhase(title: string, subtitle: string, months: string, level: string) {
    const style = NEW_PHASE_STYLES[phases.length % NEW_PHASE_STYLES.length]
    const newPhase: Phase = {
      id: `phase-custom-${Date.now()}`,
      number: phases.length + 1,
      title,
      subtitle,
      months: months || `Month ${phases.length * 3 + 1}+`,
      level: level || "Custom",
      levelColor: style.levelColor,
      iconName: style.iconName,
      color: style.color,
      accent: style.accent,
      topics: [],
      project: "",
      exitTest: "",
    }
    setPhases((prev) => {
      const next = [...prev, newPhase]
      savePhases(next)
      return next
    })
    setOpenPhase(newPhase.id)
    setShowAddPhase(false)
  }

  function handleReset() {
    savePhases(DEFAULT_PHASES)
    setPhases(DEFAULT_PHASES)
    setResetConfirm(false)
  }

  const totalTopics = phases.reduce((s, p) => s + p.topics.length, 0)
  const totalDone = phases.reduce(
    (s, p) => s + p.topics.filter((t) => completed.has(t.id)).length,
    0,
  )
  const overallPct = totalTopics > 0 ? Math.round((totalDone / totalTopics) * 100) : 0

  const currentPhaseIndex = (() => {
    for (let i = phases.length - 1; i >= 0; i--) {
      if (phases[i].topics.some((t) => completed.has(t.id))) return i
    }
    return 0
  })()
  const currentPhase = phases[currentPhaseIndex]

  if (!mounted) return <RoadmapSkeleton />

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 pb-16"
    >
      <div>
        <h1 className="text-lg font-bold text-foreground">Learning Roadmap</h1>
        <p className="text-xs font-medium text-muted-foreground">
          Java → Spring Boot → Senior Backend Engineer
        </p>
      </div>

      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm dark:bg-slate-900/40">
        <div className="p-5 sm:p-6">
          <div className="flex items-center gap-5">
            <AnimatedCircularProgressBar
              value={overallPct}
              gaugePrimaryColor="var(--primary)"
              gaugeSecondaryColor="var(--muted)"
              label="Overall roadmap progress"
              className="size-[72px] shrink-0 font-mono text-sm"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-foreground">Overall Progress</p>
              <p className="text-xs font-medium text-muted-foreground">
                {totalDone} of {totalTopics} topics complete
              </p>
              {currentPhase && (
                <div className="mt-3 flex items-center gap-2">
                  <Flame size={13} className="text-orange-500" />
                  <span className="text-xs font-semibold text-muted-foreground">
                    Currently on:{" "}
                    <span className="text-foreground">
                      Phase {currentPhase.number} — {currentPhase.title}
                    </span>
                  </span>
                </div>
              )}
            </div>
            <Trophy
              size={28}
              className={cn(
                "shrink-0 transition-colors",
                overallPct === 100 ? "text-amber-500" : "text-muted-foreground",
              )}
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-1.5">
            {phases.map((phase) => {
              const pDone = phase.topics.filter((t) => completed.has(t.id)).length
              const pTotal = phase.topics.length
              const complete = pTotal > 0 && pDone === pTotal
              const started = pDone > 0
              return (
                <button
                  key={phase.id}
                  type="button"
                  onClick={() => setOpenPhase((o) => (o === phase.id ? null : phase.id))}
                  className={cn(
                    // ::after grows the tap area to ~44px tall; the chip looks the same.
                    "relative flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all after:absolute after:-inset-y-2 after:inset-x-0 after:content-[''] active:scale-95",
                    complete
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : started
                        ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                        : "bg-accent/60 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {complete ? <Check size={11} strokeWidth={3} /> : <ChevronRight size={11} />}P
                  {phase.number}
                </button>
              )
            })}
          </div>
        </div>

        <div className="h-1.5 w-full bg-foreground/5">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${overallPct}%` }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            className="h-full bg-blue-500"
          />
        </div>
      </div>

      <div className="space-y-3">
        {phases.map((phase) => (
          <PhaseCard
            key={phase.id}
            phase={phase}
            completed={completed}
            onToggle={toggle}
            isOpen={openPhase === phase.id}
            isCurrent={phase.id === currentPhase?.id}
            onToggleOpen={() => setOpenPhase((o) => (o === phase.id ? null : phase.id))}
            onAddTopic={handleAddTopic}
            onEditTopic={handleEditTopic}
            onDeleteTopic={handleDeleteTopic}
            onEditPhase={handleEditPhase}
            onDeletePhase={handleDeletePhase}
          />
        ))}

        {showAddPhase ? (
          <AddPhaseForm onAdd={handleAddPhase} onCancel={() => setShowAddPhase(false)} />
        ) : (
          <button
            type="button"
            onClick={() => setShowAddPhase(true)}
            className="flex w-full items-center justify-center gap-2 rounded-3xl border border-dashed border-border py-4 text-sm font-semibold text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground/60 active:scale-[0.99]"
          >
            <Plus size={16} />
            Add Phase
          </button>
        )}
      </div>

      <div className="flex flex-col items-center gap-2">
        <p className="text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Roadmap v2.0 · 2-Year Plan · Cambodia Bank Goal
        </p>
        {resetConfirm ? (
          <div className="flex items-center gap-2 rounded-xl bg-red-500/5 px-4 py-2">
            <span className="text-xs text-red-500">Reset to default roadmap?</span>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-lg bg-red-500 px-3 py-1 text-xs font-bold text-white hover:bg-red-600 active:scale-95"
            >
              Yes, reset
            </button>
            <button
              type="button"
              onClick={() => setResetConfirm(false)}
              className="rounded-lg border border-border px-3 py-1 text-xs font-medium text-muted-foreground active:scale-95"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setResetConfirm(true)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-muted-foreground active:scale-95"
          >
            <RotateCcw size={11} />
            Reset to defaults
          </button>
        )}
      </div>
    </motion.div>
  )
}
