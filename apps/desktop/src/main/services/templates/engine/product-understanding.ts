/**
 * RIDE Product Understanding Engine.
 *
 * This engine analyzes user prompts and maps them to complete product architectures.
 * It understands:
 * - What product type the user wants
 * - The specific variant/sub-type
 * - Required features and flows
 * - Authentication needs
 * - Backend/database requirements
 * - State management requirements
 * - Mobile vs desktop adaptation
 *
 * The output drives the scaffold generator, component library selection,
 * and state system configuration.
 */

import type { ProductArchetypeArchitecture, UserJourneyStep } from "./product-architecture";
import type { Section, ArchetypeId } from "../catalog";

/**
 * Parse the user prompt to extract product type, variant, and key parameters.
 */
function parsePrompt(prompt: string): {
  productType: string;
  variant?: string;
  parameters: Record<string, string>;
} {
  const lower = prompt.toLowerCase();
  const params: Record<string, string> = {};

  // Extract product type from known categories
  const productTypes: Record<string, { section: Section; archetype: ArchetypeId }> = {
    // Websites
    portfolio: { section: "websites", archetype: "portfolio" },
    agency: { section: "websites", archetype: "landing" },
    startup: { section: "websites", archetype: "saas" },
    blog: { section: "websites", archetype: "blog" },
    documentation: { section: "websites", archetype: "docs" },
    personal: { section: "websites", archetype: "portfolio" },
    restaurant: { section: "websites", archetype: "landing" },
    hotel: { section: "websites", archetype: "landing" },
    event: { section: "websites", archetype: "landing" },
    education: { section: "websites", archetype: "landing" },
    healthcare: { section: "websites", archetype: "landing" },
    realestate: { section: "websites", archetype: "landing" },
    finance: { section: "websites", archetype: "landing" },

    // Web apps
    saas: { section: "webapps", archetype: "saas" },
    crm: { section: "webapps", archetype: "dashboard" },
    erp: { section: "webapps", archetype: "dashboard" },
    adminpanel: { section: "webapps", archetype: "dashboard" },
    analytics: { section: "webapps", archetype: "dashboard" },
    projectmanagement: { section: "webapps", archetype: "dashboard" },
    ecommerce: { section: "webapps", archetype: "ecommerce" },
    marketplace: { section: "webapps", archetype: "ecommerce" },
    socialnetwork: { section: "webapps", archetype: "social" },
    learningplatform: { section: "webapps", archetype: "dashboard" },

    // AI applications
    "ai-chatbot": { section: "ai", archetype: "ai-app" },
    rag: { section: "ai", archetype: "ai-app" },
    "ai-agent": { section: "ai", archetype: "ai-app" },
    "ai-saas": { section: "ai", archetype: "saas" },
    "document-analyzer": { section: "ai", archetype: "ai-app" },
    "ai-customersupport": { section: "ai", archetype: "ai-app" },
    "ai-search": { section: "ai", archetype: "ai-app" },

    // Mobile
    "mobile-social": { section: "mobile", archetype: "pwa" },
    "mobile-fitness": { section: "mobile", archetype: "pwa" },
    "mobile-finance": { section: "mobile", archetype: "pwa" },
    "mobile-ecommerce": { section: "mobile", archetype: "pwa" },
    "mobile-productivity": { section: "mobile", archetype: "pwa" },
    "mobile-education": { section: "mobile", archetype: "pwa" },

    // Desktop
    "dev-tools": { section: "desktop", archetype: "pwa" },
    "desktop-productivity": { section: "desktop", archetype: "pwa" },
    "media": { section: "desktop", archetype: "pwa" },
    "file-manager": { section: "desktop", archetype: "pwa" },
    "business-software": { section: "desktop", archetype: "dashboard" },

    // Developer
    "rest-api": { section: "developer", archetype: "api" },
    "graphql-api": { section: "developer", archetype: "api" },
    cli: { section: "developer", archetype: "cli" },
    sdk: { section: "developer", archetype: "package" },
    packages: { section: "developer", archetype: "package" },
    "browser-extension": { section: "developer", archetype: "extension" },

    // Games
    "game-2d": { section: "games", archetype: "arcade" },
    "game-3d": { section: "games", archetype: "arcade" },
    "game-multiplayer": { section: "games", archetype: "arcade" },
    "game-puzzle": { section: "games", archetype: "arcade" },
    "game-arcade": { section: "games", archetype: "arcade" },
  };

  // Detect product type
  let detectedType: string | null = null;
  for (const [type, info] of Object.entries(productTypes)) {
    if (lower.includes(type)) {
      detectedType = type;
      break;
    }
  }

  if (!detectedType) {
    // Default to portfolio if nothing matches
    return {
      productType: "portfolio",
      variant: "Minimal Developer",
      parameters: {},
    };
  }

  const info = productTypes[detectedType];

  // Extract variant if mentioned
  let variant: string | undefined = undefined;
  const variantMatch = lower.match(/(minimal|premium|creative|technical|corporate|bold|modern|minimalist|luxury|brutal|glass|neon|swiss|editorial|data-dense|industrial|cinematic|playful|architectural|experimental)\s+(portfolio|saas|dashboard|ecommerce|social|ai|mobile|desktop)/i);
  if (variantMatch) {
    variant = variantMatch[1]!.toLowerCase() + " " + variantMatch[2];
  }

  // Extract key parameters
  // AI app persona
  const personaMatch = lower.match(/(general assistant|coding copilot|writer|research)/i);
  if (personaMatch) {
    params.persona = personaMatch[1]!.toLowerCase();
  }

  // SaaS product name / audience
  const productNameMatch = lower.match(/(ai|saas|analytics|crm|ecommerce|fintech|healthtech|edtech)\s+(.+?)(?:app|platform|system|software)?/i);
  if (productNameMatch) {
    params.product = productNameMatch[2]!.trim();
  }

  // Restaurant specifics
  if (detectedType === "restaurant") {
    const cuisineMatch = lower.match(/(indian|mexican|italian|chinese|japanese|thai|french|american|organic|vegan|vegetarian|seafood|steak|bbq)/i);
    if (cuisineMatch) {
      params.cuisine = cuisineMatch[1]!.toLowerCase();
    }
    const locationMatch = lower.match(/(in|at|city|town|lor|street)\s+(\w+)/i);
    if (locationMatch) {
      params.location = locationMatch[2]!.toLowerCase();
    }
  }

  // eCommerce specifics
  if (detectedType === "ecommerce" || detectedType === "mobile-ecommerce") {
    const categoryMatch = lower.match(/(fashion|electronics|home|beauty|general|grocery|electronics|books|music|movies|sports)/i);
    if (categoryMatch) {
      params.category = categoryMatch[1]!.toLowerCase();
    }
  }

  // Social network specifics
  if (detectedType === "socialnetwork") {
    const networkTypeMatch = lower.match(/(community|creator|professional|student|gaming|interest|private|photo|discussion)/i);
    if (networkTypeMatch) {
      params.type = networkTypeMatch[1]!.toLowerCase();
    }
  }

  // Finance specifics
  if (detectedType === "finance" || detectedType === "mobile-finance") {
    const focusMatch = lower.match(/(spending|saving|investing|budgeting|expense|income|tax|insurance|retirement)/i);
    if (focusMatch) {
      params.focus = focusMatch[1]!.toLowerCase();
    }
  }

  // Video editor specifics
  if (detectedType === "ai-video-editor") {
    const focusMatch = lower.match(/(social|instagram|tiktok|youtube|long-form|short-form|music|vlog|corporate)/i);
    if (focusMatch) {
      params.focus = focusMatch[1]!.toLowerCase();
    }
  }

  // CRM specifics
  if (detectedType === "crm") {
    const industryMatch = lower.match(/(real-estate|healthcare|education|finance|e-commerce|agency|freelance|enterprise)/i);
    if (industryMatch) {
      params.industry = industryMatch[1]!.toLowerCase();
    }
  }

  // Dashboard specifics
  if (detectedType === "erp") {
    const industryMatch = lower.match(/(manufacturing|retail|school|hospital|restaurant|construction|inventory|enterprise|small-business)/i);
    if (industryMatch) {
      params.industry = industryMatch[1]!.toLowerCase();
    }
  }

  // Project management specifics
  if (detectedType === "projectmanagement") {
    const methodologyMatch = lower.match(/(kanban|agile|scrum|waterfall|lean|six-sigma)/i);
    if (methodologyMatch) {
      params.methodology = methodologyMatch[1]!.toLowerCase();
    }
  }

  return {
    productType: detectedType,
    variant,
    parameters: params,
  };
}

