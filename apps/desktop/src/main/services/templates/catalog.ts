import type { RideTemplate, TemplateQuestion } from "@ride/contracts";
import { accentForVariant, briefFor } from "./engine/briefs";

export type Section = "websites" | "webapps" | "ai" | "mobile" | "desktop" | "developer" | "games" | "starter";

export type ArchetypeId =
  | "portfolio"
  | "saas"
  | "landing"
  | "blog"
  | "docs"
  | "dashboard"
  | "ecommerce"
  | "social"
  | "ai-app"
  | "pwa"
  | "api"
  | "cli"
  | "package"
  | "extension"
  | "arcade"
  | "custom";

export const SECTIONS: Section[] = ["websites", "webapps", "ai", "mobile", "desktop", "developer", "games", "starter"];

export interface BuiltinTemplate extends RideTemplate {
  archetype: ArchetypeId;
  familyId: string;
  variantIndex: number;
  accent: string;
  emoji: string;
}

function q(question: Omit<TemplateQuestion, "required">): TemplateQuestion {
  return { required: false, ...question };
}

interface Family {
  id: string;
  name: string;
  section: Section;
  emoji: string;
  archetype: ArchetypeId;
  tagline: string;
  features: string[];
  questions?: TemplateQuestion[];
  brief: string;
  prompt: string;
  variants: string[];
}

type Stack = { framework: string; styling: string; ui: string; icons: string; animation: string };

const REACT_STACK: Stack = {
  framework: "React + Vite",
  styling: "Tailwind CSS",
  ui: "Custom components",
  icons: "lucide-react",
  animation: "CSS + Motion",
};

const NODE_STACK: Stack = {
  framework: "Node.js + TypeScript",
  styling: "—",
  ui: "—",
  icons: "—",
  animation: "—",
};

const STACK: Record<ArchetypeId, Stack> = {
  portfolio: REACT_STACK,
  saas: REACT_STACK,
  landing: REACT_STACK,
  blog: REACT_STACK,
  docs: REACT_STACK,
  dashboard: REACT_STACK,
  ecommerce: REACT_STACK,
  social: REACT_STACK,
  "ai-app": REACT_STACK,
  pwa: REACT_STACK,
  arcade: REACT_STACK,
  custom: REACT_STACK,
  api: { framework: "Node.js + Express", styling: "—", ui: "—", icons: "—", animation: "—" },
  cli: NODE_STACK,
  package: NODE_STACK,
  extension: { framework: "JavaScript (MV3)", styling: "—", ui: "—", icons: "—", animation: "—" },
};

