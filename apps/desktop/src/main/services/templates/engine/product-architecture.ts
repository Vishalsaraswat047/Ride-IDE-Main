/**
 * RIDE Product Architecture Schema.
 *
 * Defines the complete end-to-end product experience for every template category.
 * Each archetype has a full page map, user journey flows, state requirements,
 * and component needs. This replaces the old "single-page mockup" approach.
 *
 * The architecture drives:
 * - Multi-page scaffolding (routing, layouts)
 * - Auth/backend scaffolding (API routes, schemas)
 * - State system (loading, empty, error, success, unauthorized, offline)
 * - Component library requirements
 * - Mobile/responsive breakdowns
 */

export type AuthFlow = "none" | "email-passcode" | "email-otp" | "social" | "magic-link";

export type NavigationStyle = "top-bar" | "sidebar" | "bottom-tabs" | "floating" | "dual-pane";

export type ResponsiveBreakpoint = "mobile" | "tablet" | "laptop" | "desktop";

export interface PageState {
  loading: boolean | string;
  loaded: boolean | string;
  empty: boolean | string;
  error: string | null;
  success: boolean | string;
  unauthorized: boolean | string;
  offline: boolean | string;
}

export interface PageMetadata {
  title: string;
  description: string;
  keywords?: string[];
  breadcrumbs?: string[];
}

export interface NavigationItem {
  key: string;
  label: string;
  href?: string;
  exact?: boolean;
  requiresAuth?: boolean;
  icon?: string;
}

export interface UserJourneyStep {
  id: string;
  label: string;
  description: string;
  requiresAuth: boolean;
  formFields?: string[];
  validation?: Record<string, string[]>;
  successPath?: string;
  errorPath?: string;
}

export interface ProductArchetypeArchitecture {
  name: string;
  description: string;
  section: "websites" | "webapps" | "ai" | "mobile" | "desktop" | "developer" | "games" | "starter";
  archetype: string;
  navigation: NavigationStyle;
  primaryNav: NavigationItem[];
  secondaryNav?: NavigationItem[];
  pages: Record<string, PageSpec>;
  userJourneys: UserJourneyStep[];
  authFlow: AuthFlow;
  states: PageState;
  responsiveBreakpoints: Partial<Record<ResponsiveBreakpoint, {
    layout: string;
    nav: NavigationStyle;
    hideSecondary?: boolean;
    components?: string[];
  }>>;
  requiredComponents: string[];
  optionalComponents: string[];
  backendNeeded: boolean;
  apiRoutes: string[];
  databaseModels?: string[];
  designLanguage: "editorial" | "swiss" | "neo-brutalist" | "minimal-luxury" | "glass-spatial" | "digital-futurism" | "organic" | "editorial-commerce" | "industrial" | "cinematic" | "playful" | "data-dense" | "architectural" | "experimental" | "futuristic";
}

/**
 * Page specification for each route/screen in the product.
 */
export interface PageSpec {
  path: string;
  title: string;
  component: string;
  requiresAuth: boolean;
  dependents?: string[]; // pages that must load first
  states: PageState;
  metadata?: PageMetadata;
  sections: string[]; // UI sections to render (hero, cards, table, form, etc.)
  actions: {
    label: string;
    handler: "navigate" | "submit" | "delete" | "upload" | "download" | "refresh" | "share" | "ai-generate" | "filter" | "load-more" | "sort" | "trim" | "comment" | "like" | "mark-read" | "follow";
    target?: string;
    confirmation?: string;
  }[];
  filters?: {
    field: string;
    operator: "equals" | "contains" | "greaterThan" | "lessThan" | "between";
    value: string;
  }[];
  sortOptions?: {
    field: string;
    direction: "asc" | "desc";
    label: string;
  }[];
}

/**
 * Template family definitions with complete product architectures.
 * Each family now has a full product blueprint, not just a single-page scaffold.
 */