/**
 * Select the appropriate architecture based on parsed prompt.
 */
function selectArchitecture(parsed: {
  productType: string;
  variant?: string;
  parameters: Record<string, string>;
}): ProductArchetypeArchitecture {
  const architectures = require("./product-architecture").default;
  const familyId = parsed.productType;

  // Try to get exact architecture
  if (architectures[familyId]) {
    let arch = architectures[familyId];

    // Apply variant-specific modifications if variant exists
    if (parsed.variant && arch.userJourneys) {
      // Find or create a variant-specific journey
      const variantJourney = arch.userJourneys.find(
        (j: UserJourneyStep) => j.label.toLowerCase().includes(parsed.variant!.toLowerCase())
      );
      if (variantJourney) {
        // Merge variant journey with default
        arch = {
          ...arch,
          userJourneys: [
            ...arch.userJourneys.filter((j: UserJourneyStep) => j.id !== variantJourney.id),
            variantJourney,
          ],
        };
      }
    }

    // Apply parameter modifications
    if (Object.keys(parsed.parameters).length > 0) {
      arch = applyParameterModifications(arch, parsed.parameters);
    }

    return arch;
  }

  // Fallback: try to find similar architecture
  const fallbackMap: Record<string, string> = {
    portfolio: "portfolio",
    saas: "saas",
    landing: "saas",
    webapps: "saas",
    ai: "ai-video-editor",
    mobile: "mobile-social",
    desktop: "dev-tools",
    games: "game-2d",
    developer: "rest-api",
    starter: "personal",
  };

  const fallbackFamily = fallbackMap[familyId] || "portfolio";
  if (architectures[fallbackFamily]) {
    return architectures[fallbackFamily];
  }

  // Last resort - return portfolio
  return architectures.portfolio;
}

