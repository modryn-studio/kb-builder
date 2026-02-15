# Design Principles v1 — "Let Users Do The Thing"

**Date:** February 15, 2026
**Status:** Active
**Applies to:** KB Builder + all future Modryn Studio projects

---

## Core Philosophy

**The homepage exists for ONE purpose: let users do the thing.**

Study the homepages of Google, ChatGPT, Claude, and ai.com. They share a radical simplicity — a search bar / input field, massive whitespace, and almost nothing else. These are the most-used products on Earth. They don't explain. They don't persuade. They let you act.

Every SaaS landing page built today follows the same 2020 playbook: 5-7 sections explaining the problem, how it works, customer testimonials, pricing tables, and a CTA. This template exists because it's safe, not because it's good. AI-assisted development (vibe coding, templates, component libraries) has made this layout the default — which means it's the opposite of differentiation.

**If 80% of users never scroll past the hero, put 100% of the value in the hero.**

---

## The Three Rules

### 1. Action First, Explanation Later

The homepage has two elements:
1. **The action** — the input/search bar that lets users do the core thing
2. **The library** — existing content users can explore immediately

Everything else (problem statement, how-it-works, testimonials, about) lives on a separate page. Users who want context will find it. Users who want to act shouldn't have to scroll past context to get there.

**Test:** If a user lands on your homepage and can do the core action within 3 seconds without scrolling, you pass.

### 2. Whitespace Is Confidence

Dense layouts signal insecurity — as if the product needs to over-explain itself to justify existing. Whitespace signals confidence. It says: "This is good enough that we don't need to convince you. Try it."

**Guidelines:**
- Hero section should feel spacious, not cramped
- No more than 2-3 visual elements above the fold
- Let the input field/search bar breathe — generous padding, no visual clutter around it
- Backgrounds should be clean — subtle gradients or solid colors, not busy patterns

**Test:** Squint at your homepage. You should see one focal point (the action), not a wall of content.

### 3. Separate "Do" From "Learn"

| Page | Purpose | User Intent |
|------|---------|-------------|
| **Homepage** (`/`) | Do the thing | "I want to use this" |
| **About** (`/about`) | Understand the thing | "How does this work?" |
| **Library** (`/manuals`) | Browse what exists | "What's already here?" |
| **Docs** (if applicable) | Deep technical info | "I want to integrate/extend this" |

Never mix these intents on one page. A user who wants to generate a manual doesn't need to read why AI training data is stale. A user who wants to understand the problem doesn't need a search bar in their face.

---

## Homepage Anatomy

```
┌─────────────────────────────────────────────────────┐
│  [Logo]              [Browse Manuals]  [About]      │   ← Minimal navbar
│                                                      │
│                                                      │
│                                                      │
│         Headline (value prop, ~10 words)              │
│                                                      │
│      ┌─────────────────────────────────┐             │
│      │  [Search / Input]    [Action]   │             │   ← THE thing
│      └─────────────────────────────────┘             │
│                                                      │
│                                                      │
│                                                      │
├─────────────────────────────────────────────────────┤
│                                                      │
│         Library / Browse Grid                        │   ← Explore existing
│         (cards, minimal, scannable)                   │
│                                                      │
├─────────────────────────────────────────────────────┤
│  [Logo]   [Tagline]              [Support link]      │   ← Minimal footer
└─────────────────────────────────────────────────────┘
```

**Total sections: 3** (navbar, hero+library, footer)

Compare to the generic SaaS template:
```
Navbar → Hero → Social proof → Problem → Solution → Features →
How it works → Testimonials → Pricing → FAQ → CTA → Footer
= 12 sections, 80% of which users never see
```

---

## Typography & Copy Rules

### Headlines
- **Maximum 10 words.** If you can't say it in 10 words, you don't understand it yet.
- **Lead with the differentiator.** What makes you different goes in the headline, not buried in paragraph 3.
- **No generic superlatives.** "The best X" means nothing. "Generated today, not last year" means something specific.

### Body Copy
- **One idea per paragraph.**
- **Concrete over abstract.** "ChatGPT gives you May 2025 answers" beats "AI assistants have knowledge limitations."
- **Name the villains.** Don't say "traditional approaches are limited." Say "Google shows you blog posts from 2023."