const FAMILIES: Family[] = [
  // ─── Websites ────────────────────────────────────────────────────────────
  {
    id: "portfolio",
    name: "Portfolio",
    section: "websites",
    emoji: "🧑‍🎨",
    archetype: "portfolio",
    tagline: "Personal site with hero, about, projects, experience, contact and resume.",
    features: ["Responsive", "Dark mode", "Projects grid", "Experience timeline", "Contact", "SEO-ready"],
    questions: [
      { id: "name", label: "What's your name?", kind: "text", placeholder: "Ada Lovelace", required: true },
      { id: "role", label: "What do you do?", kind: "text", placeholder: "VLSI engineer", required: true },
      q({ id: "style", label: "Choose a style", kind: "select", options: ["Minimal", "Premium", "Creative", "Technical", "Corporate"], defaultValue: "Minimal" }),
      q({ id: "darkMode", label: "Dark mode?", kind: "select", options: ["Yes", "No"], defaultValue: "Yes" }),
    ],
    brief:
      "Portfolio starter scaffolded by RIDE. Replace placeholder personal content (name, role, bio, projects, contact) with the user's details. Keep the React + Vite + Tailwind stack and ensure responsiveness and dark mode.",
    prompt:
      "Customize this portfolio starter for {name}, a {role}. Style: {style}, dark mode: {darkMode}. Replace the placeholder name, role, about text, projects, experience and contact details with plausible real content for {name}. Keep the React + Vite + Tailwind stack and the overall layout.",
    variants: ["Minimal Developer", "Creative Designer", "VLSI Engineer", "AI/ML Engineer", "Full-Stack Developer", "3D Creative", "Cinematic Dark", "Editorial Portfolio", "Freelancer Portfolio", "Executive Professional"],
  },
  {
    id: "agency",
    name: "Agency",
    section: "websites",
    emoji: "🏢",
    archetype: "landing",
    tagline: "Studio site — services, case studies, team, process, contact.",
    features: ["Services", "Case studies", "Team grid", "Process section", "Contact", "Dark mode"],
    brief:
      "Agency marketing starter scaffolded by RIDE (landing archetype). Replace placeholder services, cases, team and contact content with the user's agency. Keep the React + Vite + Tailwind stack.",
    prompt:
      "Customize this agency starter into a {name} site. Replace placeholder branding, services, case studies, team and contact copy with plausible content. Keep the React + Vite + Tailwind stack.",
    variants: ["Digital Studio", "Creative Agency", "AI Agency", "Software Agency", "Marketing Agency", "Branding Studio", "Architecture Studio", "Design Agency", "Consulting Agency", "Production House"],
  },
  {
    id: "startup",
    name: "Startup",
    section: "websites",
    emoji: "🚀",
    archetype: "saas",
    tagline: "Launch site — pitch, investors section, features, pricing, waitlist.",
    features: ["Pitch hero", "Logos", "Features", "Pricing", "Waitlist", "Dark mode"],
    brief:
      "Startup launch starter scaffolded by RIDE (SaaS archetype). Replace placeholder pitch, features, pricing and waitlist copy with the user's startup. Keep the React + Vite + Tailwind stack.",
    prompt:
      "Customize this startup template for a {name} — a promising early-stage product. Replace the placeholder pitch, feature list, pricing tiers and waitlist CTA with plausible content. Keep the React + Vite + Tailwind stack.",
    variants: ["SaaS Startup", "AI Startup", "Fintech Startup", "HealthTech Startup", "EdTech Startup", "DevTools Startup", "ClimateTech Startup", "Consumer App Startup", "DeepTech Startup", "Enterprise Startup"],
  },
  {
    id: "blog",
    name: "Blog",
    section: "websites",
    emoji: "✍️",
    archetype: "blog",
    tagline: "Editorial blog — featured post, article grid, categories, newsletter.",
    features: ["Featured post", "Article grid", "Categories", "Newsletter", "Reading list", "Dark mode"],
    brief:
      "Blog starter scaffolded by RIDE. Contains a featured post, article grid, category filters and newsletter signup. Replace placeholder posts with the user's content. Keep the React + Vite + Tailwind stack.",
    prompt:
      "Customize this blog starter as {name}. Replace the placeholder featured post, article grid and category list with plausible posts for this blog's voice. Keep the React + Vite + Tailwind stack.",
    variants: ["Modern Editorial", "Tech Journal", "Personal Stories", "Developer Blog", "AI Research Blog", "Travel Journal", "Business Magazine", "Minimal Blog", "Newsroom", "Visual Magazine"],
  },
  {
    id: "documentation",
    name: "Documentation",
    section: "websites",
    emoji: "📚",
    archetype: "docs",
    tagline: "Docs site — sidebar table of contents, search, code blocks, next links.",
    features: ["Sidebar TOC", "Search box", "Code blocks", "Prev/next nav", "Versions", "Dark mode"],
    brief:
      "Documentation starter scaffolded by RIDE. Contains a sidebar table of contents, search, code block styling and prev/next pagination. Replace placeholder docs with the user's documentation. Keep the React + Vite + Tailwind stack.",
    prompt:
      "Turn this documentation starter into docs for {name}. Replace the placeholder sections, code samples and sidebar TOC with plausible documentation for this product. Keep the React + Vite + Tailwind stack.",
    variants: ["Developer Docs", "API Documentation", "Open Source Docs", "SDK Documentation", "Product Documentation", "Knowledge Base", "AI Model Docs", "Component Docs", "Technical Manual", "Enterprise Documentation"],
  },
  {
    id: "personal",
    name: "Personal",
    section: "websites",
    emoji: "🙋",
    archetype: "portfolio",
    tagline: "Personal page — bio, links, journal entries, photos.",
    features: ["Bio", "Link-in-bio", "Journal", "Photos", "Contact", "Dark mode"],
    brief:
      "Personal site starter scaffolded by RIDE (portfolio archetype). Replace placeholder bio, links and journal entries with the user's real details. Keep the React + Vite + Tailwind stack.",
    prompt:
      "Build a {name} personal page from this starter. Replace the placeholder bio, link sections and journal entries with plausible personal content. Keep the React + Vite + Tailwind stack.",
    variants: ["Personal Profile", "Digital Resume", "Creator Profile", "Student Profile", "Professional Profile", "Personal Journal", "Online CV", "Personal Brand", "Digital Garden", "Life Dashboard"],
  },
  {
    id: "restaurant",
    name: "Restaurant",
    section: "websites",
    emoji: "🍽️",
    archetype: "landing",
    tagline: "Restaurant site — menu, reservations, gallery, reviews, location.",
    features: ["Menu", "Reservations", "Gallery", "Reviews", "Location map", "Dark mode"],
    brief:
      "Restaurant starter scaffolded by RIDE (landing archetype). Replace placeholder menu, gallery, reviews and reservation copy with the user's restaurant. Keep the React + Vite + Tailwind stack.",
    prompt:
      "Turn this landing starter into a {name} site. Replace the placeholder hero, menu items, gallery and reviews with plausible restaurant content. Keep the React + Vite + Tailwind stack.",
    variants: ["Fine Dining", "Modern Bistro", "Indian Restaurant", "Cafe", "Street Food", "Cloud Kitchen", "Bakery", "Pizza Restaurant", "Multi-Cuisine", "Restaurant Booking"],
  },
  {
    id: "hotel",
    name: "Hotel",
    section: "websites",
    emoji: "🏨",
    archetype: "landing",
    tagline: "Hotel site — rooms, amenities, gallery, booking, location.",
    features: ["Rooms", "Amenities", "Gallery", "Booking flow", "Location", "Dark mode"],
    brief:
      "Hotel starter scaffolded by RIDE (landing archetype). Replace placeholder rooms, amenities and booking copy with the user's property. Keep the React + Vite + Tailwind stack.",
    prompt:
      "Turn this landing starter into a {name} site. Replace the placeholder hero, room cards, amenities and booking CTA with plausible hotel content. Keep the React + Vite + Tailwind stack.",
    variants: ["Luxury Hotel", "Boutique Hotel", "Resort", "Business Hotel", "Beach Resort", "Mountain Lodge", "Heritage Hotel", "Budget Hotel", "Villa Booking", "Hotel Chain"],
  },
  {
    id: "event",
    name: "Event",
    section: "websites",
    emoji: "🎪",
    archetype: "landing",
    tagline: "Event site — agenda, speakers, tickets, venue, sponsors.",
    features: ["Agenda", "Speakers", "Tickets", "Venue", "Sponsors", "Dark mode"],
    brief:
      "Event starter scaffolded by RIDE (landing archetype). Replace placeholder agenda, speakers, tickets and venue copy with the user's event. Keep the React + Vite + Tailwind stack.",
    prompt:
      "Turn this landing starter into a {name} event site. Replace the placeholder agenda, speaker cards, ticket tiers and venue info with plausible event content. Keep the React + Vite + Tailwind stack.",
    variants: ["Conference", "Tech Conference", "Wedding", "Music Festival", "Hackathon", "Startup Event", "Workshop", "Exhibition", "Sports Event", "Networking Event"],
  },
  {
    id: "education",
    name: "Education",
    section: "websites",
    emoji: "🎓",
    archetype: "landing",
    tagline: "Institution site — programs, admissions, campus, faculty, events.",
    features: ["Programs", "Admissions", "Campus", "Faculty", "Events", "Dark mode"],
    brief:
      "Education starter scaffolded by RIDE (landing archetype). Replace placeholder programs, admissions and faculty copy with the user's institution. Keep the React + Vite + Tailwind stack.",
    prompt:
      "Turn this landing starter into a {name} institution site. Replace the placeholder hero, program cards, admissions info and faculty with plausible educational content. Keep the React + Vite + Tailwind stack.",
    variants: ["University", "College", "Online Academy", "Coding School", "Course Platform", "Coaching Institute", "School", "Research Institute", "Student Portal", "Educational Organization"],
  },
  {
    id: "healthcare",
    name: "Healthcare",
    section: "websites",
    emoji: "🩺",
    archetype: "landing",
    tagline: "Care site — services, doctors, appointments, insurance, testimonials.",
    features: ["Services", "Doctors", "Appointments", "Insurance info", "Testimonials", "Dark mode"],
    brief:
      "Healthcare starter scaffolded by RIDE (landing archetype). Replace placeholder services, doctors and booking copy with the user's practice. Keep the React + Vite + Tailwind stack.",
    prompt:
      "Turn this landing starter into a {name} healthcare site. Replace the placeholder hero, service cards, doctor profiles and appointment CTAs with plausible content. Keep the React + Vite + Tailwind stack.",
    variants: ["Hospital", "Clinic", "Doctor Portfolio", "Dental Clinic", "Diagnostics Center", "Telemedicine", "Mental Wellness", "Pharmacy", "Medical Research", "Healthcare Startup"],
  },
  {
    id: "real-estate",
    name: "Real Estate",
    section: "websites",
    emoji: "🏡",
    archetype: "landing",
    tagline: "Property site — listings, search, agents, financing, contact.",
    features: ["Listings", "Search", "Agents", "Financing", "Contact", "Dark mode"],
    brief:
      "Real estate starter scaffolded by RIDE (landing archetype). Replace placeholder listings, agents and search copy with the user's agency. Keep the React + Vite + Tailwind stack.",
    prompt:
      "Turn this landing starter into a {name} real estate site. Replace the placeholder listings, agent cards, search bar and financing info with plausible property content. Keep the React + Vite + Tailwind stack.",
    variants: ["Property Marketplace", "Luxury Properties", "Real Estate Agency", "Apartment Listings", "Commercial Property", "Property Developer", "Rental Platform", "Vacation Homes", "Property Investment", "Real Estate Agent"],
  },
  {
    id: "finance",
    name: "Finance",
    section: "websites",
    emoji: "💹",
    archetype: "landing",
    tagline: "Finance site — offerings, advisors, tools, insights, contact.",
    features: ["Offerings", "Advisors", "Tools", "Insights", "Compliance footer", "Dark mode"],
    brief:
      "Finance starter scaffolded by RIDE (landing archetype). Replace placeholder offerings, advisors and tooling copy with the user's firm. Keep the React + Vite + Tailwind stack.",
    prompt:
      "Turn this landing starter into a {name} finance site. Replace the placeholder hero, offering cards, advisor profiles and tools with plausible financial content. Keep the React + Vite + Tailwind stack.",
    variants: ["Fintech", "Investment Firm", "Personal Finance", "Banking", "Digital Wallet", "Accounting Firm", "Crypto Dashboard", "Insurance", "Wealth Management", "Financial Consultant"],
  },

  // ─── Web applications ────────────────────────────────────────────────────
  {
    id: "saas",
    name: "SaaS",
    section: "webapps",
    emoji: "🛠️",
    archetype: "saas",
    tagline: "SaaS product — marketing hero, features, pricing tiers, dashboard shell.",
    features: ["Landing hero", "Feature grid", "Pricing tiers", "CTA footer", "Auth-ready", "Dark mode"],
    questions: [
      { id: "product", label: "Product name", kind: "text", placeholder: "Acme", required: true },
      { id: "audience", label: "Who is it for?", kind: "text", placeholder: "Engineering teams", required: true },
      q({ id: "style", label: "Choose a style", kind: "select", options: ["Minimal", "Bold", "Corporate"], defaultValue: "Minimal" }),
    ],
    brief:
      "SaaS starter scaffolded by RIDE. Contains a navbar, hero, feature grid, pricing tiers and footer. Replace placeholder branding and copy with the user's product details. Keep the React + Vite + Tailwind stack.",
    prompt:
      "Customize this SaaS starter for {product}, a product for {audience}. Style: {style}. Replace placeholder branding, hero copy, feature names and pricing tiers with plausible content for {product}. Keep the React + Vite + Tailwind stack.",
    variants: ["AI SaaS", "Project SaaS", "Analytics SaaS", "Marketing SaaS", "HR SaaS", "Finance SaaS", "Sales SaaS", "Developer SaaS", "Productivity SaaS", "Enterprise SaaS"],
  },
  {
    id: "crm",
    name: "CRM",
    section: "webapps",
    emoji: "🤝",
    archetype: "dashboard",
    tagline: "CRM shell — pipeline, deal table, contact cards, activity feed.",
    features: ["Pipeline view", "Deal table", "Contacts", "Activity feed", "Filters", "Dark mode"],
    brief:
      "CRM starter scaffolded by RIDE (dashboard archetype). Replace placeholder pipeline, deals and contacts with the user's domain. Keep the React + Vite + Tailwind stack.",
    prompt:
      "Customize this CRM starter into a {name}. Replace the placeholder pipeline stages, deal rows and contact cards with plausible CRM content for this business. Keep the React + Vite + Tailwind stack.",
    variants: ["Sales CRM", "Startup CRM", "Real Estate CRM", "Agency CRM", "Healthcare CRM", "Education CRM", "Support CRM", "Enterprise CRM", "Freelancer CRM", "AI CRM"],
  },
  {
    id: "erp",
    name: "ERP",
    section: "webapps",
    emoji: "🏭",
    archetype: "dashboard",
    tagline: "ERP shell — modules, inventory, orders, finance, employees.",
    features: ["Module grid", "Inventory", "Orders", "Finance tab", "Employees", "Dark mode"],
    brief:
      "ERP starter scaffolded by RIDE (dashboard archetype). Replace placeholder modules, inventory and orders with the user's operations. Keep the React + Vite + Tailwind stack.",
    prompt:
      "Customize this ERP starter into a {name}. Replace the placeholder module grid, inventory items and order table with plausible ERP content for this business. Keep the React + Vite + Tailwind stack.",
    variants: ["Business ERP", "Manufacturing ERP", "Retail ERP", "School ERP", "Hospital ERP", "Restaurant ERP", "Construction ERP", "Inventory ERP", "Enterprise ERP", "Small Business ERP"],
  },
  {
    id: "admin-panel",
    name: "Admin Panel",
    section: "webapps",
    emoji: "🛂",
    archetype: "dashboard",
    tagline: "Admin shell — sidebar, KPIs, tables, user management, settings.",
    features: ["Sidebar nav", "KPI cards", "Data tables", "User management", "Role chips", "Dark mode"],
    brief:
      "Admin panel starter scaffolded by RIDE (dashboard archetype). Replace placeholder tables and KPIs with the user's domain. Keep the React + Vite + Tailwind stack.",
    prompt:
      "Customize this admin panel starter into a {name}. Replace the placeholder sidebar links, KPI cards and table rows with plausible admin content. Keep the React + Vite + Tailwind stack.",
    variants: ["Modern Admin", "SaaS Admin", "E-commerce Admin", "Healthcare Admin", "Education Admin", "Finance Admin", "CRM Admin", "Analytics Admin", "Content Admin", "Enterprise Admin"],
  },
  {
    id: "analytics",
    name: "Analytics",
    section: "webapps",
    emoji: "📊",
    archetype: "dashboard",
    tagline: "Analytics shell — charts, funnels, reports, filters, exports.",
    features: ["Charts", "Funnel view", "Reports", "Date filters", "Export", "Dark mode"],
    brief:
      "Analytics starter scaffolded by RIDE (dashboard archetype). Replace placeholder charts and metrics with the user's data. Keep the React + Vite + Tailwind stack.",
    prompt:
      "Customize this analytics starter into a {name}. Replace the placeholder KPI cards, charts and table data with plausible analytics content for this domain. Keep the React + Vite + Tailwind stack.",
    variants: ["Business Analytics", "Marketing Analytics", "Sales Analytics", "Product Analytics", "Financial Analytics", "Website Analytics", "AI Analytics", "Social Analytics", "Operations Analytics", "Real-Time Analytics"],
  },
  {
    id: "project-management",
    name: "Project Management",
    section: "webapps",
    emoji: "📋",
    archetype: "dashboard",
    tagline: "PM shell — boards, tasks, timelines, teams, priorities.",
    features: ["Kanban board", "Task cards", "Timeline", "Team avatars", "Priorities", "Dark mode"],
    brief:
      "Project management starter scaffolded by RIDE (dashboard archetype). Replace placeholder boards and tasks with the user's workflow. Keep the React + Vite + Tailwind stack.",
    prompt:
      "Customize this project management starter into a {name}. Replace the placeholder kanban columns, task cards and priority labels with plausible PM content. Keep the React + Vite + Tailwind stack.",
    variants: ["Kanban", "Agile Workspace", "Team Projects", "Product Roadmap", "Startup Management", "Agency Projects", "Engineering Projects", "Construction Projects", "Personal Tasks", "Enterprise Projects"],
  },
  {
    id: "ecommerce",
    name: "E-commerce",
    section: "webapps",
    emoji: "🛍️",
    archetype: "ecommerce",
    tagline: "Store — product grid, detail, cart drawer, checkout, categories.",
    features: ["Product grid", "Product detail", "Cart drawer", "Checkout", "Categories", "Dark mode"],
    questions: [
      { id: "store", label: "Store name", kind: "text", placeholder: "Northwind", required: true },
      q({ id: "category", label: "What do you sell?", kind: "select", options: ["Fashion", "Electronics", "Home & living", "Beauty", "General"], defaultValue: "General" }),
    ],
    brief:
      "E-commerce starter scaffolded by RIDE. Contains a product grid, product detail view, cart and checkout. Replace placeholder products and branding with the user's store. Keep the React + Vite + Tailwind stack.",
    prompt:
      "Customize this e-commerce starter for {store}, selling {category}. Replace placeholder product data, branding and copy with plausible content for {store}. Keep the React + Vite + Tailwind stack.",
    variants: ["Fashion Store", "Electronics Store", "Grocery Store", "Furniture Store", "Beauty Store", "Digital Products", "Luxury Store", "Sports Store", "Automotive Store", "Multi-Category Store"],
  },
  {
    id: "marketplace",
    name: "Marketplace",
    section: "webapps",
    emoji: "🛒",
    archetype: "ecommerce",
    tagline: "Marketplace — listing grid, seller cards, search, checkout.",
    features: ["Listing grid", "Seller cards", "Search", "Categories", "Checkout", "Dark mode"],
    brief:
      "Marketplace starter scaffolded by RIDE (ecommerce archetype). Replace placeholder listings and sellers with the user's marketplace. Keep the React + Vite + Tailwind stack.",
    prompt:
      "Customize this marketplace starter into a {name}. Replace the placeholder listing grid and seller cards with plausible marketplace content. Keep the React + Vite + Tailwind stack.",
    variants: ["Freelance Marketplace", "Job Marketplace", "Property Marketplace", "Service Marketplace", "Product Marketplace", "Creator Marketplace", "Course Marketplace", "Vehicle Marketplace", "B2B Marketplace", "Local Marketplace"],
  },
  {
    id: "social-network",
    name: "Social Network",
    section: "webapps",
    emoji: "👥",
    archetype: "social",
    tagline: "Community app — feed, post composer, profiles, notifications.",
    features: ["Post feed", "Composer", "Profiles", "Notifications", "Reactions", "Dark mode"],
    brief:
      "Social starter scaffolded by RIDE. Contains a post feed, composer and profile sidebar. Replace placeholder posts and profiles with the user's community. Keep the React + Vite + Tailwind stack.",
    prompt:
      "Customize this social starter into a {name}. Replace the placeholder feed posts, composer and profile cards with plausible community content. Keep the React + Vite + Tailwind stack.",
    variants: ["Community", "Professional Network", "Creator Network", "Student Network", "Developer Community", "Gaming Community", "Interest Community", "Private Social", "Photo Sharing", "Discussion Platform"],
  },
  {
    id: "learning-platform",
    name: "Learning Platform",
    section: "webapps",
    emoji: "🧠",
    archetype: "dashboard",
    tagline: "Learning app — course list, progress, lessons, quizzes, certificates.",
    features: ["Course list", "Progress bars", "Lesson view", "Quizzes", "Certificates", "Dark mode"],
    brief:
      "Learning platform starter scaffolded by RIDE (dashboard archetype). Replace placeholder courses and progress with the user's curriculum. Keep the React + Vite + Tailwind stack.",
    prompt:
      "Customize this learning platform starter into a {name}. Replace the placeholder course cards, progress bars and lesson list with plausible learning content. Keep the React + Vite + Tailwind stack.",
    variants: ["Online Academy", "Coding Platform", "University LMS", "School LMS", "Skill Learning", "Language Learning", "Exam Preparation", "AI Tutor", "Corporate Training", "Course Marketplace"],
  },

  // ─── AI applications ─────────────────────────────────────────────────────
  {
    id: "ai-chatbot",
    name: "AI Chatbot",
    section: "ai",
    emoji: "🤖",
    archetype: "ai-app",
    tagline: "Chat shell — conversations, message bubbles, streaming, suggestions.",
    features: ["Chat UI", "Streaming-ready", "Conversation list", "Prompt suggestions", "Typing indicator", "Dark mode"],
    questions: [
      { id: "appName", label: "App name", kind: "text", placeholder: "Copilot", required: true },
      q({ id: "persona", label: "Assistant persona", kind: "select", options: ["General assistant", "Coding copilot", "Writer", "Research"], defaultValue: "General assistant" }),
    ],
    brief:
      "AI chat starter scaffolded by RIDE. Contains a chat shell with message bubbles, a typing indicator and a prompt input. Replace placeholder branding and examples with the user's app. Keep the React + Vite + Tailwind stack.",
    prompt:
      "Customize this AI chat starter for {appName}, a {persona}. Replace placeholder branding, welcome message and example prompts with plausible content for {appName}. Keep the React + Vite + Tailwind stack.",
    variants: ["AI Assistant", "Customer Chatbot", "Enterprise Chat", "Document Chat", "Code Assistant", "Research Assistant", "Education Tutor", "Healthcare Assistant", "Travel Assistant", "Personal AI"],
  },
  {
    id: "rag",
    name: "RAG",
    section: "ai",
    emoji: "🧩",
    archetype: "ai-app",
    tagline: "Retrieval app shell — document library, chat, sources panel.",
    features: ["Document library", "Chat with sources", "Citations", "Upload area", "Dark mode"],
    brief:
      "RAG starter scaffolded by RIDE. Based on the AI chat shell with a document library sidebar; wire retrieval + citations. Replace placeholder docs and sources with the user's knowledge base. Keep the React + Vite + Tailwind stack.",
    prompt:
      "Customize this RAG starter into a {name}. Replace the placeholder document library and chat content with plausible retrieval examples (PDFs, internal docs). Add a sources/citations panel. Keep the React + Vite + Tailwind stack.",
    variants: ["PDF Knowledge Base", "Company Knowledge AI", "Research RAG", "Legal Document RAG", "Technical Docs RAG", "University Knowledge Base", "Support RAG", "Financial Research RAG", "Medical Literature RAG", "Multi-Document AI"],
  },
  {
    id: "ai-agent",
    name: "AI Agent",
    section: "ai",
    emoji: "🦾",
    archetype: "ai-app",
    tagline: "Agent console — runs, tool calls, logs, targets, config.",
    features: ["Run console", "Tool timeline", "Logs", "Targets", "Config panel", "Dark mode"],
    brief:
      "AI agent console starter scaffolded by RIDE. Based on the chat shell, shaped as a task/run console with a tool-use timeline. Replace placeholder runs with the user's agent workflow. Keep the React + Vite + Tailwind stack.",
    prompt:
      "Customize this agent console starter into a {name}. Shape the chat shell into a run console: tasks, tool calls, logs and results. Replace placeholder content with plausible agent workflow examples. Keep the React + Vite + Tailwind stack.",
    variants: ["Research Agent", "Coding Agent", "Sales Agent", "Marketing Agent", "Support Agent", "Travel Agent", "Recruitment Agent", "Data Agent", "Business Agent", "Personal Automation Agent"],
  },
  {
    id: "ai-saas",
    name: "AI SaaS",
    section: "ai",
    emoji: "✨",
    archetype: "saas",
    tagline: "AI product shell — marketing + app demo, pricing, credits.",
    features: ["Pitch hero", "Live demo", "Pricing with credits", "Waitlist", "Dark mode"],
    brief:
      "AI SaaS starter scaffolded by RIDE (SaaS archetype). Replace placeholder pitch, demo and pricing with the user's AI product. Keep the React + Vite + Tailwind stack.",
    prompt:
      "Customize this AI SaaS template for a {name}. Replace the placeholder hero, demo embed, credit-based pricing tiers and CTA with plausible content. Keep the React + Vite + Tailwind stack.",
    variants: ["AI Writing SaaS", "AI Design SaaS", "AI Video SaaS", "AI Marketing SaaS", "AI Sales SaaS", "AI Recruiting SaaS", "AI Analytics SaaS", "AI Research SaaS", "AI Support SaaS", "AI Developer SaaS"],
  },
  {
    id: "document-analyzer",
    name: "Document Analyzer",
    section: "ai",
    emoji: "🔍",
    archetype: "ai-app",
    tagline: "Analyzer shell — upload, extraction pane, insights, exports.",
    features: ["Upload", "Extraction pane", "Insights", "Export", "Dark mode"],
    brief:
      "Document analyzer starter scaffolded by RIDE. Based on the AI chat shell with an upload area and an extraction/insights pane. Replace placeholder documents with the user's domain. Keep the React + Vite + Tailwind stack.",
    prompt:
      "Customize this analyzer starter into a {name}. Shape the shell for upload → extraction → insights → export. Replace placeholder document examples with plausible domain content. Keep the React + Vite + Tailwind stack.",
    variants: ["PDF Analyzer", "Contract Analyzer", "Resume Analyzer", "Invoice Analyzer", "Paper Analyzer", "Financial Report Analyzer", "Legal Doc Analyzer", "Academic Doc Analyzer", "Business Doc Analyzer", "Multi-Format Analyzer"],
  },
  {
    id: "ai-customer-support",
    name: "AI Customer Support",
    section: "ai",
    emoji: "🎧",
    archetype: "ai-app",
    tagline: "Support shell — tickets, live chat, KB answers, handoff.",
    features: ["Ticket list", "Live chat", "KB answers", "Handoff", "Dark mode"],
    brief:
      "AI support starter scaffolded by RIDE. Based on the AI chat shell with a ticket list and KB panel. Replace placeholder tickets and answers with the user's support domain. Keep the React + Vite + Tailwind stack.",
    prompt:
      "Customize this support starter into a {name}. Shape the shell for tickets + live chat + KB answers + human handoff. Replace placeholder content with plausible support examples. Keep the React + Vite + Tailwind stack.",
    variants: ["AI Helpdesk", "AI Ticketing", "AI Live Chat", "AI Voice Support", "AI Email Support", "AI Knowledge Support", "AI E-commerce Support", "AI SaaS Support", "AI Enterprise Support", "AI Omnichannel Support"],
  },
  {
    id: "ai-search",
    name: "AI Search",
    section: "ai",
    emoji: "🔎",
    archetype: "ai-app",
    tagline: "Search shell — query bar, results, sources, filters.",
    features: ["Query bar", "Results list", "Sources", "Filters", "Dark mode"],
    brief:
      "AI search starter scaffolded by RIDE. Based on the AI chat shell, shaped as query → results → sources. Replace placeholder results with the user's search domain. Keep the React + Vite + Tailwind stack.",
    prompt:
      "Customize this search starter into a {name}. Shape the shell for query bar, result cards, source citations and filters. Replace placeholder content with plausible search examples. Keep the React + Vite + Tailwind stack.",
    variants: ["AI Web Search", "AI Research Search", "Enterprise Search", "Document Search", "Code Search", "Academic Search", "Product Search", "Semantic Search", "Multimodal Search", "AI Knowledge Search"],
  },

  // ─── Mobile ──────────────────────────────────────────────────────────────
  {
    id: "mobile-social",
    name: "Mobile Social",
    section: "mobile",
    emoji: "📱",
    archetype: "pwa",
    tagline: "Mobile-first PWA — feed, bottom tabs, compose, notifications.",
    features: ["Mobile-first", "Bottom tabs", "Feed", "Compose", "PWA-ready", "Dark mode"],
    brief:
      "Mobile social starter scaffolded by RIDE (PWA archetype). Touch-first layout with bottom navigation and a feed. Replace placeholder posts and profiles with the user's community. Keep the React + Vite + Tailwind stack.",
    prompt:
      "Customize this mobile social starter into a {name}. Replace the placeholder feed, bottom tab labels and compose sheet with plausible community content. Keep the mobile-first PWA shape.",
    variants: ["Social Feed", "Community App", "Creator App", "Messaging App", "Photo Sharing", "Professional Network", "Student Community", "Local Community", "Interest Network", "Private Social"],
  },
  {
    id: "mobile-fitness",
    name: "Mobile Fitness",
    section: "mobile",
    emoji: "💪",
    archetype: "pwa",
    tagline: "Mobile-first PWA — activity rings, workouts, streaks, stats.",
    features: ["Mobile-first", "Activity rings", "Workout log", "Streaks", "PWA-ready", "Dark mode"],
    brief:
      "Mobile fitness starter scaffolded by RIDE (PWA archetype). Touch-first layout with activity rings and a workout log. Replace placeholder stats with the user's fitness domain. Keep the React + Vite + Tailwind stack.",
    prompt:
      "Customize this mobile fitness starter into a {name}. Replace the placeholder activity rings, workout entries and streak cards with plausible fitness content. Keep the mobile-first PWA shape.",
    variants: ["Workout Tracker", "Gym App", "Running Tracker", "Yoga App", "Nutrition Tracker", "Personal Trainer", "Meditation App", "Sports Training", "Fitness Community", "AI Fitness Coach"],
  },
  {
    id: "mobile-finance",
    name: "Mobile Finance",
    section: "mobile",
    emoji: "💰",
    archetype: "pwa",
    tagline: "Mobile-first PWA — balance, transactions, budgets, insights.",
    features: ["Mobile-first", "Balance card", "Transactions", "Budgets", "PWA-ready", "Dark mode"],
    brief:
      "Mobile finance starter scaffolded by RIDE (PWA archetype). Touch-first layout with a balance card and transaction list. Replace placeholder amounts with the user's finance domain. Keep the React + Vite + Tailwind stack.",
    prompt:
      "Customize this mobile finance starter into a {name}. Replace the placeholder balance, transaction rows and budget bars with plausible finance content. Keep the mobile-first PWA shape.",
    variants: ["Expense Tracker", "Budget Planner", "Investment Tracker", "Banking App", "Digital Wallet", "Bill Manager", "Savings App", "Portfolio Tracker", "Finance Dashboard", "Personal Finance AI"],
  },
  {
    id: "mobile-ecommerce",
    name: "Mobile E-commerce",
    section: "mobile",
    emoji: "🛒",
    archetype: "pwa",
    tagline: "Mobile-first PWA — catalog, product cards, cart, checkout.",
    features: ["Mobile-first", "Catalog", "Product cards", "Cart", "PWA-ready", "Dark mode"],
    brief:
      "Mobile e-commerce starter scaffolded by RIDE (PWA archetype). Touch-first layout with a product catalog and cart. Replace placeholder products with the user's store. Keep the React + Vite + Tailwind stack.",
    prompt:
      "Customize this mobile shopping starter into a {name}. Replace the placeholder catalog, product cards and cart items with plausible store content. Keep the mobile-first PWA shape.",
    variants: ["Fashion Shopping", "Grocery", "Electronics", "Food Delivery", "Beauty", "Furniture", "Marketplace", "Digital Products", "Local Shopping", "Luxury Shopping"],
  },
  {
    id: "mobile-productivity",
    name: "Mobile Productivity",
    section: "mobile",
    emoji: "⏱️",
    archetype: "pwa",
    tagline: "Mobile-first PWA — tasks, notes, habits, focus timer, goals.",
    features: ["Mobile-first", "Tasks", "Habit streaks", "Focus timer", "PWA-ready", "Dark mode"],
    brief:
      "Mobile productivity starter scaffolded by RIDE (PWA archetype). Touch-first layout with tasks, habits and a focus timer. Replace placeholder items with the user's workflow. Keep the React + Vite + Tailwind stack.",
    prompt:
      "Customize this mobile productivity starter into a {name}. Replace the placeholder task list, habit rows and timer with plausible productivity content. Keep the mobile-first PWA shape.",
    variants: ["To-Do", "Notes", "Calendar", "Habit Tracker", "Time Tracker", "Pomodoro", "Project Manager", "Personal Knowledge Base", "Goal Tracker", "AI Productivity Assistant"],
  },
  {
    id: "mobile-education",
    name: "Mobile Education",
    section: "mobile",
    emoji: "🎒",
    archetype: "pwa",
    tagline: "Mobile-first PWA — courses, lessons, flashcards, progress.",
    features: ["Mobile-first", "Courses", "Lessons", "Flashcards", "PWA-ready", "Dark mode"],
    brief:
      "Mobile education starter scaffolded by RIDE (PWA archetype). Touch-first layout with a course list and flashcard deck. Replace placeholder content with the user's curriculum. Keep the React + Vite + Tailwind stack.",
    prompt:
      "Customize this mobile education starter into a {name}. Replace the placeholder course list and flashcard content with plausible learning material. Keep the mobile-first PWA shape.",
    variants: ["Learning App", "Language Learning", "Exam Prep", "Flashcards", "AI Tutor", "Coding Education", "University Companion", "School App", "Course App", "Skill Tracker"],
  },

  // ─── Desktop ─────────────────────────────────────────────────────────────
  {
    id: "dev-tools",
    name: "Developer Tools",
    section: "desktop",
    emoji: "🧰",
    archetype: "pwa",
    tagline: "Desktop-style tool — panels, command palette, keyboard-first.",
    features: ["Desktop-style panels", "Keyboard-first", "Command palette", "Split views", "Dark mode"],
    brief:
      "Developer tool starter scaffolded by RIDE. Desktop-style panel layout; the agent can wrap it in Electron/Tauri on request. Replace placeholder panels with the user's tool. Keep the React + Vite + Tailwind stack.",
    prompt:
      "Customize this developer tool starter into a {name}. Shape the panels around the tool's core workflow (inspect, edit, run, monitor). Replace placeholder content with plausible examples. Keep the desktop-style layout.",
    variants: ["API Client", "Database Manager", "Git Client", "JSON Editor", "Markdown Editor", "Code Formatter", "Log Viewer", "API Monitor", "Developer Dashboard", "Local AI Assistant"],
  },
  {
    id: "desktop-productivity",
    name: "Desktop Productivity",
    section: "desktop",
    emoji: "🗂️",
    archetype: "pwa",
    tagline: "Desktop-style app — sidebar, document list, editor, shortcuts.",
    features: ["Sidebar nav", "Document list", "Editor view", "Shortcuts", "Dark mode"],
    brief:
      "Desktop productivity starter scaffolded by RIDE. Desktop-style layout with a sidebar and document view. Replace placeholder documents with the user's workflow. Keep the React + Vite + Tailwind stack.",
    prompt:
      "Customize this desktop productivity starter into a {name}. Replace the placeholder sidebar sections and document view with plausible productivity content. Keep the desktop-style layout.",
    variants: ["Notes App", "Task Manager", "Calendar", "Project Manager", "Personal Knowledge Base", "Time Tracker", "Focus App", "Document Manager", "Workspace", "AI Productivity Desktop"],
  },
  {
    id: "media",
    name: "Media",
    section: "desktop",
    emoji: "🎬",
    archetype: "pwa",
    tagline: "Media app — library, player panel, playlists, metadata.",
    features: ["Library grid", "Player panel", "Playlists", "Metadata", "Dark mode"],
    brief:
      "Media app starter scaffolded by RIDE. Desktop-style library and player panel layout. Replace placeholder media with the user's library. Keep the React + Vite + Tailwind stack.",
    prompt:
      "Customize this media app starter into a {name}. Replace the placeholder library grid, player panel and playlists with plausible media content. Keep the desktop-style layout.",
    variants: ["Video Player", "Audio Player", "Music Manager", "Photo Manager", "Video Editor", "Audio Editor", "Screen Recorder", "Podcast Manager", "Media Converter", "Streaming Dashboard"],
  },
  {
    id: "file-manager",
    name: "File Manager",
    section: "desktop",
    emoji: "📁",
    archetype: "pwa",
    tagline: "File manager — dual-pane layout, breadcrumbs, selection, actions.",
    features: ["Dual panes", "Breadcrumbs", "Selection", "Context actions", "Dark mode"],
    brief:
      "File manager starter scaffolded by RIDE. Dual-pane desktop layout with breadcrumbs and selection. Replace placeholder files with the user's storage. Keep the React + Vite + Tailwind stack.",
    prompt:
      "Customize this file manager starter into a {name}. Replace the placeholder folder tree and file rows with plausible content. Keep the dual-pane desktop layout.",
    variants: ["Modern File Explorer", "Dual-Pane Manager", "Cloud File Manager", "Developer File Manager", "Media File Manager", "Document Manager", "Secure File Manager", "AI File Organizer", "Duplicate Finder", "Workspace Manager"],
  },
  {
    id: "business-software",
    name: "Business Software",
    section: "desktop",
    emoji: "🧾",
    archetype: "dashboard",
    tagline: "Business app — POS/orders/accounts, records, reports, roles.",
    features: ["Records", "Quick entry", "Reports", "Role views", "Dark mode"],
    brief:
      "Business software starter scaffolded by RIDE (dashboard archetype). Replace placeholder records and reports with the user's operation. Keep the React + Vite + Tailwind stack.",
    prompt:
      "Customize this business starter into a {name}. Replace the placeholder records, quick-entry panel and reports with plausible business content. Keep the dashboard-based desktop layout.",
    variants: ["POS", "Inventory", "Accounting", "HR Management", "CRM Desktop", "ERP Desktop", "Billing", "Business Analytics", "Office Management", "Enterprise Operations"],
  },

  // ─── Developer ───────────────────────────────────────────────────────────
  {
    id: "rest-api",
    name: "REST API",
    section: "developer",
    emoji: "🌐",
    archetype: "api",
    tagline: "Node + TypeScript API — CRUD resource, tests, Dockerfile.",
    features: ["Express server", "CRUD resource", "Validation", "Node test runner", "Dockerfile"],
    questions: [
      { id: "apiName", label: "API name", kind: "text", placeholder: "user-service", required: true },
      { id: "purpose", label: "What does it do?", kind: "text", placeholder: "Manages users with CRUD endpoints", required: true },
    ],
    brief:
      "REST API starter scaffolded by RIDE. Contains an Express + TypeScript server with a health endpoint, a Node test and a Dockerfile. Build the user's requested resource with CRUD endpoints and keep tests green.",
    prompt:
      "Customize this REST API starter ({apiName}) for: {purpose}. Add a sensible resource with CRUD endpoints, validation, a test suite and keep the Express + TypeScript + Docker setup.",
    variants: ["E-commerce API", "Authentication API", "Social API", "Payment API", "SaaS API", "AI API", "Analytics API", "Booking API", "Education API", "Marketplace API"],
  },
  {
    id: "graphql-api",
    name: "GraphQL API",
    section: "developer",
    emoji: "🔗",
    archetype: "api",
    tagline: "Schema-first Node API — resolvers, types, queries, tests.",
    features: ["GraphQL schema", "Resolvers", "Typed queries", "Tests", "Dockerfile"],
    brief:
      "GraphQL API starter scaffolded by RIDE on the REST API base (Express + TypeScript + tests). Add a GraphQL schema and resolvers for the user's domain and keep tests green.",
    prompt:
      "Turn this API starter into a {name} GraphQL service. Add a schema, resolvers and a couple of typed queries/mutations for the domain, with tests. Keep the Express + TypeScript + Docker setup.",
    variants: ["Social GraphQL", "E-commerce GraphQL", "SaaS GraphQL", "Analytics GraphQL", "Content GraphQL", "Education GraphQL", "Marketplace GraphQL", "Finance GraphQL", "Healthcare GraphQL", "Enterprise GraphQL"],
  },
  {
    id: "cli",
    name: "CLI",
    section: "developer",
    emoji: "⌨️",
    archetype: "cli",
    tagline: "Node CLI — typed commands, flags, help, tests.",
    features: ["Typed commands", "Flags", "Help output", "Tests", "npm bin"],
    brief:
      "CLI starter scaffolded by RIDE. Contains a TypeScript Node CLI with a bin entry, one command, flags and a Node test. Build the user's command surface and keep tests green.",
    prompt:
      "Turn this CLI starter into {name}. Add the command surface (commands, flags, help, error handling) implied by the name, with tests, and keep the TypeScript + Node setup.",
    variants: ["Project Generator", "File Organizer", "API CLI", "Git Assistant", "Database CLI", "Deployment CLI", "AI CLI", "Image Processor", "Code Analyzer", "Developer Utility CLI"],
  },
  {
    id: "sdk",
    name: "SDK",
    section: "developer",
    emoji: "📦",
    archetype: "package",
    tagline: "TypeScript library — public API, types, tests, README.",
    features: ["Public API", "Typed exports", "Tests", "README docs", "npm-ready"],
    brief:
      "SDK starter scaffolded by RIDE (library archetype: TypeScript package with src, tests and README). Build the user's typed public API and keep tests green.",
    prompt:
      "Turn this library starter into a {name} SDK. Design the public API surface (types, classes, functions) implied by the name, with tests and README docs. Keep the TypeScript package setup.",
    variants: ["AI SDK", "Payment SDK", "Authentication SDK", "Analytics SDK", "Communication SDK", "Storage SDK", "Maps SDK", "Commerce SDK", "IoT SDK", "Developer Platform SDK"],
  },
  {
    id: "packages",
    name: "Packages",
    section: "developer",
    emoji: "🧩",
    archetype: "package",
    tagline: "npm package — export surface, tests, changelog, README.",
    features: ["Export surface", "Tests", "Changelog", "README", "npm-ready"],
    brief:
      "Package starter scaffolded by RIDE (library archetype: TypeScript package with src, tests and README). Build the user's package and keep tests green.",
    prompt:
      "Turn this library starter into a {name} npm package. Build the export surface and behavior implied by the name, with tests and a short README. Keep the TypeScript package setup.",
    variants: ["React Component Package", "Utility Package", "Validation Package", "Authentication Package", "API Client Package", "Data Processing Package", "AI Utility Package", "CLI Package", "Animation Package", "Developer Utility Package"],
  },
  {
    id: "browser-extension",
    name: "Browser Extension",
    section: "developer",
    emoji: "🧩",
    archetype: "extension",
    tagline: "Manifest v3 extension — popup, content script, options page.",
    features: ["Manifest v3", "Popup UI", "Content script", "Options page", "TypeScript"],
    brief:
      "Browser extension starter scaffolded by RIDE. Contains a manifest v3 setup, popup, content script and options page templates. Build the user's extension behavior.",
    prompt:
      "Turn this extension starter into {name}. Implement the popup, content script and options behaviors implied by the name. Keep the manifest v3 + TypeScript setup.",
    variants: ["AI Web Assistant", "YouTube Assistant", "Productivity Extension", "Screenshot Tool", "DevTools Extension", "Website Analyzer", "Tab Manager", "Research Assistant", "Shopping Assistant", "Writing Assistant"],
  },

  // ─── Games ───────────────────────────────────────────────────────────────
  {
    id: "game-2d",
    name: "2D Games",
    section: "games",
    emoji: "🕹️",
    archetype: "arcade",
    tagline: "HTML canvas starter — game loop, input, sprites, scoring.",
    features: ["Canvas loop", "Input handling", "Scoring", "Restart", "Polish-ready"],
    brief:
      "2D game starter scaffolded by RIDE. Contains a canvas game loop with input, scoring and restart. Build the specific game the user picks; keep it on a single canvas with the React + Tailwind shell.",
    prompt:
      "Build a classic {name} as an HTML canvas game on this starter. Implement the core loop, input, collision, scoring and a restart. Polish visuals with the scaffold's palette.",
    variants: ["Platformer", "Top-Down Adventure", "Tower Defense", "Puzzle Game", "RPG", "Farming Game", "Strategy Game", "Card Game", "Survival Game", "Educational Game"],
  },
  {
    id: "game-3d",
    name: "3D Games",
    section: "games",
    emoji: "🎮",
    archetype: "arcade",
    tagline: "3D starter — WebGL scene, camera, controls, spawn logic.",
    features: ["WebGL scene", "Camera", "Controls", "Collision", "Polish-ready"],
    brief:
      "3D game starter scaffolded by RIDE. A WebGL-based scene (three.js style) shell you should configure for a 3D experience. If a dependency is unavailable, implement a canvas 3D projection fallback or ask.",
    prompt:
      "Build a {name} as a 3D experience on this starter. Set up a WebGL scene with camera, controls, objects and interaction. If no 3D library is installed, implement a minimal canvas 3D projection.",
    variants: ["3D Platformer", "Racing Game", "Exploration Game", "Adventure Game", "Simulation", "Survival", "FPS Prototype", "Third-Person Game", "Strategy 3D", "Sandbox"],
  },
  {
    id: "game-multiplayer",
    name: "Multiplayer",
    section: "games",
    emoji: "👾",
    archetype: "arcade",
    tagline: "Multiplayer starter — local hot-seat + server-ready shell.",
    features: ["Local 2-player", "Turn handling", "Server-ready shell", "Scoring", "Restart"],
    brief:
      "Multiplayer game starter scaffolded by RIDE. Includes a local two-player (hot-seat) mode you should expand; the agent can add a WebSocket server on request. Keep the canvas approach.",
    prompt:
      "Build {name} as a multiplayer game on this starter. Implement local two-player first (hot-seat), clear turn handling and scoring; note where a WebSocket server would go.",
    variants: ["Multiplayer Arena", "Racing", "Co-op Adventure", "Multiplayer Chess", "Battle Arena", "Social World", "Multiplayer Card Game", "Team Shooter", "Co-op Survival", "Multiplayer Strategy"],
  },
  {
    id: "game-puzzle",
    name: "Puzzle",
    section: "games",
    emoji: "🧩",
    archetype: "arcade",
    tagline: "Puzzle starter — grid helpers, moves/score, levels, timer.",
    features: ["Grid helpers", "Moves/score", "Levels", "Timer", "Restart"],
    brief:
      "Puzzle game starter scaffolded by RIDE. Contains grid helpers along with moves, score, levels and a timer. Build the specific puzzle the user picks on top of it.",
    prompt:
      "Build {name} as a puzzle game on this starter. Use the grid/score helpers, add levels or difficulty and a timer where relevant.",
    variants: ["Sudoku", "Match-3", "Word Puzzle", "Logic Puzzle", "Physics Puzzle", "Maze", "Memory Game", "Number Puzzle", "Strategy Puzzle", "AI Puzzle Generator"],
  },
  {
    id: "game-arcade",
    name: "Arcade",
    section: "games",
    emoji: "🕹️",
    archetype: "arcade",
    tagline: "Canvas arcade starter — tic-tac-toe with an AI opponent.",
    features: ["Canvas rendering", "AI opponent", "Score tracking", "Restart"],
    questions: [
      q({ id: "game", label: "Which game?", kind: "select", options: ["Tic-tac-toe"], defaultValue: "Tic-tac-toe" }),
      q({ id: "difficulty", label: "AI difficulty", kind: "select", options: ["Easy", "Unbeatable"], defaultValue: "Unbeatable" }),
    ],
    brief:
      "Canvas game starter scaffolded by RIDE. Contains a tic-tac-toe board with an AI opponent. Polish visuals and add game feel where useful. Keep the canvas approach.",
    prompt:
      "Customize this {game} starter with {difficulty} AI difficulty. Polish the visuals (colors, hover states, win highlight), add a score tracker and keep the canvas + React + Tailwind stack.",
    variants: ["Space Shooter", "Endless Runner", "Brick Breaker", "Snake", "Flappy-style Game", "Racing Arcade", "Zombie Shooter", "Retro Platformer", "Survival Arcade", "Bullet Hell"],
  },

  // ─── Starter ─────────────────────────────────────────────────────────────
  {
    id: "custom",
    name: "Custom / Blank",
    section: "starter",
    emoji: "✨",
    archetype: "custom",
    tagline: "Empty folder — the agent builds everything from your description.",
    features: ["Empty workspace", "Agent-driven"],
    brief:
      "Blank project scaffolded by RIDE. The agent drives the entire build from the user's description. Ask the user for details when ambiguous, then establish a working stack and project structure.",
    prompt: "",
    variants: ["Start from scratch"],
  },
];