export const PRODUCT_ARCHITECTURES: Record<string, ProductArchetypeArchitecture> = {
  // === WEBSITES ===

  portfolio: {
    name: "Portfolio",
    description: "Personal site with hero, about, projects, experience, contact and resume.",
    section: "websites",
    archetype: "portfolio",
    navigation: "top-bar",
    primaryNav: [
      { key: "home", label: "Home", href: "/", exact: true },
      { key: "work", label: "Work", href: "/work", exact: false },
      { key: "about", label: "About", href: "/about", exact: false },
      { key: "contact", label: "Contact", href: "/contact", exact: false },
    ],
    pages: {
      "/": {
        path: "/",
        title: "Home",
        component: "PortfolioHome",
        requiresAuth: false,
        states: {
          loading: false,
          loaded: true,
          empty: false,
          error: null,
          success: false,
          unauthorized: false,
          offline: false,
        },
        sections: ["hero", "featured-work", "experience", "contact"],
        actions: [
          { label: "View project", handler: "navigate", target: "/work" },
          { label: "Contact", handler: "navigate", target: "/contact" },
        ],
      },
      "/work": {
        path: "/work",
        title: "Work",
        component: "PortfolioWork",
        requiresAuth: false,
        states: { loading: false, loaded: true, empty: false, error: null, success: false, unauthorized: false, offline: false },
        sections: ["projects-grid", "project-filters"],
        actions: [
          { label: "Filter by tag", handler: "submit", target: "/work" },
          { label: "View project detail", handler: "navigate", target: "/work/[id]" },
        ],
      },
      "/about": {
        path: "/about",
        title: "About",
        component: "PortfolioAbout",
        requiresAuth: false,
        states: { loading: false, loaded: true, empty: false, error: null, success: false, unauthorized: false, offline: false },
        sections: ["bio", "timeline", "personal-interests"],
        actions: [],
      },
      "/contact": {
        path: "/contact",
        title: "Contact",
        component: "PortfolioContact",
        requiresAuth: false,
        states: { loading: false, loaded: true, empty: false, error: null, success: false, unauthorized: false, offline: false },
        sections: ["form", "social-links"],
        actions: [
          { label: "Send message", handler: "submit", confirmation: "Message sent successfully" },
        ],
      },
    },
    userJourneys: [
      {
        id: "first-time-visitor",
        label: "First-time visitor experience",
        description: "Visitor lands on homepage, views work, reads about section, contacts",
        requiresAuth: false,
        formFields: [],
      },
      {
        id: "contact-flow",
        label: "Contact flow",
        description: "Visitor fills contact form, receives success state",
        requiresAuth: false,
        formFields: ["name", "email", "message"],
        validation: {
          email: ["Please enter a valid email"],
          required: ["All fields are required"],
        },
        successPath: "/",
        errorPath: "/contact",
      },
    ],
    authFlow: "none",
    states: {
      loading: false,
      loaded: true,
      empty: false,
      error: null,
      success: false,
      unauthorized: false,
      offline: false,
    },
    responsiveBreakpoints: {
      mobile: { layout: "single-column", nav: "bottom-tabs", hideSecondary: true },
      tablet: { layout: "two-column", nav: "top-bar", hideSecondary: false },
      laptop: { layout: "grid", nav: "top-bar", hideSecondary: false },
        desktop: { layout: "masonry-grid", nav: "top-bar", hideSecondary: false },
    },
    requiredComponents: ["navbar", "hero", "cards", "form", "footer"],
    optionalComponents: ["3d-hero", "timeline", "newsletter-signup"],
    backendNeeded: false,
    apiRoutes: [],
    designLanguage: "editorial",
  },

  // === SOCIAL MEDIA ===

  social: {
    name: "Social Media App",
    description: "Complete social networking experience with feed, stories, DMs, profiles, and more.",
    section: "webapps",
    archetype: "social",
    navigation: "bottom-tabs",
    primaryNav: [
      { key: "feed", label: "Feed", href: "/", exact: true, icon: "message-circle" },
      { key: "explore", label: "Explore", href: "/explore", exact: false, icon: "compass" },
      { key: "post", label: "Post", href: "/create", exact: false, icon: "plus" },
      { key: "likes", label: "Likes", href: "/likes", exact: false, icon: "heart" },
      { key: "profile", label: "Profile", href: "/profile", exact: false, icon: "user" },
    ],
    secondaryNav: [
      { key: "settings", label: "Settings", href: "/settings", exact: false },
      { key: "help", label: "Help", href: "/help", exact: false },
    ],
    pages: {
      "/": {
        path: "/",
        title: "Feed",
        component: "SocialFeed",
        requiresAuth: true,
        states: {
          loading: true,
          loaded: false,
          empty: "No posts yet. Be the first to share something!",
          error: null,
          success: false,
          unauthorized: false,
          offline: "Show last cached posts",
        },
        sections: ["post-feed", "stories-bar", "sponsored", "trending"],
        actions: [
          { label: "Like post", handler: "submit", confirmation: "Post liked" },
          { label: "Comment", handler: "submit", target: "/post/[id]/comments" },
          { label: "Share", handler: "share" },
        ],
      },
      "/explore": {
        path: "/explore",
        title: "Explore",
        component: "SocialExplore",
        requiresAuth: true,
        states: { loading: false, loaded: true, empty: "No trending content", error: null, success: false, unauthorized: false, offline: false },
        sections: ["search", "trending", "recommended-users", "hashtags"],
        actions: [
          { label: "Search", handler: "navigate", target: "/search" },
          { label: "Follow user", handler: "submit" },
        ],
      },
      "/create": {
        path: "/create",
        title: "Create Post",
        component: "SocialCreatePost",
        requiresAuth: true,
        states: {
          loading: "Selecting media...",
          loaded: "Media selected",
          empty: "No media selected",
          error: "Failed to upload media",
          success: "Post published successfully",
          unauthorized: false,
          offline: "Cannot post while offline",
        },
        sections: ["media-selector", "post-editor", "caption", "hashtags", "publish"],
        actions: [
          { label: "Select photo", handler: "upload" },
          { label: "Select video", handler: "upload" },
          { label: "Publish", handler: "submit", confirmation: "Post published" },
          { label: "Cancel", handler: "navigate", target: "/" },
        ],
      },
      "/post/[id]": {
        path: "/post/[id]",
        title: "Post Detail",
        component: "SocialPostDetail",
        requiresAuth: true,
        dependents: ["/"],
        states: {
          loading: "Loading post...",
          loaded: "Post loaded",
          empty: "Post not found",
          error: "Post unavailable",
          success: false,
          unauthorized: "You don't have permission to view this post",
          offline: "Show cached version if available",
        },
        sections: ["post-media", "comments", "replies", "likes", "shares"],
        actions: [
          { label: "Like/Unlike", handler: "submit" },
          { label: "Add reply", handler: "submit", target: "/post/[id]/comments" },
          { label: "Share", handler: "share" },
          { label: "Save", handler: "submit", confirmation: "Post saved" },
        ],
      },
      "/profile": {
        path: "/profile",
        title: "Profile",
        component: "SocialProfile",
        requiresAuth: true,
        states: {
          loading: "Loading profile...",
          loaded: "Profile loaded",
          empty: "No content yet",
          error: null,
          success: false,
          unauthorized: false,
          offline: false,
        },
        sections: ["profile-header", "posts-grid", "followers", "following", "edit-profile"],
        actions: [
          { label: "Edit profile", handler: "navigate", target: "/edit-profile" },
          { label: "Follow/Unfollow", handler: "submit" },
          { label: "Toggle dark mode", handler: "submit" },
        ],
      },
      "/settings": {
        path: "/settings",
        title: "Settings",
        component: "SocialSettings",
        requiresAuth: true,
        states: {
          loading: "Loading settings...",
          loaded: "Settings loaded",
          empty: false,
          error: null,
          success: "Changes saved",
          unauthorized: false,
          offline: "Using local preferences",
        },
        sections: ["account", "privacy", "notifications", "security", "connected-apps"],
        actions: [
          { label: "Save changes", handler: "submit", confirmation: "Settings saved" },
          { label: "Delete account", handler: "delete", confirmation: "Are you sure you want to delete your account?" },
        ],
      },
      "/notifications": {
        path: "/notifications",
        title: "Notifications",
        component: "SocialNotifications",
        requiresAuth: true,
        states: {
          loading: "Loading notifications...",
          loaded: "Notifications loaded",
          empty: "No new notifications",
          error: null,
          success: "Marked as read",
          unauthorized: false,
          offline: "Show cached notifications",
        },
        sections: ["mentions", "likes", "comments", "followers", "direct-messages"],
        actions: [
          { label: "Mark all as read", handler: "submit" },
          { label: "Open direct message", handler: "navigate", target: "/dm/[id]" },
        ],
      },
      "/dm/[id]": {
        path: "/dm/[id]",
        title: "Direct Message",
        component: "SocialDM",
        requiresAuth: true,
        dependents: ["/profile"],
        states: {
          loading: "Loading conversation...",
          loaded: "Conversation loaded",
          empty: "No messages yet",
          error: "Conversation unavailable",
          success: "Message sent",
          unauthorized: false,
          offline: "View last 10 messages cached",
        },
        sections: ["conversation-header", "message-list", "composer", "media-viewer"],
        actions: [
          { label: "Send message", handler: "submit", confirmation: "Message sent" },
          { label: "React to message", handler: "submit" },
          { label: "Forward", handler: "share" },
        ],
      },
      "/search": {
        path: "/search",
        title: "Search",
        component: "SocialSearch",
        requiresAuth: true,
        states: {
          loading: "Searching...",
          loaded: "Results loaded",
          empty: "No results found",
          error: "Search failed",
          success: "Results displayed",
          unauthorized: false,
          offline: "Show last search cached",
        },
        sections: ["users", "hashtags", "posts", "groups"],
        actions: [
          { label: "Select user", handler: "navigate", target: "/profile/[id]" },
          { label: "Select hashtag", handler: "navigate", target: "/hashtag/[tag]" },
        ],
      },
    },
    userJourneys: [
      {
        id: "new-user-onboarding",
        label: "New user onboarding",
        description: "Splash → Onboarding → Login → Feed setup",
        requiresAuth: false,
        formFields: ["username", "interests", "profile-picture"],
      },
      {
        id: "post-creation-flow",
        label: "Post creation flow",
        description: "Compose → Media selection → Caption → Publish → Feed update",
        requiresAuth: true,
        formFields: ["media", "caption", "hashtags"],
        successPath: "/",
        errorPath: "/create",
      },
      {
        id: "profile-setup",
        label: "Profile setup",
        description: "Complete profile → Add bio → Follow users → Start using app",
        requiresAuth: true,
        formFields: ["bio", "website", "location", "profile-picture"],
      },
    ],
    authFlow: "email-otp",
    states: {
      loading: false,
      loaded: true,
      empty: false,
      error: null,
      success: false,
      unauthorized: false,
      offline: false,
    },
    responsiveBreakpoints: {
      mobile: { layout: "vertical", nav: "bottom-tabs", hideSecondary: true },
      tablet: { layout: "two-column", nav: "bottom-tabs", hideSecondary: false },
      laptop: { layout: "three-column", nav: "sidebar", hideSecondary: false },
      desktop: { layout: "four-column", nav: "sidebar", hideSecondary: false },
    },
    requiredComponents: ["bottom-tabs", "feed-card", "post-composer", "profile-card", "notification-dot"],
    optionalComponents: ["stories-carousel", "media-viewer", "live-chat", "3d-objects"],
    backendNeeded: true,
    apiRoutes: [
      "POST /api/auth/login",
      "POST /api/auth/refresh",
      "POST /api/auth/logout",
      "GET /api/posts",
      "POST /api/posts",
      "GET /api/posts/[id]",
      "PUT /api/posts/[id]",
      "DELETE /api/posts/[id]",
      "GET /api/users/[id]",
      "PATCH /api/users/[id]",
      "GET /api/notifications",
      "POST /api/dms",
      "GET /api/dms/[id]",
      "GET /api/search",
    ],
    databaseModels: ["User", "Post", "Comment", "Like", "Share", "Follow", "DM", "Hashtag", "Story"],
    designLanguage: "playful",
  },

  // === RESTAURANT ===

  restaurant: {
    name: "Restaurant App",
    description: "Complete restaurant booking and dining experience.",
    section: "websites",
    archetype: "landing",
    navigation: "top-bar",
    primaryNav: [
      { key: "home", label: "Home", href: "/", exact: true },
      { key: "menu", label: "Menu", href: "/menu", exact: false },
      { key: "reservations", label: "Reservations", href: "/reservations", exact: false },
      { key: "locations", label: "Locations", href: "/locations", exact: false },
      { key: "reviews", label: "Reviews", href: "/reviews", exact: false },
    ],
    pages: {
      "/": {
        path: "/",
        title: "Home",
        component: "RestaurantHome",
        requiresAuth: false,
        states: {
          loading: "Discovering featured dishes...",
          loaded: "Home content loaded",
          empty: "",
          error: null,
          success: false,
          unauthorized: false,
          offline: "Show last visited restaurant info",
        },
        sections: ["hero", "featured-dishes", "gallery", "reviews-summary", "cta"],
        actions: [
          { label: "View menu", handler: "navigate", target: "/menu" },
          { label: "Make reservation", handler: "submit", confirmation: "Reservation request sent" },
          { label: "Find location", handler: "navigate", target: "/locations" },
        ],
      },
      "/menu": {
        path: "/menu",
        title: "Menu",
        component: "RestaurantMenu",
        requiresAuth: false,
        states: {
          loading: "Loading menu...",
          loaded: "Menu loaded",
          empty: "No items available",
          error: "Menu unavailable",
          success: false,
          unauthorized: false,
          offline: "Show cached menu",
        },
        sections: ["categories", "food-items", "drinks", "specials"],
        actions: [
          { label: "Add to cart", handler: "submit", confirmation: "Item added to cart" },
          { label: "Filter by category", handler: "submit" },
        ],
      },
      "/reservations": {
        path: "/reservations",
        title: "Reservations",
        component: "RestaurantReservations",
        requiresAuth: false,
        states: {
          loading: "Loading reservation options...",
          loaded: "Reservations loaded",
          empty: "No available slots",
          error: "No slots available for selected date",
          success: "Reservation confirmed",
          unauthorized: false,
          offline: "View last reservation info",
        },
        sections: ["date-picker", "time-slots", "party-size", "special-requests"],
        actions: [
          { label: "Book table", handler: "submit", confirmation: "Reservation confirmed" },
          { label: "Cancel reservation", handler: "delete", confirmation: "Reservation cancelled" },
        ],
      },
      "/locations": {
        path: "/locations",
        title: "Locations",
        component: "RestaurantLocations",
        requiresAuth: false,
        states: {
          loading: "Loading locations...",
          loaded: "Locations loaded",
          empty: "No locations found",
          error: null,
          success: false,
          unauthorized: false,
          offline: "Show last searched locations",
        },
        sections: ["map", "addresses", "hours", "directions"],
        actions: [
          { label: "Get directions", handler: "navigate", target: "/map" },
          { label: "Call restaurant", handler: "submit" },
        ],
      },
      "/reviews": {
        path: "/reviews",
        title: "Reviews",
        component: "RestaurantReviews",
        requiresAuth: false,
        states: {
          loading: "Loading reviews...",
          loaded: "Reviews loaded",
          empty: "No reviews yet",
          error: null,
          success: false,
          unauthorized: false,
          offline: "Show last cached reviews",
        },
        sections: ["review-list", "average-rating", "write-review"],
        actions: [
          { label: "Write review", handler: "submit", confirmation: "Review posted" },
          { label: "Filter by rating", handler: "submit" },
        ],
      },
    },
    userJourneys: [
      {
        id: "booking-flow",
        label: "Reservation booking flow",
        description: "Select date → Select time → Party size → Confirm → Confirmation",
        requiresAuth: false,
        formFields: ["date", "time", "party-size", "special-requests"],
        validation: {
          date: ["Please select a valid date"],
          time: ["Please select a valid time slot"],
          "party-size": ["Party size must be between 1 and 12"],
        },
        successPath: "/reservations/confirmation",
        errorPath: "/reservations",
      },
      {
        id: "first-time-visitor",
        label: "First-time visitor experience",
        description: "Landing → Menu → Reservations → Contact",
        requiresAuth: false,
        formFields: [],
      },
    ],
    authFlow: "none",
    states: {
      loading: false,
      loaded: true,
      empty: false,
      error: null,
      success: false,
      unauthorized: false,
      offline: false,
    },
    responsiveBreakpoints: {
      mobile: { layout: "single-column", nav: "top-bar", hideSecondary: true },
      tablet: { layout: "two-column", nav: "top-bar", hideSecondary: false },
      laptop: { layout: "three-column", nav: "top-bar", hideSecondary: false },
      desktop: { layout: "four-column", nav: "top-bar", hideSecondary: false },
    },
    requiredComponents: ["navbar", "hero", "cards", "form", "button", "calendar", "map"],
    optionalComponents: ["gallery", "reviews-carousel", "loyalty-program", "gift-cards"],
    backendNeeded: true,
    apiRoutes: [
      "POST /api/reservations",
      "GET /api/reservations/[id]",
      "PATCH /api/reservations/[id]",
      "GET /api/menu/categories",
      "GET /api/menu/items",
      "GET /api/reviews",
      "POST /api/reviews",
    ],
    databaseModels: ["Restaurant", "MenuItem", "Reservation", "Review", "Location", "Dish", "Category"],
    designLanguage: "editorial-commerce",
  },

  // === SAAS ===

  saas: {
    name: "SaaS Dashboard",
    description: "Complete SaaS analytics dashboard with features, pricing, and team management.",
    section: "webapps",
    archetype: "saas",
    navigation: "sidebar",
    primaryNav: [
      { key: "dashboard", label: "Dashboard", href: "/", exact: true },
      { key: "projects", label: "Projects", href: "/projects", exact: false },
      { key: "analytics", label: "Analytics", href: "/analytics", exact: false },
      { key: "settings", label: "Settings", href: "/settings", exact: false },
    ],
    secondaryNav: [
      { key: "help", label: "Help", href: "/help", exact: false },
      { key: "feedback", label: "Feedback", href: "/feedback", exact: false },
    ],
    pages: {
      "/": {
        path: "/",
        title: "Dashboard",
        component: "SaaSDashboard",
        requiresAuth: true,
        states: {
          loading: "Loading KPIs...",
          loaded: "Dashboard data loaded",
          empty: "No data available",
          error: "Failed to load dashboard",
          success: "Data refreshed",
          unauthorized: "Session expired",
          offline: "Show last cached KPIs",
        },
        sections: ["kpi-cards", "charts", "activity-feed", "quick-actions"],
        actions: [
          { label: "Refresh data", handler: "submit" },
          { label: "Create new project", handler: "navigate", target: "/projects/create" },
          { label: "Add to dashboard", handler: "submit" },
        ],
      },
      "/projects": {
        path: "/projects",
        title: "Projects",
        component: "SaaSProjects",
        requiresAuth: true,
        states: {
          loading: "Loading projects...",
          loaded: "Projects loaded",
          empty: "No projects found",
          error: "Failed to load projects",
          success: "Project loaded",
          unauthorized: "No permission",
          offline: "Show last cached projects",
        },
        sections: ["project-grid", "filters", "search", "create-button"],
        actions: [
          { label: "Create new project", handler: "submit", confirmation: "Project creation started" },
          { label: "Import project", handler: "upload" },
          { label: "Archive project", handler: "delete", confirmation: "Project archived" },
        ],
      },
      "/projects/create": {
        path: "/projects/create",
        title: "Create Project",
        component: "SaaSProjectCreate",
        requiresAuth: true,
        states: {
          loading: "Setting up project...",
          loaded: "Project configured",
          empty: "Missing required fields",
          error: "Project creation failed",
          success: "Project created successfully",
          unauthorized: false,
          offline: "Cannot create project while offline",
        },
        sections: ["project-details", "team-invite", "settings", "preview"],
        actions: [
          { label: "Configure project", handler: "submit", confirmation: "Project configured" },
          { label: "Invite team members", handler: "submit" },
          { label: "Cancel", handler: "navigate", target: "/projects" },
        ],
      },
      "/analytics": {
        path: "/analytics",
        title: "Analytics",
        component: "SaaSAnalytics",
        requiresAuth: true,
        states: {
          loading: "Loading analytics...",
          loaded: "Analytics data loaded",
          empty: "No analytics data",
          error: "Failed to load analytics",
          success: "Filters applied",
          unauthorized: "No permission",
          offline: "Show last cached analytics",
        },
        sections: ["date-range-picker", "chart-selector", "funnel-view", "export-button"],
        actions: [
          { label: "Apply filters", handler: "submit" },
          { label: "Export report", handler: "download", confirmation: "Report exported" },
          { label: "Share view", handler: "submit" },
        ],
      },
      "/settings": {
        path: "/settings",
        title: "Settings",
        component: "SaaSSettings",
        requiresAuth: true,
        states: {
          loading: "Loading settings...",
          loaded: "Settings loaded",
          empty: "No settings found",
          error: "Failed to load settings",
          success: "Changes saved",
          unauthorized: "No permission",
          offline: "Using local preferences",
        },
        sections: ["account", "billing", "integrations", "team", "api-keys", "security"],
        actions: [
          { label: "Save changes", handler: "submit", confirmation: "Settings saved" },
          { label: "Change password", handler: "submit" },
          { label: "Delete account", handler: "delete", confirmation: "Are you sure?" },
        ],
      },
    },
    userJourneys: [
      {
        id: "new-user-onboarding",
        label: "New user onboarding",
        description: "Login → Dashboard setup → Add first project → Invite team",
        requiresAuth: false,
        formFields: ["email", "password", "company-name"],
      },
      {
        id: "project-creation",
        label: "Project creation flow",
        description: "Fill details → Invite team → Set permissions → Start using",
        requiresAuth: true,
        formFields: ["project-name", "description", "team-emails"],
        validation: {
          "project-name": ["Project name is required"],
          "team-emails": ["Valid email addresses required"],
        },
        successPath: "/projects",
        errorPath: "/projects/create",
      },
      {
        id: "billing-flow",
        label: "Billing and subscription flow",
        description: "Select plan → Enter payment → Confirm → Access granted",
        requiresAuth: true,
        formFields: ["plan-type", "payment-details"],
        successPath: "/settings",
        errorPath: "/settings",
      },
    ],
    authFlow: "email-otp",
    states: {
      loading: false,
      loaded: true,
      empty: false,
      error: null,
      success: false,
      unauthorized: false,
      offline: false,
    },
    responsiveBreakpoints: {
      mobile: { layout: "column", nav: "bottom-tabs", hideSecondary: true },
      tablet: { layout: "column", nav: "sidebar", hideSecondary: false },
      laptop: { layout: "two-column", nav: "sidebar", hideSecondary: false },
      desktop: { layout: "three-column", nav: "sidebar", hideSecondary: false },
    },
    requiredComponents: ["sidebar", "kpi-cards", "data-table", "charts", "pagination", "modal", "dropdown"],
    optionalComponents: ["kanban-board", "timeline", "file-uploader", "rich-text-editor"],
    backendNeeded: true,
    apiRoutes: [
      "POST /api/auth/login",
      "POST /api/auth/refresh",
      "POST /api/auth/logout",
      "GET /api/dashboard/kpis",
      "GET /api/projects",
      "POST /api/projects",
      "GET /api/projects/[id]",
      "PATCH /api/projects/[id]",
      "DELETE /api/projects/[id]",
      "GET /api/analytics",
      "POST /api/settings",
      "GET /api/integrations",
      "GET /api/billing/plans",
      "POST /api/billing/subscription",
    ],
    databaseModels: ["User", "Project", "TeamMember", "KPI", "Chart", "AuditLog", "Integration", "Subscription", "BillingInfo"],
    designLanguage: "data-dense",
  },

  // === MOBILE SOCIAL ===

  "mobile-social": {
    name: "Mobile Social App",
    description: "Complete mobile-first social networking experience.",
    section: "mobile",
    archetype: "pwa",
    navigation: "bottom-tabs",
    primaryNav: [
      { key: "feed", label: "Feed", exact: true },
      { key: "compose", label: "Compose", exact: false },
      { key: "profile", label: "Profile", exact: false },
      { key: "settings", label: "Settings", exact: false },
    ],
    pages: {
      "/": {
        path: "/",
        title: "Feed",
        component: "MobileFeed",
        requiresAuth: true,
        states: {
          loading: true,
          loaded: false,
          empty: "No posts yet. Share something to get started!",
          error: null,
          success: false,
          unauthorized: false,
          offline: "Show last cached posts",
        },
        sections: ["post-feed", "bottom-tab-bar", "floating-composer"],
        actions: [
          { label: "Like", handler: "like" },
          { label: "Comment", handler: "comment" },
          { label: "Share", handler: "share" },
        ],
      },
      "/profile": {
        path: "/profile",
        title: "Profile",
        component: "MobileProfile",
        requiresAuth: true,
        states: {
          loading: "Loading profile...",
          loaded: "Profile loaded",
          empty: "No content yet",
          error: null,
          success: false,
          unauthorized: false,
          offline: "Show last cached profile",
        },
        sections: ["profile-header", "posts-grid", "edit-button"],
        actions: [
          { label: "Edit profile", handler: "navigate", target: "/edit-profile" },
          { label: "Follow/Unfollow", handler: "follow" },
        ],
      },
      "/edit-profile": {
        path: "/edit-profile",
        title: "Edit Profile",
        component: "MobileEditProfile",
        requiresAuth: true,
        states: {
          loading: "Loading profile data...",
          loaded: "Profile data loaded",
          empty: "No data to edit",
          error: "Failed to load profile",
          success: "Profile updated",
          unauthorized: false,
          offline: "Using local edits",
        },
        sections: ["bio-editor", "photo-uploader", "website-field", "location-field"],
        actions: [
          { label: "Save changes", handler: "submit", confirmation: "Profile updated" },
          { label: "Cancel", handler: "navigate", target: "/profile" },
        ],
      },
      "/notifications": {
        path: "/notifications",
        title: "Notifications",
        component: "MobileNotifications",
        requiresAuth: true,
        states: {
          loading: "Loading notifications...",
          loaded: "Notifications loaded",
          empty: "No new notifications",
          error: null,
          success: "Marked as read",
          unauthorized: false,
          offline: "Show cached notifications",
        },
        sections: ["mentions", "likes", "comments", "follow-requests"],
        actions: [
          { label: "Mark all read", handler: "mark-read" },
          { label: "Open message", handler: "navigate", target: "/dm/[id]" },
        ],
      },
    },
    userJourneys: [
      {
        id: "mobile-onboarding",
        label: "Mobile onboarding flow",
        description: "Splash → Permissions → Onboarding → Login → Feed",
        requiresAuth: false,
        formFields: ["allow-notifications", "allow-contacts"],
      },
      {
        id: "first-post-flow",
        label: "First post flow",
        description: "Tap compose → Select media → Add caption → Post → Feed update",
        requiresAuth: true,
        formFields: ["media", "caption"],
      },
    ],
    authFlow: "email-otp",
    states: {
      loading: false,
      loaded: true,
      empty: false,
      error: null,
      success: false,
      unauthorized: false,
      offline: false,
    },
    responsiveBreakpoints: {
      mobile: { layout: "full-width", nav: "bottom-tabs", hideSecondary: true },
      tablet: { layout: "split", nav: "bottom-tabs", hideSecondary: false },
    },
    requiredComponents: ["bottom-tabs", "floating-composer", "post-card", "profile-card", "notification-badge"],
    optionalComponents: ["stories-carousel", "camera-effects", "audio-player", "location-sharing"],
    backendNeeded: true,
    apiRoutes: [
      "POST /api/auth/login",
      "POST /api/auth/refresh",
      "POST /api/auth/logout",
      "GET /api/posts",
      "POST /api/posts",
      "GET /api/users/[id]",
      "PATCH /api/users/[id]",
      "POST /api/follow",
      "GET /api/notifications",
      "POST /api/upload",
    ],
    databaseModels: ["User", "Post", "Comment", "Like", "Follow", "Story", "Notification", "Media"],
    designLanguage: "playful",
  },

  // === MOBILE FINANCE ===

  "mobile-finance": {
    name: "Mobile Finance App",
    description: "Complete mobile-first personal finance management.",
    section: "mobile",
    archetype: "pwa",
    navigation: "bottom-tabs",
    primaryNav: [
      { key: "home", label: "Home", exact: true },
      { key: "budgets", label: "Budgets", exact: false },
      { key: "transactions", label: "Transactions", exact: false },
      { key: "insights", label: "Insights", exact: false },
      { key: "profile", label: "Profile", exact: false },
    ],
    pages: {
      "/": {
        path: "/",
        title: "Home",
        component: "MobileFinanceHome",
        requiresAuth: true,
        states: {
          loading: "Loading balance...",
          loaded: "Home data loaded",
          empty: "No accounts connected",
          error: "Failed to fetch account data",
          success: "Balance displayed",
          unauthorized: "Session expired",
          offline: "Show last cached balance",
        },
        sections: ["balance-card", "recent-transactions", "quick-actions", "budget-progress"],
        actions: [
          { label: "Add income", handler: "navigate", target: "/transactions/add-income" },
          { label: "Add expense", handler: "navigate", target: "/transactions/add-expense" },
          { label: "Refresh", handler: "refresh" },
        ],
      },
      "/transactions": {
        path: "/transactions",
        title: "Transactions",
        component: "MobileTransactions",
        requiresAuth: true,
        states: {
          loading: "Loading transactions...",
          loaded: "Transactions loaded",
          empty: "No transactions yet",
          error: "Failed to load transactions",
          success: "Transactions displayed",
          unauthorized: "No permission",
          offline: "Show last cached transactions",
        },
        sections: ["transaction-list", "filters", "search", "date-range"],
        actions: [
          { label: "Filter by category", handler: "filter" },
          { label: "Add transaction", handler: "submit" },
          { label: "Export CSV", handler: "download" },
        ],
      },
      "/budgets": {
        path: "/budgets",
        title: "Budgets",
        component: "MobileBudgets",
        requiresAuth: true,
        states: {
          loading: "Loading budgets...",
          loaded: "Budgets loaded",
          empty: "No budgets set",
          error: "Failed to load budgets",
          success: "Budgets displayed",
          unauthorized: "No permission",
          offline: "Show last cached budgets",
        },
        sections: ["budget-list", "category-filters", "progress-bars", "add-budget"],
        actions: [
          { label: "Create budget", handler: "submit" },
          { label: "Edit budget", handler: "submit" },
          { label: "Delete budget", handler: "delete" },
        ],
      },
      "/insights": {
        path: "/insights",
        title: "Insights",
        component: "MobileInsights",
        requiresAuth: true,
        states: {
          loading: "Loading insights...",
          loaded: "Insights loaded",
          empty: "No insights available",
          error: "Failed to load insights",
          success: "Insights displayed",
          unauthorized: "No permission",
          offline: "Show last cached insights",
        },
        sections: ["spending-trends", "income-breakdown", "savings-goals", "anomalies"],
        actions: [
          { label: "Change time period", handler: "submit" },
          { label: "Set savings goal", handler: "submit" },
          { label: "Share insights", handler: "share" },
        ],
      },
    },
    userJourneys: [
      {
        id: "account-setup",
        label: "Account setup flow",
        description: "Connect bank → Set goals → Import history → Start tracking",
        requiresAuth: false,
        formFields: ["bank-credentials", "goal-amount", "time-period"],
      },
      {
        id: "first-transaction",
        label: "First transaction flow",
        description: "Add transaction → Categorize → View impact → Update budgets",
        requiresAuth: true,
        formFields: ["amount", "category", "date", "description"],
      },
    ],
    authFlow: "email-otp",
    states: {
      loading: false,
      loaded: true,
      empty: false,
      error: null,
      success: false,
      unauthorized: false,
      offline: false,
    },
    responsiveBreakpoints: {
      mobile: { layout: "full-width", nav: "bottom-tabs", hideSecondary: true },
      tablet: { layout: "split", nav: "bottom-tabs", hideSecondary: false },
    },
    requiredComponents: ["bottom-tabs", "balance-card", "transaction-list", "budget-progress", "chart-widget"],
    optionalComponents: ["currency-converter", "bill-splitter", "investment-tracker", "receipt-scanner"],
    backendNeeded: true,
    apiRoutes: [
      "POST /api/auth/login",
      "POST /api/auth/refresh",
      "POST /api/auth/logout",
      "GET /api/accounts",
      "POST /api/accounts/connect",
      "GET /api/transactions",
      "POST /api/transactions",
      "GET /api/budgets",
      "POST /api/budgets",
      "GET /api/insights",
      "POST /api/insights/goal",
    ],
    databaseModels: ["User", "Account", "Transaction", "Budget", "Goal", "Category", "Insight"],
    designLanguage: "minimal-luxury",
  },

  // === AI APPLICATION (Video Editor) ===

  "ai-video-editor": {
    name: "AI Video Editor",
    description: "AI-powered video editing with timeline, AI tools, and export.",
    section: "ai",
    archetype: "ai-app",
    navigation: "floating",
    primaryNav: [
      { key: "projects", label: "Projects", exact: true },
      { key: "timeline", label: "Timeline", exact: false },
      { key: "ai-tools", label: "AI Tools", exact: false },
      { key: "export", label: "Export", exact: false },
    ],
    pages: {
      "/": {
        path: "/",
        title: "Projects",
        component: "AIVideoProjects",
        requiresAuth: true,
        states: {
          loading: "Loading projects...",
          loaded: "Projects loaded",
          empty: "No projects found",
          error: "Failed to load projects",
          success: "Project loaded",
          unauthorized: "No permission",
          offline: "Show last cached projects",
        },
        sections: ["project-grid", "create-new", "recent"],
        actions: [
          { label: "Create new project", handler: "submit" },
          { label: "Import video", handler: "upload" },
          { label: "Delete project", handler: "delete" },
        ],
      },
      "/timeline": {
        path: "/timeline",
        title: "Timeline Editor",
        component: "AIVideoTimeline",
        requiresAuth: true,
        dependents: ["/"],
        states: {
          loading: "Loading timeline...",
          loaded: "Timeline ready",
          empty: "No clips in timeline",
          error: "Failed to load timeline",
          success: "Clips added",
          unauthorized: "Cannot edit",
          offline: "View last cached timeline",
        },
        sections: ["clip-track", "playhead", "timeline-tools", "preview-monitor"],
        actions: [
          { label: "Add clip", handler: "upload", confirmation: "Clip added to timeline" },
          { label: "Trim clip", handler: "trim", confirmation: "Clip trimmed" },
          { label: "AI generate segment", handler: "ai-generate", confirmation: "AI segment generated" },
          { label: "Remove clip", handler: "delete", confirmation: "Clip removed" },
        ],
      },
      "/ai-tools": {
        path: "/ai-tools",
        title: "AI Tools",
        component: "AIVideoAITools",
        requiresAuth: true,
        states: {
          loading: "Loading AI tools...",
          loaded: "Tools available",
          empty: "No tools for current selection",
          error: "AI generation failed",
          success: "Tool applied",
          unauthorized: "Cannot access tools",
          offline: "Use local AI models",
        },
        sections: ["scene-generation", "captions", "voice-over", "effects", "color-grade"],
        actions: [
          { label: "Generate scene", handler: "ai-generate", confirmation: "Scene generated" },
          { label: "Add captions", handler: "ai-generate" },
          { label: "Generate voice", handler: "ai-generate" },
          { label: "Apply effect", handler: "ai-generate" },
        ],
      },
      "/export": {
        path: "/export",
        title: "Export",
        component: "AIVideoExport",
        requiresAuth: true,
        states: {
          loading: "Preparing export...",
          loaded: "Export settings configured",
          empty: "No export settings",
          error: "Export failed",
          success: "Export completed",
          unauthorized: "Cannot export",
          offline: "Local export only",
        },
        sections: ["format-selector", "resolution-selector", "quality-slider", "progress-bar"],
        actions: [
          { label: "Start render", handler: "submit", confirmation: "Render started" },
          { label: "Cancel export", handler: "navigate", target: "/" },
          { label: "Download file", handler: "download", confirmation: "File downloaded" },
        ],
      },
    },
    userJourneys: [
      {
        id: "new-project",
        label: "New project creation",
        description: "Import video → Set up timeline → Apply AI tools → Export",
        requiresAuth: true,
        formFields: ["video-file", "project-name", "target-format"],
      },
      {
        id: "ai-generation",
        label: "AI generation flow",
        description: "Select tool → Configure parameters → Generate → Review → Apply",
        requiresAuth: true,
        formFields: ["tool-type", "parameters"],
        successPath: "/timeline",
        errorPath: "/ai-tools",
      },
    ],
    authFlow: "email-otp",
    states: {
      loading: false,
      loaded: true,
      empty: false,
      error: null,
      success: false,
      unauthorized: false,
      offline: false,
    },
    responsiveBreakpoints: {
      mobile: { layout: "vertical", nav: "bottom-tabs", hideSecondary: true },
      tablet: { layout: "two-column", nav: "floating", hideSecondary: false },
      laptop: { layout: "three-column", nav: "floating", hideSecondary: false },
      desktop: { layout: "four-column", nav: "floating", hideSecondary: false },
    },
    requiredComponents: ["timeline", "preview-monitor", "ai-tool-palette", "export-panel", "progress-bar"],
    optionalComponents: ["multi-cam-view", "audio-editor", "color-wheels", "3d-textures"],
    backendNeeded: true,
    apiRoutes: [
      "POST /api/auth/login",
      "POST /api/auth/refresh",
      "POST /api/auth/logout",
      "POST /api/projects",
      "GET /api/projects/[id]",
      "PATCH /api/projects/[id]",
      "POST /api/projects/[id]/clips",
      "POST /api/ai-tools/generate",
      "GET /api/export/settings",
      "POST /api/export/render",
    ],
    databaseModels: ["Project", "Clip", "AITool", "Export", "RenderHistory", "UserPreference"],
    designLanguage: "futuristic",
  },

  // === E-COMMERCE ===

  ecommerce: {
    name: "E-commerce Store",
    description: "Complete shopping experience with catalog, cart, checkout, and orders.",
    section: "webapps",
    archetype: "ecommerce",
    navigation: "top-bar",
    primaryNav: [
      { key: "home", label: "Home", href: "/", exact: true },
      { key: "shop", label: "Shop", href: "/shop", exact: false },
      { key: "cart", label: "Cart", href: "/cart", exact: false },
      { key: "orders", label: "Orders", href: "/orders", exact: false },
      { key: "account", label: "Account", href: "/account", exact: false },
    ],
    pages: {
      "/": {
        path: "/",
        title: "Home",
        component: "ECommerceHome",
        requiresAuth: false,
        states: {
          loading: "Loading featured products...",
          loaded: "Home content loaded",
          empty: "No products available",
          error: "Failed to load home",
          success: "Products displayed",
          unauthorized: false,
          offline: "Show last cached products",
        },
        sections: ["hero-banner", "product-cards", "categories", "newsletter"],
        actions: [
          { label: "Shop by category", handler: "navigate", target: "/shop" },
          { label: "Subscribe", handler: "submit" },
        ],
      },
      "/shop": {
        path: "/shop",
        title: "Shop",
        component: "ECommerceShop",
        requiresAuth: false,
        states: {
          loading: "Loading products...",
          loaded: "Products loaded",
          empty: "No products found",
          error: "Failed to load products",
          success: "Products displayed",
          unauthorized: false,
          offline: "Show last cached products",
        },
        sections: ["product-grid", "filters", "sort-selector", "load-more"],
        actions: [
          { label: "Filter by category", handler: "filter" },
          { label: "Sort by price", handler: "sort" },
          { label: "Load more products", handler: "load-more" },
        ],
      },
      "/product/[id]": {
        path: "/product/[id]",
        title: "Product Detail",
        component: "ECommerceProductDetail",
        requiresAuth: false,
        dependents: ["/shop"],
        states: {
          loading: "Loading product details...",
          loaded: "Product loaded",
          empty: "Product not found",
          error: "Product unavailable",
          success: "Product displayed",
          unauthorized: "Product unavailable",
          offline: "Show cached product details",
        },
        sections: ["product-media", "price-and-variants", "reviews", "specs", "add-to-cart"],
        actions: [
          { label: "Select variant", handler: "submit" },
          { label: "Add to cart", handler: "submit", confirmation: "Item added to cart" },
          { label: "Write review", handler: "navigate", target: "/product/[id]/review" },
          { label: "Share product", handler: "share" },
        ],
      },
      "/cart": {
        path: "/cart",
        title: "Cart",
        component: "ECommerceCart",
        requiresAuth: false,
        states: {
          loading: "Loading cart...",
          loaded: "Cart loaded",
          empty: "Cart is empty",
          error: "Failed to load cart",
          success: "Cart updated",
          unauthorized: "Cart unavailable",
          offline: "Show last cached cart",
        },
        sections: ["cart-items", "summary", "coupon-code", "proceed-to-checkout"],
        actions: [
          { label: "Update quantity", handler: "submit" },
          { label: "Remove item", handler: "delete", confirmation: "Item removed from cart" },
          { label: "Apply coupon", handler: "submit" },
          { label: "Proceed to checkout", handler: "submit", confirmation: "Checkout started" },
        ],
      },
      "/checkout": {
        path: "/checkout",
        title: "Checkout",
        component: "ECommerceCheckout",
        requiresAuth: false,
        states: {
          loading: "Loading checkout...",
          loaded: "Checkout configured",
          empty: "Cart is empty",
          error: "Checkout failed",
          success: "Order confirmed",
          unauthorized: "Checkout unavailable",
          offline: "Cannot checkout while offline",
        },
        sections: ["billing-info", "shipping-info", "payment-method", "order-summary", "place-order"],
        actions: [
          { label: "Add discount code", handler: "submit" },
          { label: "Save address", handler: "submit" },
          { label: "Select payment method", handler: "submit" },
          { label: "Place order", handler: "submit", confirmation: "Order confirmed" },
        ],
      },
      "/orders": {
        path: "/orders",
        title: "Orders",
        component: "ECommerceOrders",
        requiresAuth: true,
        states: {
          loading: "Loading orders...",
          loaded: "Orders loaded",
          empty: "No orders found",
          error: "Failed to load orders",
          success: "Orders displayed",
          unauthorized: "No permission",
          offline: "Show last cached orders",
        },
        sections: ["order-list", "order-status", "track-order", "return-item"],
        actions: [
          { label: "Track order", handler: "navigate", target: "/orders/[id]/track" },
          { label: "Initiate return", handler: "submit", confirmation: "Return started" },
          { label: "Reorder", handler: "submit" },
        ],
      },
      "/orders/[id]/track": {
        path: "/orders/[id]/track",
        title: "Order Tracking",
        component: "ECommerceOrderTracking",
        requiresAuth: true,
        dependents: ["/orders"],
        states: {
          loading: "Loading tracking info...",
          loaded: "Tracking info loaded",
          empty: "No tracking info",
          error: "Tracking unavailable",
          success: "Tracking displayed",
          unauthorized: "No permission",
          offline: "Show last cached tracking",
        },
        sections: ["status-timeline", "delivery-details", "contact-carrier"],
        actions: [],
      },
    },
    userJourneys: [
      {
        id: "shopping-flow",
        label: "Complete shopping flow",
        description: "Browse → Add to cart → Checkout → Payment → Order confirmation",
        requiresAuth: false,
        formFields: ["email", "shipping-address", "payment-details"],
        validation: {
          email: ["Please enter a valid email"],
          "shipping-address": ["Shipping address is required"],
        },
        successPath: "/orders",
        errorPath: "/checkout",
      },
      {
        id: "first-time-buyer",
        label: "First-time buyer flow",
        description: "Create account → Browse → Add to cart → Checkout → First order",
        requiresAuth: false,
        formFields: ["name", "email", "password", "shipping-address"],
      },
    ],
    authFlow: "email-otp",
    states: {
      loading: false,
      loaded: true,
      empty: false,
      error: null,
      success: false,
      unauthorized: false,
      offline: false,
    },
    responsiveBreakpoints: {
      mobile: { layout: "column", nav: "bottom-tabs", hideSecondary: true },
      tablet: { layout: "two-column", nav: "top-bar", hideSecondary: false },
      laptop: { layout: "three-column", nav: "top-bar", hideSecondary: false },
      desktop: { layout: "four-column", nav: "top-bar", hideSecondary: false },
    },
    requiredComponents: ["navbar", "product-card", "filter-sidebar", "cart-badge", "checkout-flow"],
    optionalComponents: ["product-gallery", "quick-view", "reviews-carousel", "recommendations", "wishlist"],
    backendNeeded: true,
    apiRoutes: [
      "POST /api/auth/login",
      "POST /api/auth/refresh",
      "POST /api/auth/logout",
      "GET /api/products",
      "GET /api/products/[id]",
      "POST /api/cart",
      "PATCH /api/cart/[id]",
      "DELETE /api/cart/[id]",
      "POST /api/orders",
      "GET /api/orders",
      "GET /api/orders/[id]",
      "POST /api/payments",
      "GET /api/payments/[id]",
    ],
    databaseModels: ["Product", "Category", "Variant", "Cart", "CartItem", "Order", "OrderItem", "Payment", "Customer", "Review"],
    designLanguage: "editorial-commerce",
  },
};

/**
 * Helper function to get architecture by family ID
 */
export function getArchitecture(familyId: string): ProductArchetypeArchitecture | undefined {
  return PRODUCT_ARCHITECTURES[familyId];
}

/**
 * Helper function to get all available family IDs
 */
export function getAllFamilyIds(): string[] {
  return Object.keys(PRODUCT_ARCHITECTURES);
}

/**
 * Helper function to check if architecture exists for a family
 */
export function hasArchitecture(familyId: string): boolean {
  return familyId in PRODUCT_ARCHITECTURES;
}

/**
 * Responsive breakdown helper
 */
export function getResponsiveConfig(
  architecture: ProductArchetypeArchitecture,
  breakpoint: "mobile" | "tablet" | "laptop" | "desktop"
) {
  return architecture.responsiveBreakpoints[breakpoint];
}

export default PRODUCT_ARCHITECTURES;