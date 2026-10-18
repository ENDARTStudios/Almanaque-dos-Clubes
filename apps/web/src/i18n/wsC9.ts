/**
 * WS-C-9 Modo Clube — strings da seção "Comunidade" no perfil do clube.
 * Mesmo padrão de wsC2/wsC5/wsC7/wsC8: módulo próprio ×3 locales, paridade
 * travada pelo tipo.
 *
 * WS-C-9 gates C1–C4 (critériios do Operador, 18-10-2026): o fluxo "Sou editor"
 * mostra os critérios (Elite + prova de vínculo + revisão humana em 5 dias
 * úteis), coleta a evidência e traduz os erros novos da API. Copy honesta:
 * nada de aprovação automática escondida.
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
  // --- gates C1–C4 ---
  becomeOwnerTitle: string;
  criteriaIntro: string;
  criteriaElite: string;
  criteriaEvidence: string;
  criteriaReview: string;
  evidenceUrlLabel: string;
  evidenceUrlPlaceholder: string;
  evidenceNoteLabel: string;
  evidenceNotePlaceholder: string;
  submitClaim: string;
  submitting: string;
  claimSent: string;
  errPlanRequired: string;
  errEvidenceRequired: string;
  errManualCuration: string;
  errEditorsFull: string;
  errOwnershipRevoked: string;
  errOwnershipPending: string;
  errOwnershipSuspended: string;
  errGeneric: string;
  statusPending: string;
  statusSuspended: string;
  statusRevoked: string;
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
        becomeOwnerTitle: 'Tornar-se editor deste clube',
        criteriaIntro: 'Três condições — e a aprovação é humana, nunca automática:',
        criteriaElite:
          'Plano Elite ativo (pago ou concedido) no momento do pedido — e mantido ao publicar.',
        criteriaEvidence:
          'Prova de vínculo verificável por terceiro: e-mail no domínio do clube, cargo no site oficial, ata de diretoria ou ofício. Um link ou uma nota breve basta.',
        criteriaReview:
          'Revisão humana em até 5 dias úteis. Enquanto isso, você pode usar a proposta da comunidade abaixo.',
        evidenceUrlLabel: 'Link da prova (opcional se houver nota)',
        evidenceUrlPlaceholder: 'https://clube.com.br/diretoria…',
        evidenceNoteLabel: 'Nota de vínculo (opcional se houver link)',
        evidenceNotePlaceholder: 'Ex.: sou diretor de comunicação, eleito na ata de 03/2026…',
        submitClaim: 'Enviar para revisão',
        submitting: 'Enviando…',
        claimSent:
          'Pedido enviado. A moderação responde em até 5 dias úteis — a posse só publica depois de aprovada.',
        errPlanRequired:
          'Editor de clube exige plano Elite ativo (pago ou concedido). Assine para continuar.',
        errEvidenceRequired: 'Falta a prova de vínculo: informe um link ou uma nota verificável.',
        errManualCuration:
          'Seleções nacionais não aceitam auto-serviço — a curadoria é manual do Operador.',
        errEditorsFull: 'Este clube já tem 1 editor + 3 curadores (limite). Fale com a moderação.',
        errOwnershipRevoked:
          'Sua posse neste clube foi revogada pela moderação. Se discorda, fale com o suporte.',
        errOwnershipPending: 'Seu pedido já está em revisão (até 5 dias úteis).',
        errOwnershipSuspended:
          'Posse suspensa: o plano Elite não está ativo. Renove para publicar — seu histórico foi preservado.',
        errGeneric: 'Não foi possível enviar. Tente de novo.',
        statusPending:
          'Seu pedido de editor está em revisão (até 5 dias úteis). Aprovado, você publica direto.',
        statusSuspended:
          'Sua posse está suspensa: o plano Elite não está ativo. Renove o Elite para publicar — histórico preservado.',
        statusRevoked:
          'Sua posse neste clube foi revogada pela moderação. Se discorda, fale com o suporte.',
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
        becomeOwnerTitle: 'Become an editor of this club',
        criteriaIntro: 'Three conditions — and approval is human, never automatic:',
        criteriaElite:
          'An active Elite plan (paid or granted) at the time of the request — and kept when publishing.',
        criteriaEvidence:
          'Third-party verifiable proof of affiliation: e-mail on the club domain, role on the official site, board minutes or official letter. One link or a short note suffices.',
        criteriaReview:
          'Human review within 5 business days. Meanwhile, you can use the community proposal below.',
        evidenceUrlLabel: 'Proof link (optional if a note is given)',
        evidenceUrlPlaceholder: 'https://club.com/board…',
        evidenceNoteLabel: 'Affiliation note (optional if a link is given)',
        evidenceNotePlaceholder: 'E.g.: communications director, elected in the 03/2026 minutes…',
        submitClaim: 'Submit for review',
        submitting: 'Submitting…',
        claimSent:
          'Request sent. Moderation replies within 5 business days — publishing only after approval.',
        errPlanRequired:
          'Club editors need an active Elite plan (paid or granted). Subscribe to continue.',
        errEvidenceRequired: 'Missing proof of affiliation: provide a link or a verifiable note.',
        errManualCuration:
          'National teams are not self-service — curation is handled manually by the Operator.',
        errEditorsFull: 'This club already has 1 editor + 3 curators (limit). Contact moderation.',
        errOwnershipRevoked:
          'Your ownership of this club was revoked by moderation. If you disagree, contact support.',
        errOwnershipPending: 'Your request is already under review (up to 5 business days).',
        errOwnershipSuspended:
          'Ownership suspended: the Elite plan is not active. Renew to publish — your history is preserved.',
        errGeneric: 'Could not submit. Please try again.',
        statusPending:
          'Your editor request is under review (up to 5 business days). Once approved, you publish directly.',
        statusSuspended:
          'Your ownership is suspended: the Elite plan is not active. Renew Elite to publish — history preserved.',
        statusRevoked:
          'Your ownership of this club was revoked by moderation. If you disagree, contact support.',
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
        becomeOwnerTitle: 'Convertirse en editor de este club',
        criteriaIntro: 'Tres condiciones — y la aprobación es humana, nunca automática:',
        criteriaElite:
          'Plan Elite activo (pago o concedido) al momento de la solicitud — y mantenido al publicar.',
        criteriaEvidence:
          'Prueba de vínculo verificable por terceros: correo en el dominio del club, cargo en el sitio oficial, acta de directorio u oficio. Basta un enlace o una nota breve.',
        criteriaReview:
          'Revisión humana en hasta 5 días hábiles. Mientras tanto, puedes usar la propuesta de la comunidad de abajo.',
        evidenceUrlLabel: 'Enlace de la prueba (opcional si hay nota)',
        evidenceUrlPlaceholder: 'https://club.com.ar/directorio…',
        evidenceNoteLabel: 'Nota de vínculo (opcional si hay enlace)',
        evidenceNotePlaceholder: 'Ej.: director de comunicación, elegido en el acta de 03/2026…',
        submitClaim: 'Enviar a revisión',
        submitting: 'Enviando…',
        claimSent:
          'Solicitud enviada. La moderación responde en hasta 5 días hábiles — solo se publica tras la aprobación.',
        errPlanRequired:
          'Ser editor del club requiere el plan Elite activo (pago o concedido). Suscríbete para continuar.',
        errEvidenceRequired:
          'Falta la prueba de vínculo: informa un enlace o una nota verificable.',
        errManualCuration:
          'Las selecciones nacionales no aceptan autoservicio — la curaduría es manual del Operador.',
        errEditorsFull:
          'Este club ya tiene 1 editor + 3 curadores (límite). Habla con la moderación.',
        errOwnershipRevoked:
          'Tu posesión en este club fue revocada por la moderación. Si no estás de acuerdo, contacta al soporte.',
        errOwnershipPending: 'Tu solicitud ya está en revisión (hasta 5 días hábiles).',
        errOwnershipSuspended:
          'Posesión suspendida: el plan Elite no está activo. Renuévalo para publicar — el historial se conserva.',
        errGeneric: 'No se pudo enviar. Inténtalo de nuevo.',
        statusPending:
          'Tu solicitud de editor está en revisión (hasta 5 días hábiles). Aprobada, publicas directamente.',
        statusSuspended:
          'Tu posesión está suspendida: el plan Elite no está activo. Renueva el Elite para publicar — historial conservado.',
        statusRevoked:
          'Tu posesión en este club fue revocada por la moderación. Si no estás de acuerdo, contacta al soporte.',
      },
    },
  };
