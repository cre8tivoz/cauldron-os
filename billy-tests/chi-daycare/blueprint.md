# Website Blueprint — Tiny Tyrants Day Care

## 1. Project Overview

### Site name
**Tiny Tyrants Day Care**

### Tagline
**Big care for Melbourne’s tiniest troublemakers.**

### Description
Tiny Tyrants Day Care is a chihuahua-first day care brand based in Prahran, Melbourne, designed for owners who treat their dogs like family and want a more tailored, boutique alternative to generic dog care. The site should feel premium, playful, and polished, balancing confidence and warmth. It needs to quickly answer the practical questions owners have — safety, routine, pricing, trial days, and how to book — while building emotional trust through charming copy, strong visual personality, and a clear booking path.

### Target audience
- Inner Melbourne chihuahua owners, especially around Prahran and nearby suburbs
- People actively ready to book, call, or enquire
- Owners who are protective, design-aware, and willing to pay for specialist care

### Key message
**This is not generic dog day care. It is a boutique, chihuahua-specific space for tiny dogs with big personalities. Dog welfare is a key callout**

---

## 2. Content Strategy

## Primary pages
1. **Home**
2. **About**
3. **Services**
4. **Pricing**
5. **FAQ**
6. **Testimonials**
7. **Book a Trial**

A single-page landing experience can handle the primary conversion flow, but these should be structured as distinct content sections and routable anchors, with option to split into standalone pages later.

---

### Content hierarchy per page

## 1. Home
- Hero
  - Tagline
  - One-line value proposition
  - Primary CTA: Book a trial day
  - Secondary CTA: Call now
- Trust strip
  - Chihuahua-only
  - Inner Melbourne
  - Trial days available
  - Boutique group sizes
- Overview
  - Why tiny dogs need different care
- Featured services preview
- Pricing preview
- Testimonials preview
- FAQ preview
- Final booking CTA

## 2. About
- Brand story
- Why chihuahua-specific care matters
- Space and environment
- Staff approach
- Safety and compliance summary
- CTA to book trial

## 3. Services
- Day care
- Trial sessions
- Membership packages
- Optional add-ons if introduced later
- Daily routine / what a day looks like
- Who it’s for / who it’s not for
- CTA to enquire

## 4. Pricing
- Trial day pricing
- Casual day care pricing
- Membership plans
- Inclusions
- Notes on suitability / temperament assessment
- CTA to book

## 5. FAQ
- Safety
- Socialisation
- Vaccination requirements
- Trial process
- Hours
- What to bring
- Booking / cancellation
- CTA to contact

## 6. Testimonials
- Quotes from owners
- Dog names + suburb where appropriate
- Short outcomes: calmer, happier, better socialised
- CTA to book

## 7. Book a Trial
- Enquiry form
- Call option
- Opening hours
- Service area
- Expectations after submitting
- Confirmation state

---

### Key calls to action
- **Primary:** Book a trial day
- **Secondary:** Call now
- **Tertiary:** See pricing / Read FAQs

CTA language should stay direct and specific:
- Book a Trial Day
- Call Tiny Tyrants
- Check Plans
- Ask About Memberships

---

## 3. User Experience

## Primary user journeys

### Journey 1: Ready-to-book owner
1. Lands on homepage
2. Understands “chihuahua-specific” within 3 seconds
3. Scans services and pricing
4. Checks FAQ for safety and fit
5. Submits trial booking form or calls directly

### Journey 2: Cautious comparer
1. Lands on homepage from search or social
2. Reads about brand and approach
3. Reviews testimonials and trust points
4. Checks pricing
5. Books a trial day

### Journey 3: Mobile-first caller
1. Lands on page from maps/social/search
2. Sees sticky call/book bar
3. Taps call or opens enquiry form
4. Converts without needing to scroll deeply

---

## Navigation structure

### Header nav
- Logo
- About
- Services
- Pricing
- FAQ
- Testimonials
- Book a Trial

### Mobile nav
- Slide-down or full-screen panel via AlpineJS
- Sticky CTA buttons:
  - Call
  - Book

### Footer nav
- Quick links
- Contact details
- Hours
- Service area
- Social links
- Legal / policies

---

## Interaction patterns
- Sticky header on scroll
- Sticky mobile action bar
- FAQ accordion using AlpineJS
- Testimonial carousel or swipeable stack on mobile
- Pricing toggle if needed for casual vs membership
- Form with validation, success state, and localStorage persistence
- Hover motion: subtle translate and brightness shift
- Focus styles on all controls
- Reduced motion support