/**
 * Apply parameter modifications to architecture.
 */
function applyParameterModifications(
  arch: ProductArchetypeArchitecture,
  params: Record<string, string>
): ProductArchetypeArchitecture {
  const modified = { ...arch };

  // Modify design language based on parameters
  if (params.persona) {
    switch (params.persona) {
      case "coding copilot":
        modified.designLanguage = "data-dense";
        break;
      case "writer":
        modified.designLanguage = "editorial";
        break;
      case "research":
        modified.designLanguage = "data-dense";
        break;
      case "general assistant":
      default:
        // Keep existing design language
        break;
    }
  }

  // Modify based on industry/vertical
  if (params.industry) {
    switch (params.industry) {
      case "real-estate":
        modified.designLanguage = "editorial-commerce";
        break;
      case "healthcare":
        modified.designLanguage = "industrial";
        break;
      case "education":
        modified.designLanguage = "data-dense";
        break;
      case "finance":
        modified.designLanguage = "minimal-luxury";
        break;
      case "e-commerce":
        modified.designLanguage = "editorial-commerce";
        break;
    }
  }

  // Modify based on focus
  if (params.focus) {
    switch (params.focus) {
      case "social":
        if (modified.designLanguage !== "playful") {
          // Add social-oriented features
          ;(modified.userJourneys ??= []).push({
            id: "social-setup",
            label: "Social setup",
            description: "Connect social accounts and configure preferences",
            requiresAuth: true,
            formFields: ["social-platforms"],
          });
        }
        break;
      case "ecommerce":
        // Add ecommerce features
        ;(modified.userJourneys ??= []).push({
          id: "ecommerce-setup",
          label: "Store setup",
          description: "Configure products, pricing, and payment",
          requiresAuth: true,
          formFields: ["product-categories", "pricing", "payment-method"],
        });
        break;
      case "budgeting":
        if (modified.section === "mobile") {
          ;(modified.userJourneys ??= []).push({
            id: "budget-setup",
            label: "Budget setup",
            description: "Set up income, expenses, and savings goals",
            requiresAuth: true,
            formFields: ["income", "fixed-expenses", "savings-goal"],
          });
        }
        break;
      case "generation":
        if (modified.section === "ai") {
          ;(modified.userJourneys ??= []).push({
            id: "ai-generation",
            label: "AI generation",
            description: "Configure AI tools and generate content",
            requiresAuth: true,
            formFields: ["tool-type", "parameters"],
          });
        }
        break;
    }
  }

  // Modify based on cuisine for restaurant
  if (params.cuisine) {
    ;(modified.userJourneys ??= []).push({
      id: "cuisine-setup",
      label: "Cuisine configuration",
      description: `Configure ${params.cuisine} menu items and settings`,
      requiresAuth: false,
      formFields: [`${params.cuisine}-menu-items`],
    });
  }

  // Modify based on category for ecommerce
  if (params.category) {
    ;(modified.userJourneys ??= []).push({
      id: "category-setup",
      label: "Category configuration",
      description: `Set up ${params.category} product categories`,
      requiresAuth: true,
      formFields: [`${params.category}-categories`],
    });
  }

  // Modify based on network type for social
  if (params.type) {
    ;(modified.userJourneys ??= []).push({
      id: "network-setup",
      label: "Network configuration",
      description: `Configure ${params.type} network settings`,
      requiresAuth: true,
      formFields: ["platform", "privacy-level"],
    });
  }

  return modified;
}

