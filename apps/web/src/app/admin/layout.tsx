import type { Metadata } from 'next';
import AdminNav from '@/components/admin/AdminNav';

/**
 * T565 — o segmento `/admin` inteiro é `noindex`.
 *
 * Antes o `robots: noindex` estava só no `page.tsx` do índice, e as duas ferramentas
 * (`/admin/observability` e `/admin/reports`) ficavam sem a marca — justamente as páginas com
 * dado operacional. Um layout de segmento cobre as três de uma vez e não depende de alguém
 * lembrar de repetir a diretiva em cada página nova.
 *
 * `nocache` também: página interna não deve ficar em cache intermediário.
 *
 * T-ADMIN — este layout permanece SERVER COMPONENT porque precisa exportar o `metadata`
 * acima (um Client Component não pode exportá-lo). A faixa de navegação, que depende do
 * caminho atual (`usePathname`), vive no Client Component `AdminNav` e é montada aqui:
 * toda tela sob `/admin` ganha navegação e `noindex` por construção, sem repetição.
 */
export const metadata: Metadata = {
  title: 'Administração',
  description: 'Ferramentas internas do Almanaque dos Clubes.',
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AdminNav />
      {children}
    </>
  );
}
