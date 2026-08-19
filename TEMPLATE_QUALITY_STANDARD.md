# RIDE — Template Generation Quality Standard

> **RIDE must not generate a collection of visually similar landing pages. It must generate complete, production-style, end-to-end websites where every interaction leads somewhere meaningful.**

## 1. Every template must be genuinely different

Do **not** create every template using the same visual structure. Templates must have different:

- Layout systems
- Navigation patterns
- Hero compositions
- Typography systems
- Grid systems
- Card designs
- Section arrangements
- Color combinations
- Background treatments
- Illustration styles
- 3D elements
- Animation styles
- Interaction patterns
- Page transitions
- Loading states
- Button styles
- Form styles
- Dashboard structures
- Mobile layouts

Templates should **not feel like recolored versions of each other.**

## 2. Templates must be FULL END-TO-END

This is the most important requirement.

Do NOT generate:

> Navbar → Hero → Features → Pricing → Footer

and call that a complete website. That is only a landing page.

Instead, determine what a real website of that category actually needs. For a SaaS website: public pages (Home, About, Features, Solutions, Pricing, Documentation, Blog, Blog article, Resources, Contact, Careers, Security, Privacy, Terms, Login, Signup, Forgot password) plus the application after login (Dashboard, Overview, Projects, Project details, Create project, Analytics, Activity, Notifications, Team, Team member profile, Billing, Settings, Profile, API keys, Integrations, Help).

The exact pages must be determined dynamically according to the website category.

## 3. Every button must actually work

Do not create decorative buttons. Every meaningful interaction must have a destination or action:

- `Get Started` → Signup
- `Login` → Login page
- `View Pricing` → Pricing
- `Learn More` → Relevant feature page
- `View Project` → Project details
- `Read Article` → Full article
- `Contact` → Contact page/form
- `Dashboard` → Dashboard
- `Settings` → Settings
- `Upgrade` → Billing/upgrade interface

Buttons should never lead to `#`, empty handlers, fake links, dead pages, or unfinished sections.

## 4. Every menu item must contain real content

If navigation contains Products, clicking Products should open a meaningful products experience; each product should have its own content/page where appropriate. Resources could contain Documentation, Guides, Blog, Tutorials, Case studies, FAQs. The website should feel like a **real product**, not a mockup.

## 5. Generate realistic content

Do not repeatedly use Lorem ipsum or "This is a sample description." Generate realistic content relevant to the website (cybersecurity → security architecture, threat detection, compliance; restaurant → menu, reservations, locations, gallery, events, hours, booking; education → courses, course details, instructors, learning dashboard, progress, certificates).

## 6. Use modern UI libraries aggressively

Do not rely on manually generated primitive CSS for everything. When appropriate, use existing libraries and components: Tailwind CSS, shadcn/ui, Radix UI, Lucide, Framer Motion / Motion, Three.js, React Three Fiber, Drei, GSAP, React Hook Form, Zod, Recharts, TanStack Table, Embla Carousel, modern icon libraries, accessible component libraries, appropriate animation libraries. Use the library that best fits the design; do not add libraries randomly.

## 7. Use 3D where it improves the experience

RIDE should be capable of producing genuinely impressive modern interfaces: Three.js, React Three Fiber, Drei, WebGL, 3D product objects, floating objects, particle systems, depth effects, interactive 3D scenes, 3D cards, parallax, perspective effects, scroll-controlled 3D, animated backgrounds.

Do **not** force 3D onto every website. A fintech dashboard may need sophisticated charts; a gaming website may use extensive 3D; a luxury product website may use cinematic 3D product presentation.

## 8. Advanced motion system

Do not use the same animation everywhere. Use different motion techniques depending on the template: scroll reveal, staggered entrance, parallax, magnetic buttons, hover transformations, smooth page transitions, shared layout animations, text reveal, image reveal, horizontal scrolling, sticky storytelling, morphing elements, cursor interactions, 3D rotation, loading animations, skeleton states, micro-interactions.