---

## 4. Page Specifications

## 1. Home

### Purpose
Establish brand, communicate niche positioning fast, and drive immediate trial bookings or calls.

### Layout
- Sticky header
- Hero split layout
  - Left: copy + CTAs
  - Right: image collage or stacked photo layout
- Trust strip
- About teaser
- Services cards
- Pricing preview
- Testimonials
- FAQ teaser
- Booking CTA block
- Footer

### Key components
- Hero headline
- CTA button group
- Feature badges
- Image cluster
- Service cards
- Pricing cards
- Accordion
- Testimonial cards
- Booking banner

### Responsive behavior
- **375px:** single-column, stacked CTAs, swipeable testimonials, image collage simplified to one main image
- **768px:** 2-column hero, 2-up services/pricing
- **1440px:** wide asymmetrical layout with stronger editorial spacing and multi-image composition

---

## 2. About

### Purpose
Build trust and explain why a dedicated chihuahua environment matters.

### Layout
- Intro heading + supporting copy
- Brand story
- Why tiny dogs need tailored care
- Safety standards list
- Staff/space image band
- CTA

### Key components
- Section labels
- Editorial text blocks
- Feature list
- Compliance / trust badges

### Responsive behavior
- Content stacks on mobile
- 2-column text-image sections on tablet and desktop

---

## 3. Services

### Purpose
Clarify what is offered and how the experience works.

### Layout
- Intro
- Service cards
- “A day at Tiny Tyrants” timeline
- Suitability notes
- Final CTA

### Key components
- Day care card
- Trial session card
- Membership card
- Routine timeline
- Checklist

### Responsive behavior
- Mobile accordion for service details
- Tablet/desktop card grid and horizontal timeline

---

## 4. Pricing

### Purpose
Reduce friction with transparent, premium but understandable pricing.

### Layout
- Pricing intro
- 3 pricing tiers/cards
- What’s included comparison
- Notes / fine print
- CTA

### Key components
- Trial day card
- Casual visit card
- Membership package card
- Included features list
- Policy notes

### Responsive behavior
- Stacked cards on mobile
- 3-column comparison on desktop
- Featured plan receives subtle accent border

---

## 5. FAQ

### Purpose
Remove objections and increase confidence before booking.

### Layout
- Intro
- Categorized accordion list
- Contact CTA

### Key components
- Search optional later
- Expand/collapse items
- Contact fallback block

### Responsive behavior
- Fully stacked on all breakpoints
- Larger tap targets on mobile

---

## 6. Testimonials

### Purpose
Provide social proof and emotional reassurance.

### Layout
- Intro
- Quote grid or carousel
- Mini stat strip
- CTA

### Key components
- Testimonial cards
- Owner name + suburb
- Dog name
- Optional star motif avoided unless necessary
- Stats like repeat visits / happy tiny clients

### Responsive behavior
- Carousel/swipe on mobile
- 2–3 column grid on desktop

---

## 7. Book a Trial

### Purpose
Convert intent into enquiry or immediate phone contact.

### Layout
- Contact intro
- Phone CTA
- Form
- Practical details
- Submission success block

### Key components
- Enquiry form fields:
  - Owner name
  - Phone
  - Email
  - Dog name
  - Dog age
  - Temperament notes
  - Preferred day
  - Membership interest
- Call button
- Hours and location snippet
- Success message

### Responsive behavior
- Single-column on mobile
- Form + details split layout on desktop

---

## 5. Visual Identity

## Typography system

Because the reference is Webflow-inspired but this project needs a friendlier boutique tone, use:

### Primary font
**WF Visual Sans Variable** if available  
Fallback: **Arial, Helvetica, sans-serif**

If implementation needs a web-safe alternative:
- Headings: `"Arial", "Helvetica Neue", sans-serif`
- Body: system sans stack

### Type scale
- **Display / Hero:** 48px mobile / 72–80px desktop / weight 600
- **H1 / Section lead:** 40–56px / weight 600
- **H2:** 32px / weight 600
- **H3 / card title:** 24px / weight 500–600
- **Body large:** 18–20px / weight 400–500 / line-height 1.5–1.6
- **Body standard:** 16px / weight 400–500 / line-height 1.6
- **Meta / labels:** 12–15px uppercase / weight 500–600 / letter spacing 1px–1.5px