### Microcopy
- Button labels should be verbs: "Generate," "Browse," "View"
- No "Click here" or "Learn more" — describe the destination
- Error messages should be helpful, not apologetic

---

## Visual Hierarchy

### Above the Fold (Hero)
1. **Headline** — largest text on the page
2. **Input field** — second focal point, visually prominent
3. **Action button** — clear, high-contrast

### Below the Fold (Library)
4. **Section header** — smaller than hero, establishes context
5. **Content grid** — cards with consistent structure
6. **Browse link** — subtle, for users who want to see more

### Footer
7. **Minimal** — logo, tagline, support link. Nothing else.

**Rule:** Each element should be obviously more important than the one below it. If two elements compete for attention, one of them shouldn't exist.

---

## Color & Contrast

- **One accent color.** Used for the action button, active states, and key highlights. Nothing else.
- **Neutral backgrounds.** Dark or light, but never busy. The content is the visual interest.
- **Text hierarchy through weight and size, not color.** Don't use 5 different text colors. Use 2 (foreground + muted) and vary weight/size.

---

## Responsive Design

- **Mobile-first doesn't mean mobile-only.** Desktop should feel intentionally designed, not just "mobile but wider."
- **The hero action must work identically on all devices.** If the search bar is harder to use on mobile, you've failed.
- **Reduce, don't rearrange.** On smaller screens, show less — don't just stack everything vertically.

---

## Anti-Patterns to Avoid

### ❌ The "Convince Me" Homepage
5-7 sections of persuasion copy before the user can do anything. Assumes users are skeptical. Actually makes them skeptical by over-explaining.

### ❌ The Template Trap
Using a SaaS template (Tailwind UI, shadcn landing page) and filling in the blanks. Every AI-built startup looks identical. This is the opposite of differentiation.

### ❌ The Feature Dump
Listing every feature on the homepage. Features belong in docs or on a dedicated features page. The homepage shows ONE thing: the core action.

### ❌ The Wall of Testimonials
Social proof is powerful but overused. If your product needs 8 testimonials on the homepage to feel credible, the product isn't credible enough.

### ❌ Animations for Animation's Sake
Subtle entrance animations are fine. Parallax scrolling, floating elements, and scroll-triggered transitions are distractions. ChatGPT has zero scroll animations. It's the most-used AI product on Earth.

---

## Decision Framework

When designing any new page, ask:

1. **What is the ONE action a user should take on this page?** If you can't answer in one sentence, the page does too much.
2. **Can a user take that action within 3 seconds of landing?** If not, remove everything between them and the action.
3. **Would removing this element make the page worse?** If the answer is "no" or "I'm not sure," remove it.
4. **Does this look like every other SaaS landing page?** If yes, start over.

---

## Reference Products

Study these homepages regularly. Notice what they DON'T have:

| Product | What's on the homepage | What's NOT |
|---------|----------------------|-----------|
| **Google** | Search bar, logo, 2 buttons | No explanation of PageRank |
| **ChatGPT** | Input field, suggested prompts | No "how AI works" section |
| **Claude** | Input field, capabilities hints | No feature comparison chart |
| **ai.com** | Input field, model selector | No testimonials |
| **Perplexity** | Search bar, trending topics | No "why we're better than Google" |

**Pattern:** The best products in the world don't explain themselves on the homepage. They let you use them.

---

## Applying to KB Builder

### Before (v0 — Generic SaaS Template)
```
Navbar → Hero → Manual Library → Problem Section →
How It Works (3 steps) → Footer
= 6 sections, persuasion-heavy
```

### After (v1 — "Do The Thing")
```
Navbar → Hero (action) → Library (explore) → Footer
= 3 sections, action-first
```

### What Moved Where
| Content | Before | After |
|---------|--------|-------|
| Search bar + Generate | Homepage hero | Homepage hero (unchanged) |
| Manual library grid | Homepage section 2 | Homepage section 2 (unchanged) |
| Problem statement | Homepage section 3 | `/about` page |
| How it works | Homepage section 4 | `/about` page |
| Footer | Homepage | Homepage (unchanged) |

The content didn't disappear — it moved to where curious users will find it. The homepage became what it should always have been: a tool, not a brochure.
