import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { Reveal } from '@/components/site/reveal';
import { SiteFooter } from '@/components/site/footer';
import { baseOptions } from '@/lib/layout.shared';

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <HomeLayout {...baseOptions()}>
      <span id="top" />
      {children}
      <SiteFooter />
      <Reveal />
    </HomeLayout>
  );
}
