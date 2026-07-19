# The product — what the owner experiences

> One file for the whole surface: the feel, the chat and its cards, the dock, the canvas, onboarding, and
> the honesty rules. Verified against the code (2026-07-18). The machine behind it:
> [system.md](./system.md) · look & tokens: [design-system.md](./design-system.md) · what's next:
> [DEVELOPMENT.md](../DEVELOPMENT.md).

## §0 — The feel (the rules)

1. **You talk to Lu; she replies with cards.** Every flow — onboarding, connecting accounts, planning,
   building, publishing — happens in the one conversation. Cards are how structure appears in it.
2. **The conversation is the log.** Terminal events (preview ready, published, failed, plan approved) land
   as real messages. The chat is true after a reload — it hydrates from the server thread.
3. **The UI never lies.** Every interactive element works end-to-end or is disabled and labeled
   **Coming soon**. No silent no-ops, no mock data rendered as real, no locally-computed badges when
   server truth exists.
4. **One source of truth.** Chat, dock tabs, canvas, department pages, and the task page all render the
   same rows and events — different projections, never different data.

## §1 — One object, three sizes

There is ONE renderable object — **the Build** (a task + its plan, events, artifacts, approvals) — at
exactly three sizes, always fed by the same data:

1. **Card** (in the chat) — the live telling of one build; progresses in place: planning → awaiting your
   approval → building (live activity line from the journal) → PR + preview → verifying (criteria check
   off) → needs you (Publish) → live (URL).
2. **Row** (Home · Tasks tab · canvas badges) — status dot · title · phase · latest event line.
3. **Page** (`/task/[id]`, `TaskDetail.tsx`) — everything: the plan with the acceptance CHECKLIST and
   per-criterion verify verdicts, the staged migration SQL, pending approvals with their buttons, the
   events timeline, the preview iframe, the PR diff and build transcript (collapsed), and the actions
   (Retry on failed · Request changes → prefills the composer).

**Every row and card clicks through to the Page.**

## §2 — The chat cards

Lu's turns are plain text; structured turns attach a card (`Message.card` / doc artifacts):

| Card | When | Does |
|---|---|---|
| **connect** | Lu needs an account linked (`show_connect_form`) | provider rows with real install buttons (GitHub App · Vercel Integration · Supabase OAuth), paste-a-token as fallback |
| **decisions** | onboarding (`propose_decisions`) | one decision at a time (pager); tapping an option IS the decision, "Other" answers it in your own words — no confirm buttons |
| **business plan** | onboarding (`draft_business_plan`) | the plan doc + **Accept & activate departments** |
| **plan** | `propose_plan` | objective · steps · acceptance + Approve / Request changes / Reject |
| **doc** | `draft_doc` staged a gated doc (architecture) | preview + Approve / Ask for changes + open in the Library |
| **build tracker** | a build is running | the Card size of the Build (§1) |
| **question** | `ask_user` | the question card ON the message: the question + option rows (one Recommended) + "Other"; tapping an option sends it as your message — same rows as the decisions card |

Approvals surface where you are: in the chat card, on the task page, and (when registered) as Slack
buttons — same resolve endpoint.

## §3 — The dock

Tabs: **Home · Lu · Company · Tasks · Library**.

- **Home** — Suggested Next only: the next things to do, each firing a Lu intent (clicking "Connect
  GitHub" prompts Lu, who answers with the connect card). No decorative roadmap.
- **Lu** — the conversation. Empty states: "Tell me more about your company" (onboarding) / "What should
  we build?" (after). Composer has the model picker + usage meter.
- **Company** — connections panel (install-first), **Projects** (Lu-built sites + imported repos, one
  list; import picker reads the App-granted repos; per-repo setup/test commands), agents.
- **Tasks** — all tasks as Rows → the task page.
- **Library** — two halves: **Documents** (the company docs Lu writes) filed into **folders** —
  *General* (Business Plan, decisions, strategy) + one per live department (*Engineering*:
  architecture, specs, migrations; the other departments' folders arrive with them) — as preview
  cards; and **Files** (canvas notes/files/folders). Every document opens the **Notion-style
  viewer** at `/doc/[id]`: big title, an outline sidebar built from the headings, last-updated, the
  rendered doc at reading scale, **Ask Lu to revise** (prefills the composer), and — for a gated
  doc — the Approve gate inline. Revisions replace the doc in place.

## §4 — The canvas

One graph: **Lu** centered; **departments = agents** as hubs (each an app: Home / database console /
workplace); **resources** (terminal · note · file · folder · site) as spokes from the ＋ menu; **edges as
grants** (`reads` = context, `uses` = tool, `produces` = output). Nodes, positions, and edges persist to
the DB. v0 provisions Engineering only.

Live behavior: agent nodes pulse while `Agent.status = working`, captioned with the latest journal event;
the agent-updates pill opens the review; site nodes render live previews.

**Department app** — *Home*: the unified Projects list. *Workplace*: task selector → task page, live
preview iframe, **Request changes** (real — prefills the composer), Retry on failed, Publish gated;
Revert All stays Coming soon until a rollback endpoint exists. *Database console*: mirror of the org's
Supabase (tables · migrations · storage · auth · users · secrets · logs) with four wired key actions
(rotate secret · create bucket · add redirect · add user) behind confirm dialogs; the rest read-only.

**Known gap (canvas grants):** ＋-menu notes/files keep content in localStorage with no backing artifact,
so `reads`-edges inject nothing for user content. The contract (on the TODO): creating a node creates an
`Artifact` and sets `refId`; agent outputs appear as nodes automatically.

## §5 — Onboarding (two phases)

1. **Sign-up (static, no AI)** — five screens: your name → role → idea stage → company name →
   `finishSignup` seeds Lu's memory and lands you on the canvas.
2. **Lu onboards you (in the workspace)** — onboarding-mode is derived (org with no active department);
   Lu runs her onboarding **skill** with a swapped toolkit: you describe the company → **decision cards**
   → the **Business Plan** doc → **Accept & activate departments** boots the company (Engineering active).

**The full playbook (built 2026-07-18):** onboarding doesn't end at activation — the skill
(`skills/onboarding.md`, a real markdown file) runs five stages: learn the company → Business Plan →
*connect your stack* (Lu drives the connect cards) → *system architecture* (a gated Library doc) →
*first build*. Lu's prompt carries a COMPANY SETUP stage line derived from live state, so she resumes
mid-setup after any reload; the playbook stops applying the moment the first build publishes.

Entry remains waitlist-gated self-serve: join → admin accepts → invite email → set password → sign-up.

## §6 — The publish flow (what the owner clicks)

The owner only ever clicks three kinds of buttons; everything between them is Lu's:

1. **Approve plan** — before any build.
2. **Run migration** — after reading the actual SQL on the task page. SQL never executes any other way.
3. **Publish** — merge the PR + promote to production. Blocked in code until acceptance verification
   passed (preview fetched live + repo tests green).

Iteration is conversational: "Request changes" anywhere prefills the composer; Retry re-dispatches a
failed build.

## §7 — Coming-soon register (labeled, honest)

Revert All (needs rollback endpoint) · canvas focused-site action bar · terminal-attach-to-build ("watch
the coding agent type") · department pages beyond Engineering · phone/email channels · presets beyond
Business. Anything new ships functional or labeled — no third state.
