import {
  HELP_SEARCH_ALIASES,
  HelpArticle,
  filterHelpArticlesByRole,
  isHelpModuleVisible,
} from './help-content.data';

export interface HelpSearchResult {
  article: HelpArticle;
  score: number;
  matchedFields: string[];
}

export interface HelpSearchOptions {
  roleKey?: string;
  moduleFlags?: Parameters<typeof isHelpModuleVisible>[1];
  preferredGuideSlugs?: string[];
}

const MODULE_LABELS: Record<string, string> = {
  clinical: 'Clinical & OPD',
  pharmacy: 'Pharmacy',
  laboratory: 'Laboratory',
  ward: 'Ward & Nursing',
  accounts: 'Billing / Accounts',
  nursery: 'Nursery / Newborn',
  setup: 'Hospital Setup',
};

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner / Admin',
  doctor: 'Doctor',
  receptionist: 'Receptionist',
  ward: 'Ward Receptionist / Nurse',
  laboratory: 'Laboratory',
  pharmacy: 'Pharmacy',
  accountant: 'Accountant',
};

function normalizeQuery(query: string): string {
  return query
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\bx\s*-\s*ray\b/g, 'xray')
    .replace(/\bx ray\b/g, 'xray');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function articleSummary(article: HelpArticle): string {
  return article.shortDescription || article.whenToUse || article.steps[0] || '';
}

export function articleRoleLabel(article: HelpArticle): string {
  if (article.roles?.length) {
    return article.roles.map((role) => ROLE_LABELS[role] || role).join(', ');
  }
  return article.whoCan;
}

export function articleNavigationLabel(article: HelpArticle): string {
  if (article.navigationPath?.length) {
    return article.navigationPath.join(' → ');
  }
  if (article.route) {
    return article.route;
  }
  return '';
}

export function buildArticleSearchIndex(article: HelpArticle) {
  const stepsText = [
    ...(article.steps || []),
    ...(article.beforeStart || []),
    ...(article.after || []),
    article.whenToUse || '',
    article.tip || '',
  ].join(' ');

  return {
    title: article.title.toLowerCase(),
    description: (article.shortDescription || '').toLowerCase(),
    category: article.category.toLowerCase(),
    whoCan: article.whoCan.toLowerCase(),
    module: (article.module ? MODULE_LABELS[article.module] || article.module : '').toLowerCase(),
    moduleKey: (article.module || '').toLowerCase(),
    roles: (article.roles || []).map((role) => ROLE_LABELS[role] || role).join(' ').toLowerCase(),
    keywords: (article.keywords || []).map((keyword) => keyword.toLowerCase()),
    aliases: (article.searchAliases || []).map((alias) => alias.toLowerCase()),
    navigationPath: (article.navigationPath || []).join(' ').toLowerCase(),
    route: (article.route || '').toLowerCase(),
    stepsText: stepsText.toLowerCase(),
    permissions: (article.permissions || '').toLowerCase(),
  };
}

const ARTICLE_INDEX_CACHE = new Map<string, ReturnType<typeof buildArticleSearchIndex>>();

function getArticleSearchIndex(article: HelpArticle) {
  if (!ARTICLE_INDEX_CACHE.has(article.slug)) {
    ARTICLE_INDEX_CACHE.set(article.slug, buildArticleSearchIndex(article));
  }
  return ARTICLE_INDEX_CACHE.get(article.slug)!;
}