/**
 * Product Understanding Engine - main entry point.
 * Analyzes a prompt and returns the complete product architecture.
 */
export function understandPrompt(prompt: string): {
  architecture: ProductArchetypeArchitecture;
  parsed: ReturnType<typeof parsePrompt>;
  generatedAt: number;
} {
  const parsed = parsePrompt(prompt);
  const architecture = selectArchitecture(parsed);

  return {
    architecture,
    parsed,
    generatedAt: Date.now(),
  };
}

/**
 * Generate a user journey from the architecture based on user context.
 */
export function generateUserJourney(
  architecture: ProductArchetypeArchitecture,
  userContext?: {
    experienceLevel?: "beginner" | "intermediate" | "advanced";
    goals?: string[];
    preferences?: string[];
  }
): UserJourneyStep[] {
  const journeys = architecture.userJourneys;

  if (!userContext || journeys.length === 0) {
    return journeys;
  }

  // Modify journeys based on user context
  const modified: UserJourneyStep[] = [];

  for (const journey of journeys) {
    // Skip journeys that don't match user goals
    const goals = userContext?.goals;
    if (goals && goals.length > 0) {
      const goalMatch = goals.some((goal) =>
        journey.label.toLowerCase().includes(goal.toLowerCase())
      );
      if (!goalMatch) continue;
    }

    // Add experience-level adjustments
    let formFields = [...(journey.formFields || [])];
    if (userContext?.experienceLevel === "beginner") {
      // Simplify form fields for beginners
      formFields = formFields.filter((field) => field !== "advanced-option");
    } else if (userContext?.experienceLevel === "advanced") {
      // Add advanced options
      formFields = [...formFields, "advanced-option", "custom-integration"];
    }

    modified.push({
      ...journey,
      formFields,
    });
  }

  // If user has specific goals not covered, add new journeys
  const goals = userContext?.goals;
  if (goals && goals.length > 0 && modified.length < journeys.length) {
    goals.forEach((goal) => {
      const exists = modified.some((j) => j.label.toLowerCase().includes(goal.toLowerCase()));
      if (!exists) {
        modified.push({
          id: `goal-${goal}`,
          label: `${goal.replace(/^-/, "").replace(/-/g, " ")} Flow`,
          description: ` ${goal} workflow`,
          requiresAuth: true,
          formFields: [],
        });
      }
    });
  }

  return modified;
}