const LEGACY_IDS: Record<string, string> = {
  landing: "agency",
  dashboard: "admin-panel",
  "ai-app": "ai-chatbot",
  api: "rest-api",
  arcade: "game-arcade",
};

export function getBuiltinTemplates(): BuiltinTemplate[] {
  const out: BuiltinTemplate[] = [];
  for (const family of FAMILIES) {
    const s = STACK[family.archetype];
    family.variants.forEach((name, i) => {
      const id = i === 0 ? family.id : `${family.id}-${i + 1}`;
      const brief = briefFor(family.id, i, name);
      const description = `${family.name} — ${name}. ${family.tagline} · ${brief.eraLabel} direction (${brief.layout} layout, ${brief.hero} hero, ${brief.nav} nav, ${brief.typography.label}).`;
      out.push({
        id,
        name,
        description,
        category: family.id,
        section: family.section,
        tags: [family.name, s.framework, s.styling, brief.eraLabel, brief.layout],
        framework: s.framework,
        styling: s.styling,
        ui: s.ui,
        icons: s.icons,
        animation: s.animation,
        features: family.features,
        aiCompatible: true,
        userGenerated: false,
        questions: family.questions ?? [],
        hasPreview: family.archetype !== "custom",
        customPrompt:
          family.prompt +
          `\n\nVariant: Build "${name}" — ${variantFocus(name)}. ` +
          `Follow this design brief exactly:\n${briefToPrompt(brief)}`,
        files: [],
        archetype: family.archetype,
        familyId: family.id,
        variantIndex: i,
        accent: accentForVariant(family.id, i),
        emoji: family.emoji,
      });
    });
  }
  return out;
}