Avoid "everything fades in."

## 9. Build proper loading states

Every application should have appropriate loading indicators, skeleton screens, page loading, button loading, form submission states, data loading, empty states, error states, success states. Create different loaders depending on the visual identity of the template.

## 10. Responsive design is mandatory

Every template must work properly on desktop, laptop, tablet, and mobile. Do not simply shrink the desktop design; the layout should intelligently transform (Sidebar|Content|Inspector on desktop → Header/Content/Bottom navigation on mobile). Navigation must become a proper mobile navigation system. Cards, tables, dashboards, forms, images, 3D scenes, and typography must all adapt.

## 11. Accessibility

Semantic HTML, keyboard navigation, focus states, accessible buttons, ARIA where required, proper contrast, form labels, screen-reader-friendly structure, reduced-motion support.

## 12. Performance

Premium design should NOT mean terrible performance. Optimize images, 3D assets, fonts, JavaScript, animations. Use lazy loading, dynamic imports, asset compression, reduced resolution where appropriate, GPU-friendly animations, IntersectionObserver, code splitting.

## 13. Each template should have its own design language

Before generating, internally create a design system (design philosophy, color system, typography, spacing, border radius, shadow system, icon style, button style, card style, navigation style, animation language, illustration style, 3D style, grid system, responsive rules, component system) and generate the entire website consistently from it.

## 14. Avoid repetitive templates

Actively detect template similarity. Do NOT generate four "colored SaaS" clones while keeping the same structure. The **design architecture itself** should change: Editorial, 3D Futuristic, Swiss Minimal, Luxury, Glassmorphism, Brutalist, Cinematic, Neo-minimal, Data-dense, Experimental.

## 15. Templates should be application-ready

If the user asks for a project management application, do not only create the marketing website — create marketing website → authentication → onboarding → dashboard → projects → project details → tasks → team → calendar → analytics → notifications → settings → billing. Same principle for SaaS, E-commerce, Fintech, Education, Healthcare, Social platforms, AI applications, Developer tools, Marketplaces, Booking systems, CRM, ERP, Portfolio, Agencies, Restaurants, Hotels, Travel, Real estate, Job platforms, Communities, Media, Gaming, Productivity tools.

## 16. RIDE's AI should think before generating

Determine: product type, target user, required pages, functionality, data/entities, navigation structure, design direction, UI libraries, animation system, whether 3D is useful, responsive behavior, reusable components, authentication, backend functionality, states, security requirements, and what pages/actions are still missing. Then generate.

## 17. RIDE should use a completion audit

After generation, run an automated audit:

```
[ ] All routes work
[ ] No dead buttons
[ ] No dead links
[ ] No placeholder pages
[ ] No Lorem Ipsum
[ ] Responsive
[ ] Navigation works
[ ] Forms work
[ ] Loading states exist
[ ] Error states exist
[ ] Empty states exist
[ ] Authentication flow works
[ ] Components are reusable
[ ] UI is consistent
[ ] Accessibility checked
[ ] Console errors checked
[ ] Build succeeds
[ ] TypeScript errors fixed
[ ] Broken imports fixed
[ ] Mobile layout checked
[ ] Visual quality reviewed
```

If something fails, fix it before considering the template complete.

## 18. Most important principle

**RIDE should not optimize for generating the fastest possible webpage.** It should optimize for:

> "Generate a website/application that feels like a real product someone could actually use."

The result should be: Design + UX + functionality + responsiveness + animation + content + architecture + interactions + polish. Not merely: HTML + CSS + a few cards.

## Final RIDE Template Quality Standard

A generated template should make the user think "This looks like a real startup/product that could launch today" and NOT "This looks like an AI-generated demo."

Every generated template must be: Unique. Complete. Interactive. Responsive. Beautiful. Functional. Production-oriented. Performance-conscious. Accessible. End-to-end.

**Do not compromise the visual quality or functional completeness just to finish faster.**