/**
 * Get architecture recommendations based on prompt analysis.
 */
export function getArchitectureRecommendations(prompt: string): {
  primary: ProductArchetypeArchitecture;
  alternatives: ProductArchetypeArchitecture[];
  rationale: string[];
} {
  const result = understandPrompt(prompt);
  const primary = result.architecture;

  // Generate alternatives by trying other product types
  const productTypes: string[] = [
    "portfolio",
    "saas",
    "landing",
    "ecommerce",
    "social",
    "mobile-social",
    "ai-video-editor",
    "rest-api",
  ];

  const alternatives = productTypes
    .filter((type) => type !== result.parsed.productType)
    .map((type) => {
      const fallbackMap: Record<string, string> = {
        portfolio: "saas",
        saas: "ecommerce",
        landing: "ecommerce",
        webapps: "social",
        ai: "ai-video-editor",
        mobile: "mobile-social",
        desktop: "dev-tools",
        games: "game-2d",
        developer: "rest-api",
        starter: "personal",
      };
      const family = fallbackMap[result.parsed.productType] || "portfolio";
      return require("./product-architecture").default[family];
    })
    .filter((arch): arch is ProductArchetypeArchitecture => arch !== undefined);

  // Deduplicate alternatives
  const seen = new Set<string>();
  const uniqueAlternatives = alternatives.filter(
    (arch) => {
      const key = JSON.stringify(arch.pages);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }
  );

  const rationale = [
    `Primary recommendation: ${primary.name} ${primary.section} ${primary.archetype}`,
    `Matches detected product type: ${result.parsed.productType}`,
    `Variant: ${result.parsed.variant || "default"}`,
    `Design language: ${primary.designLanguage}`,
    `Requires ${primary.backendNeeded ? "backend" : "frontend-only"}` +
      `${primary.apiRoutes.length > 0 ? ` with ${primary.apiRoutes.length} API routes` : ""}`,
  ];

  return {
    primary,
    alternatives: uniqueAlternatives.slice(0, 3),
    rationale,
  };
}

/**
 * Extract a lightweight user context (experience level + goals) from the raw
 * prompt. Used to tailor the generated user journeys.
 */
export function userContextFromPrompt(prompt: string): {
  experienceLevel?: "beginner" | "intermediate" | "advanced";
  goals?: string[];
  preferences?: string[];
} {
  const lower = prompt.toLowerCase();
  const goals: string[] = [];
  const preferences: string[] = [];

  if (/\b(beginner|new to|no experience|first time|simple)\b/.test(lower)) goals.push("beginner-friendly");
  if (/\b(advanced|expert|power user|pro)\b/.test(lower)) goals.push("advanced");

  const wantMatch = lower.match(/(?:i want|i need|i'm looking for|help me|build me|create|make)\s+(?:a|an|to|my|for)?\s*([a-z0-9 .,-]{3,60})/i);
  if (wantMatch && !wantMatch[1]!.includes("portfolio")) {
    goals.push(wantMatch[1]!.trim().replace(/[.,]$/, ""));
  }

  if (/\b(dark|light|minimal|modern|professional|creative)\b/.test(lower)) {
    preferences.push(...(lower.match(/\b(dark|light|minimal|modern|professional|creative)\b/g) ?? []));
  }

  return { experienceLevel: /\b(advanced|expert)\b/.test(lower) ? "advanced" : /\b(beginner|new to)\b/.test(lower) ? "beginner" : undefined, goals, preferences };
}

export default { understandPrompt, getArchitectureRecommendations, generateUserJourney, parsePrompt };