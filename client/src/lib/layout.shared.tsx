import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { Package } from 'lucide-react';
import { Logo } from '@/components/site/logo';
import { gitConfig, npmUrl } from './shared';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: <Logo />,
    },
    links: [
      { text: 'Docs', url: '/docs', active: 'nested-url' },
      { text: 'Examples', url: '/examples' },
      { text: 'Playground', url: '/playground' },
      { type: 'icon', text: 'npm', label: 'post-canvas on npm', icon: <Package />, url: npmUrl, external: true },
    ],
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  };
}
