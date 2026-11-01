import { redirect } from 'next/navigation';

/**
 * T597 — /favoritos foi INTEGRADA ao Meu Almanaque (/dashboard): a área do
 * usuário tinha duas entradas de navegação com a mesma lógica ("Painel" e
 * "Meu Almanaque", esta última na verdade era a página de favoritos).
 * O painel de favoritos agora vive DENTRO de /dashboard (components/
 * FavoritosPanel.tsx); esta rota segue existindo só para não quebrar
 * bookmarks/links antigos.
 */
export default function FavoritosRedirect() {
  redirect('/dashboard');
}
