import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// The role editor must not offer a manageable checkbox for a permission held
// regardless of the role. `basic` (every user) is always locked. `implied_by`
// is global catalog metadata, so it locks the checkbox ONLY when this role
// actually holds the source grant; otherwise the implied permission is a
// normal, editable grant. Locked permissions render checked + disabled and
// never reach the save payload.

const bulkUpdateMock = vi.fn().mockResolvedValue({ id: 'r1', permissions_by_resource: {} });

// Stable references: loadData depends on [id, t, navigate]; fresh identities
// each render would re-fire the effect in a loop (stuck loading).
const navigateStub = vi.fn();
const tStub = (k: string) => k;
vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: 'r1' }),
  useNavigate: () => navigateStub,
}));

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: tStub, currentLanguage: 'en' }),
}));

vi.mock('@/contexts/PermissionsContext', () => ({
  usePermissions: () => ({ can: () => true, isReady: true, loading: false }),
}));

// Mutable so each test can seed the role's real grants before rendering.
let rolePermissions: Record<string, string[]> = { labels: ['create'] };

vi.mock('@/services/roles/rolesService', () => ({
  rolesService: {
    get: vi.fn().mockImplementation(() =>
      Promise.resolve({
        id: 'r1',
        name: 'Agent',
        description: '',
        permissions_by_resource: rolePermissions,
      }),
    ),
    bulkUpdatePermissions: (...args: unknown[]) => bulkUpdateMock(...args),
  },
}));

