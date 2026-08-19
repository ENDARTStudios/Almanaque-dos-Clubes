// RBAC Matrix — Almanaque dos Clubes v1.0
// Papéis (Roles): user, admin — definem capacidade de agir
// Planos (Plans): free, pro, elite — definem acesso a features
// Anônimo = ausência de token JWT (Principal = null)
// Permissão = RoleGate AND PlanGate

export type Permission =
  | 'entity:read:preview'
  | 'entity:read:full'
  | 'ranking:read:visible'
  | 'ranking:read:complete'
  | 'ranking:filter'
  | 'ranking:custom-formula'
  | 'search:perform'
  | 'search:full-results'
  | 'comparison:two'
  | 'comparison:five'
  | 'history:season:5'
  | 'history:season:complete'
  | 'favorites:create'
  | 'favorites:unlimited'
  | 'album:standard'
  | 'album:foil'
  | 'album:exclusive'
  | 'album:secret'
  | 'collection:streak:daily'
  | 'collection:streak:unlimited'
  | 'collection:leaderboard'
  | 'collection:profile'
  | 'ia:chat'
  | 'api:access'
  | 'alerts:subscribe'
  | 'ads:opt-out'
  | 'support:prioritario';

// Role — papéis de sistema (capacidade de agir). Anônimo NÃO é role persistido.
export const Role = { USER: 'user', ADMIN: 'admin' } as const;
export type Role = (typeof Role)[keyof typeof Role];

// Plan — nível de assinatura (nível de recurso). free=0, pro=1, elite=2.
export const Plan = { FREE: 'free', PRO: 'pro', ELITE: 'elite' } as const;
export type Plan = (typeof Plan)[keyof typeof Plan];

// Ordering map para comparação ordenada de planos
export const PLAN_ORDER: Record<Plan, number> = {
  [Plan.FREE]: 0,
  [Plan.PRO]: 1,
  [Plan.ELITE]: 2,
};

// Principal autenticável: null representa acesso anônimo (sem token)
export type Principal = { role: Role; plan: Plan } | null;

// Plano mínimo exigido por permissão (plan gate)
export const permissionPlanGate: Record<Permission, Plan> = {
  'entity:read:preview': Plan.FREE,
  'entity:read:full': Plan.FREE,
  'ranking:read:visible': Plan.FREE,
  'ranking:read:complete': Plan.FREE,
  'ranking:filter': Plan.PRO,
  'ranking:custom-formula': Plan.ELITE,
  'search:perform': Plan.FREE,
  'search:full-results': Plan.FREE,
  'comparison:two': Plan.FREE,
  'comparison:five': Plan.PRO,
  'history:season:5': Plan.FREE,
  'history:season:complete': Plan.PRO,
  'favorites:create': Plan.FREE,
  'favorites:unlimited': Plan.PRO,
  'album:standard': Plan.FREE,
  'album:foil': Plan.PRO,
  'album:exclusive': Plan.ELITE,
  'album:secret': Plan.FREE,
  'collection:streak:daily': Plan.FREE,
  'collection:streak:unlimited': Plan.PRO,
  'collection:leaderboard': Plan.FREE,
  'collection:profile': Plan.FREE,
  'ia:chat': Plan.PRO,
  'api:access': Plan.ELITE,
  'alerts:subscribe': Plan.ELITE,
  'ads:opt-out': Plan.PRO,
  'support:prioritario': Plan.ELITE,
};

// Permissões de acesso anônimo (sem token): apenas preview
export const anonymousPermissions: Permission[] = [
  'entity:read:preview',
  'ranking:read:visible',
  'search:perform',
];

// Role → permissões que o role PODE verificar (sem considerar plano)
export const rolePermissions: Record<Role, Permission[]> = {
  [Role.USER]: [
    'entity:read:preview',
    'entity:read:full',
    'ranking:read:visible',
    'ranking:read:complete',
    'search:perform',
    'search:full-results',
    'comparison:two',
    'history:season:5',
    'history:season:complete',
    'favorites:create',
    'album:standard',
    'collection:streak:daily',
    'collection:leaderboard',
    'collection:profile',
    'album:secret',
    'ia:chat',
  ],
  [Role.ADMIN]: [
    'entity:read:preview',
    'entity:read:full',
    'ranking:read:visible',
    'ranking:read:complete',
    'ranking:filter',
    'ranking:custom-formula',
    'search:perform',
    'search:full-results',
    'comparison:five',
    'history:season:5',
    'history:season:complete',
    'favorites:unlimited',
    'album:foil',
    'album:exclusive',
    'collection:streak:unlimited',
    'collection:leaderboard',
    'collection:profile',
    'album:secret',
    'ia:chat',
    'api:access',
    'alerts:subscribe',
    'ads:opt-out',
    'support:prioritario',
  ],
};

// Verifica se o principal tem a permissão (anônimo → preview; role AND plan gate)
export function hasPermission(principal: Principal, permission: Permission): boolean {
  // 1. Anônimo (sem token): apenas preview
  if (principal === null) return anonymousPermissions.includes(permission);
  // 2. Admin tem tudo (bypass de plano)
  if (principal.role === Role.ADMIN) return true;
  // 3. Role gate
  const rolePerms = rolePermissions[principal.role];
  if (!rolePerms || !rolePerms.includes(permission)) return false;
  // 4. Plan gate
  const minPlan = permissionPlanGate[permission];
  if (!minPlan) return true;
  return PLAN_ORDER[principal.plan] >= PLAN_ORDER[minPlan];
}

// Verifica se o principal pode acessar uma feature pelo nome
export function canAccess(principal: Principal, feature: string): boolean {
  const featureMap: Record<string, Permission> = {
    'ranking-filtrar': 'ranking:filter',
    'ranking-custom': 'ranking:custom-formula',
    'comparison-5': 'comparison:five',
    'album-foil': 'album:foil',
    'album-exclusive': 'album:exclusive',
    'album-secret': 'album:secret',
    'ia-chat': 'ia:chat',
    'api-access': 'api:access',
    'sem-anuncios': 'ads:opt-out',
    'suporte-prioritario': 'support:prioritario',
  };
  const perm = featureMap[feature];
  if (!perm) return false;
  return hasPermission(principal, perm);
}