const ALL = getBuiltinTemplates();

export function getBuiltinTemplate(id: string): BuiltinTemplate | undefined {
  return ALL.find((t) => t.id === id) ?? (LEGACY_IDS[id] ? ALL.find((t) => t.id === LEGACY_IDS[id]) : undefined);
}

export function templatesByCategory(category: string): BuiltinTemplate[] {
  return ALL.filter((t) => t.category === category);
}

function variantFocus(name: string): string {
  return `Give it a distinct visual identity, palette, imagery and copy that match "${name}"; make it clearly different from the base scaffold.`;
}

function briefToPrompt(b: ReturnType<typeof briefFor>): string {
  return [
    `- DESIGN CONCEPT: ${b.concept}`,
    `- ERA: ${b.eraLabel} (${b.eraHint})`,
    `- LAYOUT: ${b.layout} architecture`,
    `- NAVIGATION: ${b.nav} nav`,
    `- HERO: ${b.hero} composition`,
    `- CARD SYSTEM: ${b.cards} cards`,
    `- IMAGERY: ${b.imagery} direction`,
    `- MOTION: ${b.motion} profile; interactions are ${b.interaction}-driven`,
    `- THEME: ${b.theme}`,
    `- TYPOGRAPHY: ${b.typography.label}`,
    `- ACCENT: ${b.accent}`,
    `- TARGET USER: ${b.targetUser}`,
    `- BRAND PERSONALITY: ${b.brandPersonality}`,
    `- PRIMARY ACTION: ${b.primaryAction}`,
    `- SECTIONS: ${b.sections.join(" → ")}`,
  ].join("\n");
}