vi.mock('@/services/permissions', () => ({
  permissionsService: {
    getResourceActions: vi.fn().mockResolvedValue({
      data: {
        resources: {
          conversations: {
            name: 'Conversations',
            description: '',
            actions: {
              read: { name: 'View', description: '', basic: false, implied_by: null },
            },
          },
          labels: {
            name: 'Labels',
            description: '',
            actions: {
              read: { name: 'View', description: '', basic: true, implied_by: null },
              create: { name: 'Create', description: '', basic: false, implied_by: null },
            },
          },
          users: {
            // users.read is only carried operationally by conversations.read.
            name: 'Users',
            description: '',
            actions: {
              read: { name: 'View', description: '', basic: false, implied_by: 'conversations.read' },
            },
          },
          // CRM domain, with a nested child (pipeline_stages under pipelines).
          pipelines: {
            name: 'Pipelines',
            description: '',
            actions: {
              read: { name: 'View', description: '', basic: false, implied_by: null },
            },
          },
          pipeline_stages: {
            name: 'Pipeline Stages',
            description: '',
            actions: {
              read: { name: 'View', description: '', basic: false, implied_by: null },
            },
          },
          // Channels domain: nested child (working_hours) + an inbox template action.
          inboxes: {
            name: 'Inboxes',
            description: '',
            actions: {
              read: { name: 'View', description: '', basic: false, implied_by: null },
              message_templates: { name: 'List templates', description: '', basic: false, implied_by: null },
            },
          },
          working_hours: {
            name: 'Working Hours',
            description: '',
            actions: {
              read: { name: 'View', description: '', basic: false, implied_by: null },
            },
          },
          // AI domain: a normal action next to a system action (leak guard).
          ai_agents: {
            name: 'AI Agents',
            description: '',
            actions: {
              read: { name: 'View', description: 'Manage AI robots', basic: false, implied_by: null },
              secret_sync: { name: 'Secret sync', description: '', system: true },
            },
          },
          // 100% system resource — its card must not render (AC3).
          installation_configs: {
            name: 'Installation Configs',
            description: '',
            actions: {
              manage: { name: 'Manage', description: '', system: true },
            },
          },
          // Fake resource absent from every domain → falls into "Others" (NFR4).
          zzz_new_feature: {
            name: 'Future Feature',
            description: '',
            actions: {
              read: { name: 'View', description: '', basic: false, implied_by: null },
            },
          },
          // Hidden resources: the catalog still ships them, the editor must not.
          oauth_applications: {
            name: 'OAuth Applications',
            description: '',
            actions: {
              read: { name: 'View', description: '', basic: false, implied_by: null },
              create: { name: 'Create', description: '', basic: false, implied_by: null },
            },
          },
          whatsapp_authorizations: {
            name: 'WhatsApp Authorizations',
            description: '',
            actions: {
              read: { name: 'View', description: '', basic: false, implied_by: null },
              create: { name: 'Create', description: '', basic: false, implied_by: null },
            },
          },
          ai_folders: {
            name: 'AI Folders',
            description: '',
            actions: {
              read: { name: 'View', description: '', basic: false, implied_by: null },
            },
          },
          ai_tools: {
            name: 'AI Custom Tools',
            description: '',
            actions: {
              read: { name: 'View', description: '', basic: false, implied_by: null },
              available: { name: 'Available', description: '', basic: false, implied_by: null },
            },
          },
        },
      },
    }),
    clearPermissionsCache: vi.fn(),
  },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import RoleDetail from './RoleDetail';

beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

beforeEach(() => {
  bulkUpdateMock.mockClear();
  rolePermissions = { labels: ['create'] };
});

const cb = (key: string) => document.getElementById(key) as HTMLButtonElement | null;

describe('RoleDetail — locked basic/implied permissions', () => {
  it('locks basic always, but leaves an implied permission editable when its source is not held', async () => {
    // Role holds labels.create only (no conversations.read).
    render(<RoleDetail />);
    await waitFor(() => expect(cb('labels.read')).not.toBeNull());

    // Basic: checked despite the role not granting it, and not editable.
    expect(cb('labels.read')).toBeDisabled();
    expect(cb('labels.read')).toHaveAttribute('data-state', 'checked');

    // Implied by a grant this role does NOT hold → a normal, editable checkbox
    // reflecting its real (ungranted) state.
    expect(cb('users.read')).not.toBeDisabled();
    expect(cb('users.read')).toHaveAttribute('data-state', 'unchecked');

    // A genuinely managed permission stays editable.
    expect(cb('labels.create')).not.toBeDisabled();
  });

  it('locks/unlocks the implied permission reactively as its source is toggled', async () => {
    render(<RoleDetail />);
    await waitFor(() => expect(cb('users.read')).not.toBeNull());

    // Source absent → implied editable.
    expect(cb('users.read')).not.toBeDisabled();

    // Grant the source → implied becomes locked + checked.
    await userEvent.click(cb('conversations.read') as HTMLElement);
    await waitFor(() => expect(cb('users.read')).toBeDisabled());
    expect(cb('users.read')).toHaveAttribute('data-state', 'checked');

    // Revoke the source → implied is editable again.
    await userEvent.click(cb('conversations.read') as HTMLElement);
    await waitFor(() => expect(cb('users.read')).not.toBeDisabled());
  });

  it('excludes an implied permission from the payload while its source is held', async () => {
    // Role holds the source grant, so users.read is locked (backend-derived).
    rolePermissions = { conversations: ['read'], labels: ['create'] };
    render(<RoleDetail />);
    await waitFor(() => expect(cb('users.read')).not.toBeNull());

    expect(cb('users.read')).toBeDisabled();
    expect(cb('users.read')).toHaveAttribute('data-state', 'checked');

    await userEvent.click(screen.getByText('savePermissions'));

    await waitFor(() => expect(bulkUpdateMock).toHaveBeenCalled());
    const savedKeys = bulkUpdateMock.mock.calls[0][1] as string[];
    expect(savedKeys).toContain('conversations.read');
    expect(savedKeys).toContain('labels.create');
    // Locked (implied + basic) keys are never persisted as role grants.
    expect(savedKeys).not.toContain('users.read');
    expect(savedKeys).not.toContain('labels.read');
  });

  it('persists an implied permission when checked without its source held', async () => {
    render(<RoleDetail />);
    await waitFor(() => expect(cb('users.read')).not.toBeNull());

    // Source absent → the implied checkbox is a real grant the user can set.
    await userEvent.click(cb('users.read') as HTMLElement);
    expect(cb('users.read')).toHaveAttribute('data-state', 'checked');

    await userEvent.click(screen.getByText('savePermissions'));

    await waitFor(() => expect(bulkUpdateMock).toHaveBeenCalled());
    const savedKeys = bulkUpdateMock.mock.calls[0][1] as string[];
    expect(savedKeys).toContain('users.read');
    expect(savedKeys).toContain('labels.create');
    expect(savedKeys).not.toContain('labels.read');
  });
});

// EVO-2071: presentation-only regrouping of the role editor by domain, with a
// future-proof "Others" fallback, hidden system actions, a text filter, and
// visual nesting. No enforcement/lock behaviour changes (covered above).
describe('RoleDetail — domain grouping, system filter, search, nesting', () => {
  // In the DOM, does `a` come before `b`?
  const precedes = (a: Element, b: Element) =>
    Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

  it('renders resources grouped under domain headers in the curated order (AC1)', async () => {
    render(<RoleDetail />);
    await waitFor(() => expect(cb('conversations.read')).not.toBeNull());

    const attendance = screen.getByText('domains.attendance');
    const crm = screen.getByText('domains.crm');
    const ai = screen.getByText('domains.ai');
    const channels = screen.getByText('domains.channels');
    const admin = screen.getByText('domains.admin');
    const others = screen.getByText('domains.others');

    // Curated order: attendance → crm → ai → channels → admin → others.
    expect(precedes(attendance, crm)).toBe(true);
    expect(precedes(crm, ai)).toBe(true);
    expect(precedes(ai, channels)).toBe(true);
    expect(precedes(channels, admin)).toBe(true);
    expect(precedes(admin, others)).toBe(true);

    // Empty domains (no present resource) never render a header.
    expect(screen.queryByText('domains.contacts')).toBeNull();
    expect(screen.queryByText('domains.automation')).toBeNull();
  });

  it('never renders a hidden resource, in any domain or under "Others"', async () => {
    render(<RoleDetail />);
    await waitFor(() => expect(cb('conversations.read')).not.toBeNull());

    ['oauth_applications', 'whatsapp_authorizations', 'ai_folders', 'ai_tools'].forEach(resource => {
      expect(cb(`${resource}.read`)).toBeNull();
      expect(cb(`resource-${resource}`)).toBeNull();
    });
    expect(screen.queryByText('OAuth Applications')).toBeNull();
    expect(screen.queryByText('WhatsApp Authorizations')).toBeNull();
    expect(screen.queryByText('AI Folders')).toBeNull();
  });

  it('hiding a resource does not revoke a grant the role already holds', async () => {
    rolePermissions = { oauth_applications: ['read'], labels: ['create'] };
    render(<RoleDetail />);
    await waitFor(() => expect(cb('labels.create')).not.toBeNull());
    expect(cb('oauth_applications.read')).toBeNull();

    await userEvent.click(screen.getByText('savePermissions'));
    await waitFor(() => expect(bulkUpdateMock).toHaveBeenCalled());
    const savedKeys = bulkUpdateMock.mock.calls[0][1] as string[];
    expect(savedKeys).toContain('oauth_applications.read');
  });

  // Regression: bulk_update_permissions replaces the whole set, so omitting a held
  // system key deletes it. ai_agent_processor.execute gates the chat WebSocket.
  it('re-sends system grants the role already holds instead of stripping them', async () => {
    rolePermissions = { ai_agents: ['read', 'secret_sync'], labels: ['create'] };
    render(<RoleDetail />);
    await waitFor(() => expect(cb('ai_agents.read')).not.toBeNull());

    // Still no checkbox for it — hidden, but not forgotten.
    expect(cb('ai_agents.secret_sync')).toBeNull();

    await userEvent.click(screen.getByText('savePermissions'));
    await waitFor(() => expect(bulkUpdateMock).toHaveBeenCalled());
    const savedKeys = bulkUpdateMock.mock.calls[0][1] as string[];
    expect(savedKeys).toContain('ai_agents.secret_sync');
    expect(savedKeys).toContain('ai_agents.read');
  });

  it('places a catalog resource outside every domain under "Others" (NFR4/AC2)', async () => {
    render(<RoleDetail />);
    await waitFor(() => expect(cb('zzz_new_feature.read')).not.toBeNull());
    expect(screen.getByText('domains.others')).toBeTruthy();
    // The fake resource is claimed by "Others", after every real domain.
    expect(precedes(screen.getByText('domains.admin'), screen.getByText('domains.others'))).toBe(true);
  });

  it('hides system actions and drops a fully-system resource card (AC3)', async () => {
    render(<RoleDetail />);
    await waitFor(() => expect(cb('ai_agents.read')).not.toBeNull());

    // System action → no checkbox at all.
    expect(cb('ai_agents.secret_sync')).toBeNull();
    // Resource with only system actions → no card (no rows, no select-all).
    expect(cb('installation_configs.manage')).toBeNull();
    expect(cb('resource-installation_configs')).toBeNull();
  });

  it('never leaks a system key into the payload via the card select-all (AC3/NFR1)', async () => {
    render(<RoleDetail />);
    await waitFor(() => expect(cb('resource-ai_agents')).not.toBeNull());

    // "Select all" on a card that mixes a normal + a system action.
    await userEvent.click(cb('resource-ai_agents') as HTMLElement);
    expect(cb('ai_agents.read')).toHaveAttribute('data-state', 'checked');

    await userEvent.click(screen.getByText('savePermissions'));
    await waitFor(() => expect(bulkUpdateMock).toHaveBeenCalled());
    const savedKeys = bulkUpdateMock.mock.calls[0][1] as string[];
    expect(savedKeys).toContain('ai_agents.read');
    expect(savedKeys).not.toContain('ai_agents.secret_sync');
  });

  it('filters resources/domains by resource name, action name, or description (AC4)', async () => {
    render(<RoleDetail />);
    await waitFor(() => expect(cb('conversations.read')).not.toBeNull());

    // "robots" only appears in ai_agents.read's description.
    await userEvent.type(screen.getByPlaceholderText('detail.filterPlaceholder'), 'robots');

    await waitFor(() => expect(cb('conversations.read')).toBeNull());
    expect(cb('ai_agents.read')).not.toBeNull();
    // Domains with no surviving resource disappear.
    expect(screen.queryByText('domains.attendance')).toBeNull();
    expect(screen.getByText('domains.ai')).toBeTruthy();
  });

  it('nests pipeline_stages and working_hours inside their parent cards (AC6)', async () => {
    render(<RoleDetail />);
    await waitFor(() => expect(cb('pipelines.read')).not.toBeNull());

    // Nested action rows render (keys unchanged)...
    expect(cb('pipeline_stages.read')).not.toBeNull();
    expect(cb('working_hours.read')).not.toBeNull();
    // ...but never as their own resource card (no card-level select-all).
    expect(cb('resource-pipeline_stages')).toBeNull();
    expect(cb('resource-working_hours')).toBeNull();

    // Sub-labels for the nested blocks and inbox templates are present.
    expect(screen.getByText('detail.nested.pipelineStages')).toBeTruthy();
    expect(screen.getByText('detail.nested.workingHours')).toBeTruthy();
    expect(screen.getByText('detail.nested.inboxTemplates')).toBeTruthy();
    // The inbox template action is grouped, still keyed under inboxes.*.
    expect(cb('inboxes.message_templates')).not.toBeNull();
  });
});