### Typography behavior
- Left aligned body copy
- Tight heading tracking, generous body leading
- Uppercase micro labels for section intros like:
  - CHIHUAHUA-FIRST CARE
  - PRAHRAN, MELBOURNE
  - TRIAL DAYS OPEN

---

## Color palette

The selected Webflow system takes priority, but this project should adapt it into a **bubblegum boutique palette** with strong usability.

### Core brand palette
- **Deep Blue:** `#1a5fe8` — primary CTA / links
- **Sky Blue:** `#5ab4f0` — secondary accents
- **Hot Pink:** `#f03e8a` — highlight / delight
- **Soft Pink:** `#f08ab4` — subtle surfaces / badges
- **Mint Green:** `#78e0a0` — reassurance / success accents
- **Orange:** `#f07828` — playful highlights
- **Teal:** `#28c8c8` — supporting accent

### Neutrals for accessibility
- **Ink:** `#121826`
- **Charcoal:** `#1d2433`
- **Slate:** `#4c566a`
- **Muted:** `#7f8899`
- **Border:** `#d7ddea`
- **Surface:** `#f7f5f1`
- **Warm White:** `#fcfaf6`

### Recommended use
- Primary button: `#1a5fe8`
- Primary button hover: `#114bc0`
- Text on light: `#121826`
- Background: `#fcfaf6`
- Secondary badge bg: rgba from pink / blue / mint at 10–14%
- Testimonial accents can rotate across hot pink, mint, teal, orange

### Dark mode default adaptation
Since the system mandates dark mode as default, prototype should use:

- **Dark background:** `#121826`
- **Dark elevated surface:** `#1d2433`
- **Primary text:** `#f7f5f1`
- **Secondary text:** `#cbd3df`
- **Border dark:** `rgba(255,255,255,0.12)`

But for brand fit, the public-facing landing page can open in a **light-forward presentation with dark UI accents**, while preserving dark-ready tokens.

---

## Imagery style and art direction
- Real dog photography preferred
- Placeholder images from Unsplash acceptable for prototype
- Focus on:
  - small dogs in bright clean interiors
  - close-up expressive faces
  - cozy premium textures
  - daylight, not gloomy
- Avoid:
  - generic vet imagery
  - oversized dogs
  - chaotic kennel visuals
  - fake team handshake scenes

### Visual treatment
- Sharp 4px–8px corners
- Thin borders
- Minimal shadow
- Layered editorial collage in hero
- Playful cropped image blocks with confident spacing
- Occasional color chips / labels for delight

---

## Spacing and layout grid
- 8px base spacing system
- Section padding:
  - Mobile: 48–64px
  - Tablet: 64–80px
  - Desktop: 80–96px
- Container max width: 1200px
- Grid:
  - Mobile: 4 columns
  - Tablet: 8 columns
  - Desktop: 12 columns
- Gutters:
  - Mobile: 16px
  - Tablet: 24px
  - Desktop: 32px

---

## 6. Technical Approach

## Build approach
- Self-contained **HTML + AlpineJS** prototype
- Semantic structure with:
  - `header`
  - `nav`
  - `main`
  - `section`
  - `footer`
- AlpineJS for:
  - mobile menu
  - FAQ accordion
  - pricing plan toggle if used
  - testimonial slider
  - form state and validation
  - success/error/loading states
- Minimal dependencies
- Inline or local CSS tokens for fast preview
- localStorage persistence for enquiry form draft

---

## Performance targets
- Lighthouse Performance target: **90+**
- First Contentful Paint: under **1.8s**
- Lightweight image strategy:
  - responsive image sizes
  - lazy loading below fold
  - width/height dimensions set
- Limit script overhead
- Avoid animation-heavy libraries

---

## SEO considerations
- Strong local intent:
  - “Chihuahua day care Prahran”
  - “Chihuahua day care Melbourne”
  - “Small dog day care inner Melbourne”
- Metadata:
  - title
  - description
  - Open Graph tags
- Semantic heading order
- FAQ schema recommended
- Local business schema recommended
- Indexable contact details in footer
- Descriptive alt text for all imagery

---

## Analytics/tracking needs
- Track:
  - call button clicks
  - form submissions
  - sticky mobile CTA clicks
  - FAQ interactions
  - scroll depth
  - pricing card interactions
- Suggested tools:
  - Google Analytics 4
  - Meta Pixel only if ads used later
- Event naming examples:
  - `click_call_header`
  - `click_book_hero`
  - `submit_trial_form`
  - `open_faq_vaccinations`

