export const workshopNavItems = [
  {
    label: 'Start',
    href: '/start/',
    match: ['/start/'],
    sidebarLabels: ['Start'],
  },
  {
    label: '基础操作',
    href: '/basics/',
    match: ['/basics/', '/operate/'],
    sidebarLabels: ['基础操作'],
  },
  {
    label: '最佳实践',
    href: '/best-practices/',
    match: ['/best-practices/', '/practice/'],
    sidebarLabels: ['最佳实践'],
  },
  {
    label: 'AI on TKE',
    href: '/ai-ml/',
    match: ['/ai-ml/', '/ai-on-tke/'],
    sidebarLabels: ['AI on TKE'],
  },
  {
    label: 'Data on TKE',
    href: '/data/',
    match: ['/data/'],
    sidebarLabels: ['Data on TKE'],
  },
  {
    label: 'Cookbooks',
    href: '/cookbooks/',
    match: ['/cookbooks/'],
    sidebarLabels: [],
  },
  {
    label: 'Contribute',
    href: '/contribute/',
    match: ['/contribute/'],
    sidebarLabels: ['Contribute'],
  },
];

export function normalizePathname(pathname) {
  if (!pathname) return '/';
  const path = pathname.split('?')[0].split('#')[0];
  return path.endsWith('/') ? path : `${path}/`;
}

export function getActiveNavItem(pathname) {
  const normalizedPathname = normalizePathname(pathname);
  return workshopNavItems.find((item) =>
    item.match.some((prefix) => normalizedPathname.startsWith(prefix))
  );
}
