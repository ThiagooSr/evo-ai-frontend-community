// Presentation-only grouping for the role editor. Order mirrors the app's real
// navigation (menuItems.ts). This is NOT the RBAC source of truth — the catalog
// (auth-service ResourceActionsConfig) is. Adding a resource here changes only
// how it is grouped on screen; a resource absent from every domain still renders
// (under "Others"), so the catalog and the screen can never silently diverge.
export interface PermissionDomain {
  key: string;
  labelKey: string; // i18n key under the 'roles' locale
  resources: string[]; // curated order; nested resources stay listed so they are
  // claimed by a domain and never fall to "Others"
}

export const PERMISSION_DOMAINS: PermissionDomain[] = [
  {
    key: 'attendance',
    labelKey: 'domains.attendance',
    resources: ['conversations', 'canned_responses', 'macros', 'labels', 'csat_survey_responses'],
  },
  {
    key: 'contacts',
    labelKey: 'domains.contacts',
    resources: ['contacts', 'custom_attribute_definitions', 'segments', 'custom_filters'],
  },
  {
    key: 'crm',
    labelKey: 'domains.crm',
    resources: ['pipelines', 'pipeline_stages', 'products', 'crm_forms'], // pipeline_stages nested under pipelines (AC6)
  },
  {
    key: 'automation',
    labelKey: 'domains.automation',
    resources: ['automation_rules', 'journeys', 'campaigns'],
  },
  {
    key: 'ai',
    labelKey: 'domains.ai',
    // ai_tools/ai_folders/ai_mcp_servers were KEPT by the Story 1.1 audit (they
    // have live enforcement in the core-service and processor), so they must be
    // grouped here — otherwise they would fall into "Others".
    resources: [
      'ai_agents',
      'ai_tools',
      'ai_folders',
      'ai_mcp_servers',
      'ai_custom_tools',
      'ai_custom_mcp_servers',
      'ai_api_keys',
    ],
  },
  {
    key: 'channels',
    labelKey: 'domains.channels',
    resources: ['inboxes', 'working_hours', 'message_templates', 'chat_pages', 'webhooks', 'agent_bots', 'integrations'], // working_hours nested under inboxes (AC6)
  },
  {
    key: 'admin',
    labelKey: 'domains.admin',
    resources: ['users', 'teams', 'roles', 'accounts', 'access_tokens', 'templates', 'profiles'],
  },
];

// Nested resource -> parent resource. Nested ones render inside the parent card
// (AC6), never as their own card and never under "Others".
export const RESOURCE_NESTING: Record<string, string> = {
  pipeline_stages: 'pipelines',
  working_hours: 'inboxes',
};

// Inbox actions grouped under a "Templates" sub-label inside the inboxes card (AC6).
export const INBOX_TEMPLATE_ACTIONS: string[] = [
  'sync_whatsapp_templates',
  'whatsapp_templates',
  'update_whatsapp_template',
  'delete_whatsapp_template',
  'message_templates',
  'update_message_template',
  'delete_message_template',
];

export interface DomainGroup {
  key: string;
  labelKey: string;
  resources: string[];
}

const NESTED_RESOURCES = new Set(Object.keys(RESOURCE_NESTING));

/**
 * Group catalog resource keys into curated presentation domains.
 *
 * For each domain (in curated order) it keeps only the resources that are both
 * present in `resourceKeys` and not nested (nested resources render inside their
 * parent card). Any resource that belongs to no domain and is not nested is
 * collected into a trailing `others` group, so a resource newly added to the
 * auth-service catalog never disappears from the screen (NFR4). Empty groups are
 * omitted.
 */
export function groupResourcesByDomain(resourceKeys: string[]): DomainGroup[] {
  const present = new Set(resourceKeys);
  const claimed = new Set<string>();
  const groups: DomainGroup[] = [];

  for (const domain of PERMISSION_DOMAINS) {
    const resources = domain.resources.filter(r => {
      if (NESTED_RESOURCES.has(r)) {
        claimed.add(r); // nested resources are owned by their parent, never "Others"
        return false;
      }
      if (!present.has(r)) return false;
      claimed.add(r);
      return true;
    });
    if (resources.length > 0) {
      groups.push({ key: domain.key, labelKey: domain.labelKey, resources });
    }
  }

  const others = resourceKeys.filter(r => !claimed.has(r) && !NESTED_RESOURCES.has(r));
  if (others.length > 0) {
    groups.push({ key: 'others', labelKey: 'domains.others', resources: others });
  }

  return groups;
}
