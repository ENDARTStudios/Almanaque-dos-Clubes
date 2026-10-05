/**
 * WS-C-9 Modo Clube — strings da seção "Comunidade" no perfil do clube.
 * Mesmo padrão de wsC2/wsC5/wsC7/wsC8: módulo próprio ×3 locales, paridade
 * travada pelo tipo.
 */
export interface ClubCommunityStrings {
  title: string;
  aboutCommunity: string;
  owners: string;
  noOwners: string;
  becomeOwner: string;
  leaveOwner: string;
  editDescription: string;
  save: string;
  cancel: string;
  saved: string;
  saving: string;
  placeholder: string;
  loginToBecome: string;
  forbidden: string;
  empty: string;
  loginLink: string;
}

export const wsC9Strings: Record<'pt-br' | 'en-us' | 'es-es', { community: ClubCommunityStrings }> =
  {
    'pt-br': {
      community: {
        title: 'Comunidade',
        aboutCommunity: 'Sobre (comunidade)',
        owners: 'Editores do clube',
        noOwners: 'Nenhum editor ainda.',
        becomeOwner: 'Sou editor deste clube',
        leaveOwner: 'Deixar de ser editor',
        editDescription: 'Editar descrição',
        save: 'Salvar',
        cancel: 'Cancelar',
        saved: 'Descrição salva.',
        saving: 'Salvando…',
        placeholder: 'Escreva sobre o clube (máx. 2000 caracteres)…',
        loginToBecome: 'Entre na sua conta para se declarar editor do clube.',
        forbidden: 'Você não é editor deste clube.',
        empty: 'Ainda sem descrição da comunidade.',
        loginLink: 'Entrar',
      },
    },
    'en-us': {
      community: {
        title: 'Community',
        aboutCommunity: 'About (community)',
        owners: 'Club editors',
        noOwners: 'No editors yet.',
        becomeOwner: 'I am an editor of this club',
        leaveOwner: 'Stop being an editor',
        editDescription: 'Edit description',
        save: 'Save',
        cancel: 'Cancel',
        saved: 'Description saved.',
        saving: 'Saving…',
        placeholder: 'Write about the club (max. 2000 characters)…',
        loginToBecome: 'Sign in to declare yourself an editor of this club.',
        forbidden: 'You are not an editor of this club.',
        empty: 'No community description yet.',
        loginLink: 'Sign in',
      },
    },
    'es-es': {
      community: {
        title: 'Comunidad',
        aboutCommunity: 'Acerca de (comunidad)',
        owners: 'Editores del club',
        noOwners: 'Aún no hay editores.',
        becomeOwner: 'Soy editor de este club',
        leaveOwner: 'Dejar de ser editor',
        editDescription: 'Editar descripción',
        save: 'Guardar',
        cancel: 'Cancelar',
        saved: 'Descripción guardada.',
        saving: 'Guardando…',
        placeholder: 'Escribe sobre el club (máx. 2000 caracteres)…',
        loginToBecome: 'Inicia sesión para declararte editor del club.',
        forbidden: 'No eres editor de este club.',
        empty: 'Aún sin descripción de la comunidad.',
        loginLink: 'Iniciar sesión',
      },
    },
  };