function scoreArticle(article: HelpArticle, query: string, roleKey: string, preferredGuideSlugs: string[] = []): HelpSearchResult | null {
  const index = getArticleSearchIndex(article);
  const tokens = query.split(/\s+/).filter(Boolean);
  let score = 0;
  const matchedFields = new Set<string>();

  const preferredIndex = preferredGuideSlugs.indexOf(article.slug);
  if (preferredIndex >= 0) {
    score += 120 - preferredIndex * 5;
    matchedFields.add('role-preference');
  }

  const aliasSlugs = HELP_SEARCH_ALIASES[query] || [];
  if (aliasSlugs.includes(article.slug)) {
    score += 900;
    matchedFields.add('alias');
  }

  if (index.title === query) {
    score += 1000;
    matchedFields.add('title');
  } else if (index.title.includes(query)) {
    score += 420;
    matchedFields.add('title');
  }

  for (const alias of index.aliases) {
    if (alias === query) {
      score += 850;
      matchedFields.add('alias');
    } else if (alias.includes(query) || query.includes(alias)) {
      score += 320;
      matchedFields.add('alias');
    }
  }

  for (const keyword of index.keywords) {
    if (keyword === query) {
      score += 300;
      matchedFields.add('keyword');
    } else if (keyword.includes(query) || query.includes(keyword)) {
      score += 140;
      matchedFields.add('keyword');
    }
  }

  if (index.category.includes(query)) {
    score += 120;
    matchedFields.add('category');
  }
  if (index.module.includes(query) || index.moduleKey.includes(query)) {
    score += 110;
    matchedFields.add('module');
  }
  if (index.roles.includes(query) || index.whoCan.includes(query)) {
    score += 100;
    matchedFields.add('role');
  }
  if (index.description.includes(query)) {
    score += 80;
    matchedFields.add('description');
  }
  if (index.navigationPath.includes(query) || index.route.includes(query)) {
    score += 70;
    matchedFields.add('navigation');
  }
  if (index.stepsText.includes(query)) {
    score += 25;
    matchedFields.add('steps');
  }

  for (const token of tokens) {
    const tokenAliases = HELP_SEARCH_ALIASES[token] || [];
    if (tokenAliases.includes(article.slug)) {
      score += 180;
      matchedFields.add('alias');
    }
    if (index.title.includes(token)) score += 60;
    if (index.keywords.some((keyword) => keyword.includes(token) || token.includes(keyword))) {
      score += 50;
      matchedFields.add('keyword');
    }
    if (index.aliases.some((alias) => alias.includes(token) || token.includes(alias))) {
      score += 45;
      matchedFields.add('alias');
    }
    if (index.category.includes(token)) score += 35;
    if (index.description.includes(token)) score += 20;
    if (index.stepsText.includes(token)) score += 10;
  }

  if (roleKey && article.roles?.includes(roleKey)) {
    score += 40;
    matchedFields.add('role-preference');
  }

  if (score <= 0) return null;
  return { article, score, matchedFields: Array.from(matchedFields) };
}

export function searchHelpArticles(
  articles: HelpArticle[],
  query: string,
  options: HelpSearchOptions = {}
): HelpSearchResult[] {
  const normalized = normalizeQuery(query);
  if (!normalized) return [];

  const roleKey = options.roleKey || '';
  let filtered = filterHelpArticlesByRole(articles, roleKey);
  if (options.moduleFlags) {
    filtered = filtered.filter((article) => isHelpModuleVisible(article.module, options.moduleFlags!));
  }

  return filtered
    .map((article) => scoreArticle(article, normalized, roleKey, options.preferredGuideSlugs || []))
    .filter((item): item is HelpSearchResult => Boolean(item))
    .sort((a, b) => b.score - a.score || a.article.title.localeCompare(b.article.title));
}

export function highlightSearchText(text: string, query: string): string {
  const safeText = escapeHtml(text || '');
  const normalized = normalizeQuery(query);
  if (!normalized || !safeText) return safeText;

  const phrases = [normalized, ...normalized.split(/\s+/).filter((token) => token.length > 2)]
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp);

  let highlighted = safeText;
  for (const phrase of phrases) {
    highlighted = highlighted.replace(new RegExp(`(${phrase})`, 'gi'), '<mark class="help-search-mark">$1</mark>');
  }
  return highlighted;
}

export const HELP_SEARCH_HISTORY_KEY = 'hms-help-search-history';
export const HELP_SEARCH_HISTORY_LIMIT = 5;

export function readHelpSearchHistory(): string[] {
  try {
    const raw = localStorage.getItem(HELP_SEARCH_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string').slice(0, HELP_SEARCH_HISTORY_LIMIT) : [];
  } catch {
    return [];
  }
}

export function rememberHelpSearchTerm(query: string): string[] {
  const normalized = query.trim();
  if (!normalized) return readHelpSearchHistory();
  const next = [normalized, ...readHelpSearchHistory().filter((item) => item.toLowerCase() !== normalized.toLowerCase())].slice(
    0,
    HELP_SEARCH_HISTORY_LIMIT
  );
  try {
    localStorage.setItem(HELP_SEARCH_HISTORY_KEY, JSON.stringify(next));
  } catch {
    // ignore storage failures
  }
  return next;
}
