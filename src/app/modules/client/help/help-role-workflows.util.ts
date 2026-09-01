import {
  HELP_MODULE_GUIDES,
  HELP_QUICK_TASKS,
  HelpArticle,
  HelpModuleGuide,
  HelpQuickTask,
  isHelpModuleVisible,
} from './help-content.data';
import {
  HELP_ROLE_WORKFLOWS,
  HelpRoleKey,
  HelpRoleWorkflowConfig,
  HelpWorkflowBlock,
  HelpWorkflowStep,
  VALID_HELP_ROLE_KEYS,
} from './help-role-workflows.data';

export const HELP_SELECTED_ROLE_KEY = 'hms-help-selected-role';

type ModuleFlags = Parameters<typeof isHelpModuleVisible>[1];

export function sanitizeHelpRoleKey(value: string | null | undefined): HelpRoleKey {
  const key = (value || '') as HelpRoleKey;
  return VALID_HELP_ROLE_KEYS.has(key) ? key : '';
}

export function readStoredHelpRole(): HelpRoleKey {
  try {
    return sanitizeHelpRoleKey(localStorage.getItem(HELP_SELECTED_ROLE_KEY));
  } catch {
    return '';
  }
}

export function storeHelpRole(roleKey: HelpRoleKey): void {
  try {
    localStorage.setItem(HELP_SELECTED_ROLE_KEY, roleKey);
  } catch {
    // ignore storage failures
  }
}

export function isHelpRoleVisible(roleKey: HelpRoleKey, moduleFlags: ModuleFlags): boolean {
  switch (roleKey) {
    case 'laboratory':
      return moduleFlags.laboratory;
    case 'pharmacy':
      return moduleFlags.pharmacy;
    case 'ward':
      return moduleFlags.ward;
    case 'accountant':
      return moduleFlags.accounts;
    case 'doctor':
    case 'receptionist':
      return moduleFlags.clinical;
    case 'owner':
      return moduleFlags.setup || moduleFlags.accounts;
    default:
      return true;
  }
}

function isStepVisible(step: HelpWorkflowStep, moduleFlags: ModuleFlags): boolean {
  if (!step.module) return true;
  return isHelpModuleVisible(step.module, moduleFlags);
}

function filterBlock(block: HelpWorkflowBlock, moduleFlags: ModuleFlags): HelpWorkflowBlock | null {
  if (block.type === 'note' || block.type === 'heading') return block;
  const items = block.items.filter((item) => isStepVisible(item, moduleFlags));
  if (!items.length) return null;
  return { ...block, items };
}

export function resolveRoleWorkflow(
  roleKey: HelpRoleKey,
  moduleFlags: ModuleFlags
): HelpRoleWorkflowConfig {
  const base = HELP_ROLE_WORKFLOWS[sanitizeHelpRoleKey(roleKey)];
  const desktopBlocks = base.desktopBlocks
    .map((block) => filterBlock(block, moduleFlags))
    .filter((block): block is HelpWorkflowBlock => Boolean(block));
  const mobileSteps = base.mobileSteps.filter((step) => isStepVisible(step, moduleFlags));

  return {
    ...base,
    desktopBlocks,
    mobileSteps,
  };
}

export function getRoleQuickTaskSlugs(roleKey: HelpRoleKey): string[] {
  const key = sanitizeHelpRoleKey(roleKey);
  return HELP_ROLE_WORKFLOWS[key].quickTaskSlugs;
}

export function getRoleCommonTaskSlugs(roleKey: HelpRoleKey): string[] {
  const key = sanitizeHelpRoleKey(roleKey);
  return HELP_ROLE_WORKFLOWS[key].commonTaskSlugs;
}

export function getRoleModuleGuideKeys(roleKey: HelpRoleKey): string[] {
  const key = sanitizeHelpRoleKey(roleKey);
  return HELP_ROLE_WORKFLOWS[key].moduleGuideKeys;
}

export function getRolePreferredGuideSlugs(roleKey: HelpRoleKey): string[] {
  const key = sanitizeHelpRoleKey(roleKey);
  return HELP_ROLE_WORKFLOWS[key].preferredGuideSlugs;
}

export function filterQuickTasksForRole(
  tasks: HelpQuickTask[],
  roleKey: HelpRoleKey,
  isTaskVisible: (task: HelpQuickTask) => boolean
): HelpQuickTask[] {
  const key = sanitizeHelpRoleKey(roleKey);
  const allowed = new Set(getRoleQuickTaskSlugs(key));
  const ordered = getRoleQuickTaskSlugs(key)
    .map((slug) => tasks.find((task) => task.slug === slug))
    .filter((task): task is HelpQuickTask => Boolean(task))
    .filter(isTaskVisible);

  if (!key) {
    return tasks.filter(isTaskVisible);
  }

  return ordered.length ? ordered : tasks.filter((task) => allowed.has(task.slug) && isTaskVisible(task));
}

export function filterModuleGuidesForRole(
  guides: HelpModuleGuide[],
  roleKey: HelpRoleKey,
  isGuideVisible: (guide: HelpModuleGuide) => boolean
): HelpModuleGuide[] {
  const key = sanitizeHelpRoleKey(roleKey);
  if (!key) {
    return guides.filter(isGuideVisible);
  }

  const allowed = new Set(getRoleModuleGuideKeys(key));
  const ordered = getRoleModuleGuideKeys(key)
    .map((guideKey) => guides.find((guide) => guide.key === guideKey))
    .filter((guide): guide is HelpModuleGuide => Boolean(guide))
    .filter(isGuideVisible);

  return ordered.length ? ordered : guides.filter((guide) => allowed.has(guide.key) && isGuideVisible(guide));
}

export function rankArticlesForRole(articles: HelpArticle[], roleKey: HelpRoleKey): HelpArticle[] {
  const preferred = getRolePreferredGuideSlugs(sanitizeHelpRoleKey(roleKey));
  if (!preferred.length) return articles;

  const rank = new Map(preferred.map((slug, index) => [slug, index]));
  return [...articles].sort((a, b) => {
    const aRank = rank.has(a.slug) ? rank.get(a.slug)! : Number.MAX_SAFE_INTEGER;
    const bRank = rank.has(b.slug) ? rank.get(b.slug)! : Number.MAX_SAFE_INTEGER;
    if (aRank !== bRank) return aRank - bRank;
    return a.title.localeCompare(b.title);
  });
}

export function workflowContainsLabel(workflow: HelpRoleWorkflowConfig, label: string): boolean {
  const normalized = label.toLowerCase();
  const inStep = (step: HelpWorkflowStep) => step.label.toLowerCase().includes(normalized);
  return (
    workflow.desktopBlocks.some((block) => {
      if (block.type === 'note' || block.type === 'heading') {
        return block.text.toLowerCase().includes(normalized);
      }
      return block.items.some(inStep);
    }) || workflow.mobileSteps.some(inStep)
  );
}

export function workflowNodeLabels(workflow: HelpRoleWorkflowConfig): string[] {
  const labels: string[] = [];
  for (const block of workflow.desktopBlocks) {
    if (block.type === 'note' || block.type === 'heading') {
      labels.push(block.text);
    } else {
      block.items.forEach((item) => labels.push(item.label));
    }
  }
  return labels;
}

export function getAllQuickTasks(): HelpQuickTask[] {
  return HELP_QUICK_TASKS;
}

export function getAllModuleGuides(): HelpModuleGuide[] {
  return HELP_MODULE_GUIDES;
}