---

## 7. Component Inventory

## Reusable components needed

### 1. Header
**Props**
- logo text
- nav items
- sticky state

**States**
- default
- scrolled
- mobile menu open

**Behavior**
- collapses into mobile menu
- sticky on scroll
- primary CTA remains visible

---

### 2. Hero
**Props**
- eyebrow label
- headline
- subcopy
- primary CTA
- secondary CTA
- image set

**States**
- responsive image layout
- optional subtle entrance animation

**Behavior**
- CTA buttons with hover/focus states
- image collage reflows by breakpoint

---

### 3. Trust badges
**Props**
- label
- accent color

**States**
- static

**Behavior**
- wrap cleanly on mobile

---

### 4. Service cards
**Props**
- title
- description
- badge
- feature list

**States**
- default
- hover
- focus-within

**Behavior**
- equal-height on larger screens
- stack on small screens

---

### 5. Pricing cards
**Props**
- plan name
- price
- frequency
- description
- features
- featured boolean

**States**
- default
- featured
- hover
- active

**Behavior**
- clear CTA in each card
- optional toggle for membership frequency

---

### 6. FAQ accordion
**Props**
- question
- answer
- category

**States**
- collapsed
- expanded

**Behavior**
- AlpineJS toggle
- keyboard accessible
- one or many open depending on chosen pattern

---

### 7. Testimonial card / slider
**Props**
- quote
- owner name
- dog name
- suburb

**States**
- active
- inactive

**Behavior**
- swipe/arrow navigation on mobile
- grid on desktop optional

---

### 8. Booking form
**Props**
- field config
- submit label

**States**
- default
- focused
- invalid
- loading
- success
- error

**Behavior**
- client validation
- draft saved to localStorage
- success message after submit
- disabled submit during loading

---

### 9. CTA banner
**Props**
- heading
- supporting text
- button group

**States**
- static

**Behavior**
- high contrast section near footer

---

### 10. Footer
**Props**
- contact info
- links
- hours
- service area

**States**
- static

**Behavior**
- stacks on mobile

---

## 8. Implementation Notes

## Build priorities
1. Nail hero and mobile-first CTA flow
2. Create strong pricing and services clarity
3. Build polished FAQ and testimonial sections
4. Implement enquiry form with validation and persistence
5. Refine responsive spacing and image treatment
6. Add analytics hooks and SEO metadata

---

## Content migration needs
Since this is a test project, content will be largely generated, but structure should support easy replacement of:
- logo
- hero imagery
- phone number
- address
- hours
- testimonials
- exact pricing
- policies and compliance copy

Use clean JSON-like demo data inside Alpine where possible.

---

## Third-party integrations
Potential integrations:
- Click-to-call link
- Formspree / Basin / custom endpoint for booking form
- Google Maps embed or linked map
- Calendly optional later for trial day scheduling
- Google Analytics 4

---

# Recommended Page Copy Direction

## Hero copy
**Boutique chihuahua day care in Prahran.**  
For tiny dogs with strong opinions, dramatic entrances, and elite cuddle standards.

Supporting copy:  
A calm, small-dog-focused space for inner Melbourne chihuahuas to play, nap, socialise, and be adored properly. Trial days available now.

Primary CTA: **Book a Trial Day**  
Secondary CTA: **Call Now**

---

## About tone
Warm, funny, premium. Slightly cheeky, never sloppy.

Example:
**Small dogs don’t need “less” care. They need the right kind.**  
Tiny Tyrants was built for chihuahuas who are clever, expressive, slightly bossy, and not always thrilled by bigger-dog energy. We keep group sizes considered, routines structured, and the vibe calm, bright, and affectionate.

---

## Services framing
- **Day Care** — structured social time, rest, supervision, and tiny-dog-safe play
- **Trial Session** — a low-pressure first visit to assess fit and routine
- **Memberships** — priority placements for regulars who like consistency

---

## Final design direction summary
This website should look like **Webflow polish adapted to a boutique Melbourne dog brand**:
- crisp typography
- editorial layout
- sharp cards
- blue-led CTA system
- playful bubblegum accent colors
- mobile-first conversion flow
- premium but affectionate tone

If you want, I can next turn this blueprint into a **fully working single-file HTML + AlpineJS prototype** with real sections, styling tokens, placeholder Unsplash imagery, FAQ accordion, testimonial slider, sticky mobile CTA bar, and a persisted booking form.