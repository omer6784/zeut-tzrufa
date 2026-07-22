# Product

## Register

brand

## Users

Hebrew-speaking visitors moving through a symbolic, RTL-first experience.

Two audiences, layered:

- **Primary (within the work)** — a person willing to spend a few quiet minutes in a reflective encounter about identity, heritage, and self-definition. They are not buying anything. They are not "trying a tool." They are stepping into something.
- **Evaluative (around the work)** — the academic jury, design peers, and exhibition visitors who experience the piece as a final / thesis project. They read craft, intention, and confidence as much as they read content.

The interface speaks Hebrew first; layout is right-to-left by default. The user's posture is contemplative, slightly ceremonial, never analytical.

## Product Purpose

**זהות צרופה** ("Pure / Refined Identity") is a guided symbolic journey through which a personal pendant is gradually uncovered. The user moves through a sequence of encounters — with symbols, places, words, and forms — and an artifact emerges that feels like *them*.

Success is one thing: the user finishes holding a 3D pendant that reads as a portrait of their own identity, born from their roots, their heritage, and the things that define them. The artifact is the payoff. The path is what earns it.

It is not a configurator, not a personality quiz, not a generator. It is a contemporary art piece built as software.

## Brand Personality

**Three words: intimate, poetic, rooted.**

Atmosphere across the piece: curious · ceremonial · playful · symbolic · calm · reflective · human.

Visual character (synthesized from the existing surface and brief):

- Strong graphic confidence. Large typography. Bold compositions. Generous negative space.
- A tight, committed palette: royal blue (`#0000ff`), orange (`#FD7041`), off-white (`#fcf7f1`).
- Flat vector aesthetics. Graphic symbols (eye, hand, ankh, moon, star, diamond, globe) treated as meaningful cultural objects, not decoration.
- HUD-style micro-labels (coordinates, version, ABCD/123456789) used **playfully**, as design language — never as data instrumentation.
- A balance between precision and playfulness. Contemporary, cultural, designed — not technological.

Voice in copy: spare, poetic, second person, Hebrew. Sentences that name things rather than explain them.

## Anti-references

What this piece should never look or feel like:

- Scientific interfaces.
- Data visualization platforms.
- Dashboard aesthetics.
- Genealogy websites.
- Personality-test websites.
- E-commerce configurators.
- Spiritual wellness branding.
- Tarot and oracle card aesthetics.
- New Age visual language.
- Sacred geometry clichés.
- AI-generated luxury / editorial aesthetics (cream-paper magazine reflex, all-caps eyebrow kickers, 01 / 02 / 03 section numbers, gradient text, glassmorphism-as-default).
- Hyper-futuristic sci-fi interfaces.
- Dark cyberpunk aesthetics.
- Realistic jewelry marketing renders.

The piece is cultural rather than commercial, symbolic rather than mystical, playful rather than technical.

## Design Principles

1. **Encounter, not configuration.** Every step is a meeting with a symbol, a place, a word, or a form — never a field on a form. The user doesn't input data; they notice things, are drawn to things, and choose by gravitating, not by entering.

2. **Symbolic over informational.** When a globe, a map, a coordinate, or a navigation system appears, it is a symbolic device inside the journey — never an informational tool. Numbers and labels are graphic material, not metrics.

3. **Cultural, not commercial.** The piece behaves like a contemporary art object: confidence over polish, presence over conversion, intention over affordances. Nothing about it should reassure the user it is a "product."

4. **Monumental at the bookends, lighter in the middle.** The opening screen and final reveal carry iconic visual weight — the user is encountering an artifact. The question screens are lighter and more playful — the user is wandering through a symbolic landscape, each step revealing another layer of the object to come.

5. **The pendant emerges; it is not delivered.** The artifact builds through encounters, surfacing gradually as the journey advances. There is no "submit," no "generate," no "result page" — only the moment the pendant has finally come into focus.

## Accessibility & Inclusion

Target: **WCAG AA on everything readable and interactive**, with thoughtful exceptions where they would compromise the work as art.

- **Contrast.** Body and UI text must hit 4.5:1 against its background; large display text (≥18px or bold ≥14px) must hit 3:1. The orange-on-cream and blue-on-cream pairings sit close to the line at small sizes; verify with measurement, not eye, and bump weight or size before letting either drop. Placeholder copy is held to the same 4.5:1 as body.
- **Motion.** Every animation (custom cursor, scroll-driven transitions, spinning wheel, 3D rotations, frosted-glass reveals) needs a `prefers-reduced-motion: reduce` alternative — typically an instant or crossfade equivalent. The custom cursor in particular must reveal the OS cursor under reduced motion.
- **Keyboard.** The questionnaire flow (input, submit, prev, skip, restart) must be fully keyboard-operable with visible focus states that read as part of the brand, not browser default outlines.
- **RTL.** Hebrew-first; all directional affordances (arrows, progress, navigation) follow RTL conventions, not LTR mirrored.
- **Language.** Where a non-Hebrew speaker may engage (jury context, future English pass), keep the experience legible through composition and symbol even if copy is opaque — the design should carry meaning, not just text.

Where art and accessibility genuinely conflict (e.g. the custom cursor's role in the piece's identity), provide an accessible fallback rather than removing the artistic choice.
