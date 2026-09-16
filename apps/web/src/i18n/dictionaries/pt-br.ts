import type { Dictionary } from '../types';

const pt: Dictionary = {
  site: {
    name: 'Almanaque dos Clubes',
    tagline: 'A história do futebol mundial num só lugar',
    description:
      'O maior acervo de dados históricos do futebol mundial. Pesquise clubes, jogadores, competições e rankings com inteligência artificial e fontes verificadas.',
  },
  nav: {
    clubs: 'Clubes',
    players: 'Jogadores',
    competitions: 'Competições',
    map: 'Mapa',
    rankings: 'Rankings',
    search: 'Busca',
    login: 'Entrar',
    dashboard: 'Painel',
    signOut: 'Sair',
  },
  footer: {
    tagline:
      'A história completa do futebol mundial ao seu alcance. Clubes, jogadores, competições e rankings auditáveis.',
    platformTitle: 'Plataforma',
    platformClubs: 'Clubes',
    platformPlayers: 'Jogadores',
    platformCompetitions: 'Competições',
    platformRankings: 'Rankings',
    platformSearch: 'Busca Avançada',
    aboutTitle: 'Sobre',
    aboutUs: 'Sobre nós',
    plans: 'Planos',
    api: 'API',
    blog: 'Blog',
    contact: 'Contato',
    telegram: 'Telegram',
    legalTitle: 'Legal',
    privacy: 'Privacidade',
    cookies: 'Cookies',
    terms: 'Termos de Uso',
    security: 'Segurança',
    copyright: 'Copyright © 2026 END ART Studios',
  },
  common: {
    loading: 'Carregando...',
    back: 'Voltar',
    backHome: 'Voltar ao início',
    viewAll: 'Ver tudo',
    learnMore: 'Saiba mais',
    comingSoonTitle: 'Módulo em desenvolvimento',
    comingSoonDesc: 'Em breve: conteúdo completo deste módulo.',
    resultsFor: 'Resultados para:',
    resultsNote:
      'A busca full-text será implementada com PostgreSQL tsvector + pg_trgm para fornecer resultados rápidos mesmo com grandes volumes de dados.',
    notFoundTitle: 'Página não encontrada',
    cookieBanner: {
      title: 'Sua privacidade importa',
      body: 'Usamos cookies necessários para autenticação, segurança e funcionamento. Com sua autorização, também podemos usar cookies opcionais para medir audiência, melhorar o serviço e, quando aplicável, realizar marketing. Você pode aceitar, rejeitar ou escolher por categoria; a recusa não impede as funções essenciais.',
      accept: 'Aceitar opcionais',
      reject: 'Rejeitar opcionais',
      manage: 'Gerenciar preferências',
      save: 'Salvar preferências',
      necessary: 'Cookies necessários — sempre ativos',
      necessaryAlways: 'Sempre ativos: indispensáveis para funcionamento e segurança',
      preferences: 'Cookies de preferências',
      analytics: 'Cookies de analytics',
      personalization: 'Cookies de personalização',
      marketing: 'Cookies de marketing/publicidade',
      footerManage: 'Gerenciar cookies',
    },
    notFoundDesc: 'O conteúdo que você procura não existe ou foi movido.',
  },
  home: {
    heroTitle: 'A História do Futebol',
    heroTitleAccent: 'num Só Lugar',
    heroSubtitle:
      'O maior acervo de dados históricos do futebol mundial. Pesquise clubes, jogadores, competições e rankings com inteligência artificial e fontes verificadas.',
    ctaSearch: 'Começar Pesquisa',
    ctaRegister: 'Criar Conta Gratuita',
    stats: {
      clubs: 'Clubes cadastrados',
      players: 'Jogadores registrados',
      competitions: 'Competições históricas',
      matches: 'Partidas catalogadas',
      rankings: 'Rankings publicados',
      growing: 'Acervo em crescimento',
    },
    featuresTitle: 'Tudo sobre o Futebol Mundial',
    featuresSubtitle: 'Dados históricos completos com ferramentas modernas de busca e análise.',
    features: [
      {
        title: 'História Completa',
        desc: 'Acesse o acervo completo de clubes, jogadores e competições desde o século XIX.',
      },
      {
        title: 'Rankings Auditáveis',
        desc: 'Rankings históricos com fontes verificadas e data de publicação.',
      },
      {
        title: 'Busca Inteligente',
        desc: 'Busca textual avançada com índices full-text e fuzzy search.',
      },
      {
        title: 'IA com Citações',
        desc: 'Pergunte sobre futebol e receba respostas com fontes verificáveis.',
      },
      {
        title: 'Dados Estruturados',
        desc: 'API REST com dados normalizados e paginação cursor-based.',
      },
      {
        title: 'Multi-idioma',
        desc: 'Suporte a clubes e competições de todos os países e federações.',
      },
    ],
  },
  auth: {
    loginTitle: 'Entrar',
    loginSubtitle: 'Acesse sua conta no Almanaque dos Clubes',
    email: 'Email',
    password: 'Senha',
    passwordHelp: 'Mín. 8 caracteres, com letra maiúscula, minúscula e um número.',
    name: 'Nome',
    loginSubmit: 'Entrar',
    loginErrorDefault: 'Erro ao fazer login',
    noAccount: 'Não tem conta?',
    loginLink: 'Crie uma grátis',
    registerTitle: 'Criar Conta',
    registerSubtitle: 'Cadastre-se gratuitamente no Almanaque dos Clubes',
    registerSubmit: 'Cadastrar',
    haveAccount: 'Já tem conta?',
    registerLink: 'Faça login',
    acceptTerms: 'Li e aceito os Termos de Uso e Serviço',
    acceptPrivacy: 'Li e aceito a Política de Privacidade (LGPD)',
    acceptRequired:
      'É necessário aceitar os Termos de Uso e a Política de Privacidade para se cadastrar.',
    registerErrorDefault: 'Erro ao cadastrar',
    forgotPasswordLink: 'Esqueci minha senha?',
    forgotPasswordTitle: 'Recuperar senha',
    forgotPasswordSubtitle: 'Informe seu email para receber um link de redefinição.',
    forgotPasswordSubmit: 'Enviar link',
    forgotPasswordSent: 'Se o email existir, você receberá um link de redefinição.',
    resetPasswordTitle: 'Redefinir senha',
    resetPasswordSubtitle: 'Defina uma nova senha.',
    resetPasswordNew: 'Nova senha',
    resetPasswordConfirm: 'Confirmar senha',
    resetPasswordSubmit: 'Salvar nova senha',
    resetPasswordSuccess: 'Senha redefinida com sucesso. Agora você pode entrar.',
    backToLogin: 'Voltar ao login',
    passwordMismatch: 'As senhas não coincidem.',
  },
  pages: {
    clubs: {
      title: 'Clubes',
      subtitle: 'Explore {n} clubes de futebol cadastrados.',
      placeholder: 'Buscar clubes por nome, país ou cidade...',
    },
    players: {
      title: 'Jogadores',
      subtitle: 'Pesquise jogadores de futebol de todos os tempos e lugares.',
      placeholder: 'Buscar jogadores por nome, país ou posição...',
    },
    competitions: {
      title: 'Competições',
      subtitle: 'Explore {n} competições de futebol cadastradas.',
      empty: 'Nenhuma competição encontrada.',
    },
    favoritos: {
      title: 'Meu Almanaque',
      heartAdd: 'Favoritar',
      heartRemove: 'Favorito',
      remove: 'Remover',
      empty:
        'Você ainda não favoritou nenhum clube. Use o coração na página de um clube para começar.',
      live: 'Ao vivo',
      offline: 'Conectando…',
      error: 'Erro ao carregar favoritos.',
      rankingBadge: '{position}º no {name}',
    },
    compare: {
      title: 'Comparar',
      subtitle: 'Comparação lado-a-lado de clubes e jogadores com métricas auditáveis.',
      typeClubs: 'Clubes',
      typePlayers: 'Jogadores',
      searchPlaceholderA: 'Buscar clube A…',
      searchPlaceholderB: 'Buscar clube B…',
      compareBtn: 'Comparar',
      metric: 'Métrica',
      leader: 'Líder',
      titlesTotal: 'Títulos (acervo)',
      foundedYear: 'Fundação (mais antiga lidera)',
      stadiumCapacity: 'Estádio (maior capacidade)',
      rankingPoints: 'Pontos no ranking vigente (0-100)',
      matches: 'Partidas no acervo',
      timelineTitle: 'Evolução no ranking (por temporada)',
      titlesTitle: 'Títulos por hierarquia',
      noData: 'Sem dados suficientes no acervo para comparar.',
      selectBoth: 'Selecione os dois itens para comparar.',
      world: 'Mundial',
      continental: 'Continental',
      national: 'Nacional',
      state: 'Estadual',
      municipal: 'Municipal',
    },
    rankings: {
      title: 'Rankings',
      subtitle: 'Rankings históricos com fontes verificadas e data de publicação.',
      filterYear: 'Ano',
      filterGender: 'Gênero',
      filterCountry: 'País',
      all: 'Todos',
      genderMen: 'Masculino',
      genderWomen: 'Feminino',
      colPosition: 'Posição',
      colClub: 'Clube',
      colPoints: 'Pontos (0-100)',
      colBase: 'Base auditável',
      baseOf: 'com base em {m} partidas / {t} títulos',
      loadMore: 'Carregar mais',
      empty: 'Nenhum ranking publicado ainda para este filtro.',
      updated: 'Ranking: {name}',
    },
    search: {
      title: 'Busca Avançada',
      subtitle: 'Pesquise clubes, jogadores, competições e estatísticas com filtros avançados.',
      placeholder: 'Digite um termo para buscar...',
    },
    sobre: {
      title: 'Sobre nós',
      intro:
        'O Almanaque dos Clubes é uma plataforma digital dedicada à pesquisa e organização de informações históricas sobre futebol. Reunimos dados sobre clubes, jogadores, competições, partidas e rankings, com ferramentas de busca e recursos assistidos por inteligência artificial.',
      sections: [
        {
          title: 'Nosso compromisso',
          body: [
            'Nosso compromisso é oferecer uma experiência útil, transparente e responsável. As informações podem ser compiladas de fontes públicas, bases licenciadas, contribuições de usuários e processos internos de revisão. A existência de uma fonte ou citação não significa que o Almanaque endosse todos os seus conteúdos, nem que cada registro esteja livre de erro.',
            'A data de atualização e, quando disponível, a fonte de cada informação devem ser consultadas na própria página do registro.',
          ],
        },
        {
          title: 'Não somos órgão oficial',
          body: [
            'O Almanaque não é órgão oficial de federação, clube, liga, atleta ou competição, salvo indicação expressa. Nomes, marcas, escudos, imagens e outros sinais pertencentes a terceiros permanecem de seus respectivos titulares.',
            'O uso nominativo ou informativo não implica patrocínio, afiliação ou autorização, e os materiais protegidos devem ser utilizados somente com licença, autorização, base legal ou finalidade permitida.',
          ],
        },
        {
          title: 'Operação e identificação',
          body: [
            'A operação e o fornecimento dos serviços são realizados por END ART Studios — CNPJ 45.370.930/0001-75, Osasco, SP — Brasil. Para questões de atendimento, conteúdo, privacidade ou segurança, utilize os canais indicados no rodapé e nas páginas correspondentes.',
          ],
        },
      ],
    },
    planos: {
      title: 'Planos',
      intro:
        'O Almanaque dos Clubes oferece uma modalidade gratuita e duas assinaturas pagas. Para visitantes no Brasil, os preços são exibidos em reais ({free}, {proMonthly}, {eliteMonthly}). O preço total, os recursos, os limites, a periodicidade e a próxima cobrança serão apresentados antes da confirmação do pagamento. Última atualização: 02 de setembro de 2026.',
      sections: [
        {
          title: 'Free',
          body: [
            '{free} — consulta inicial e utilização dos recursos gratuitos disponíveis. Sem conversão automática para plano pago.',
          ],
        },
        {
          title: 'Pro',
          body: [
            '{proMonthly}/mês ou {proMonthly} anual com 15% de desconto (12 × mensal). Pesquisa e análise ampliadas, com recursos de IA e citações quando indicados no checkout. Pagamento via Stripe, somente após confirmação expressa.',
          ],
        },
        {
          title: 'Elite',
          body: [
            '{eliteMonthly}/mês ou {eliteMonthly} anual com 15% de desconto (12 × mensal). Limites e recursos avançados indicados no checkout, incluindo API ou exportação quando expressamente incluídos.',
          ],
        },
        {
          title: 'Recursos e limites',
          body: [
            'Todos os recursos e limites efetivamente incluídos estarão descritos em tabela de comparação no checkout e no painel da conta (consultas, créditos de IA, chamadas de API, exportações, armazenamento, suporte e limites de uso justo).',
            'A ausência de um recurso ou limite na tabela significa que ele não está incluído automaticamente. A END ART não anunciará "acesso ilimitado" ou "API incluída" sem definir o alcance, as restrições técnicas e a política de uso justo.',
          ],
        },
        {
          title: 'Contratação transparente',
          body: [
            'A contratação é processada após confirmação expressa do consumidor. Antes do pagamento, será possível revisar plano, periodicidade, preço total, desconto, renovação automática, método de pagamento, limites, cancelamento, reembolso e os Termos de Uso.',
            'O plano Free não se transforma automaticamente em plano pago. Os planos Pro e Elite renovam-se somente quando essa condição tiver sido informada e aceita no checkout. O consumidor pode cancelar pelos mesmos meios utilizados para contratar ou por endart.studios@gmail.com.',
          ],
        },
        {
          title: 'Cancelamento e arrependimento',
          body: [
            'O cancelamento interrompe cobranças futuras. Salvo condição mais favorável, os recursos pagos permanecem até o fim do período já pago. Em contratação fora do estabelecimento comercial, o consumidor pode exercer o direito de arrependimento no prazo legal de 7 dias (art. 49 do CDC), pelo painel ou por endart.studios@gmail.com.',
            'O reembolso será solicitado pelo meio de pagamento utilizado, com confirmação ao consumidor. A END ART não substituirá restituição legal por crédito sem concordância do consumidor.',
          ],
        },
        {
          title: 'Pagamento',
          body: [
            'O pagamento poderá ser processado por Stripe ou pelo provedor identificado no checkout. A END ART não solicita senha do cartão e, quando não for necessário, não armazena dados completos do cartão.',
          ],
        },
        {
          title: 'Inteligência artificial e fontes',
          body: [
            'Os recursos de IA são auxiliares. Podem gerar respostas incorretas, incompletas ou desatualizadas. Verifique as fontes e datas antes de publicar ou tomar decisões. Não insira senhas, dados bancários, dados de saúde, dados de crianças ou segredos comerciais nos prompts.',
          ],
        },
        {
          title: 'Atendimento e identificação',
          body: [
            'Dúvidas sobre planos, cancelamento, cobrança, reembolso ou recursos: endart.studios@gmail.com.',
            'END ART Studios — CNPJ nº 45.370.930/0001-75 — Osasco, São Paulo, Brasil.',
          ],
        },
      ],
      note: 'Os valores e recursos exibidos aqui são informativos; a oferta vinculante é a apresentada no checkout, sujeita aos Termos de Uso e à Política de Privacidade.',
    },
    seguranca: {
      title: 'Segurança e Vulnerabilidades',
      intro:
        'A segurança é responsabilidade compartilhada. Esta página descreve os controles adotados e o canal para reporte de vulnerabilidades.',
      sections: [
        {
          title: 'Controles adotados',
          body: [
            'Controles técnicos em produção: Content Security Policy (CSP) e cabeçalhos de segurança via Helmet; senhas com hash argon2id (sem salt no código, memória/tuneables configurados); cookies de sessão httpOnly + SameSite com refresh token rotativo; proteção CSRF de uso único em todas as operações de escrita; rate limiting em camadas (limite global por IP, anti-brute-force no login por IP+e-mail, janela deslizante por usuário+IP nas rotas de autenticação); Row-Level Security (RLS) no PostgreSQL para sessões; audit log append-only para entidades críticas; hardening HTTP (gate de métodos, limite de payload, idempotência); integração contínua com gitleaks, pnpm audit, security-gate e detecção de drift de migrations; procedimento de backup e restauração documentado; menor privilégio (usuário de aplicação distinto do proprietário do banco); segredos fora do código; segregação de ambientes; e monitoramento de requisições, 5xx e falhas de autenticação.',
          ],
        },
        {
          title: 'Reporte de vulnerabilidades',
          body: [
            'Vulnerabilidades podem ser reportadas em endart.studios@gmail.com. Informe o ativo afetado, passos reprodutíveis, impacto, evidências mínimas e contato.',
            'Não acesse, altere, exclua ou exfiltre dados além do indispensável à demonstração, nem realize indisponibilidade, engenharia social ou testes em terceiros.',
          ],
        },
        {
          title: 'Resposta e divulgação',
          body: [
            'Responderemos ao recebimento, investigaremos, preservaremos evidências, corrigiremos ou mitigaremos e comunicaremos o status em prazo razoável. A divulgação coordenada é preferida.',
          ],
        },
        {
          title: 'Incidentes com dados pessoais',
          body: [
            'Em caso de incidente com dados pessoais, classificamos o risco, contemos o evento, preservamos logs, redefinimos credenciais, avaliamos titulares afetados, registramos decisões e cumprimos os deveres de comunicação da LGPD e da ANPD.',
          ],
        },
      ],
    },
    cookiePolicy: {
      title: 'Política de Cookies',
      intro:
        'Esta Política de Cookies explica como a END ART Studios utiliza cookies e tecnologias semelhantes no Almanaque dos Clubes. O inventário será atualizado conforme os cookies, fornecedores e tecnologias efetivamente instalados. END ART Studios, CNPJ 45.370.930/0001-75.',
      sections: [
        {
          title: 'O que são cookies',
          body: [
            'Cookies são pequenos arquivos ou identificadores armazenados no navegador para permitir funcionamento, segurança, preferências e métricas. Tecnologias semelhantes (pixels, SDKs, local storage) são tratadas de forma equivalente quando permitem reconhecer ou acompanhar o usuário.',
          ],
        },
        {
          title: 'Categorias',
          body: [
            'Necessários: sessão, login, segurança (CSRF), prevenção de fraude, registro da escolha de consentimento e preferência de idioma — minimizados e sempre ativos quando indispensáveis. A recusa não se aplica a esta categoria.',
            'Preferências: idioma, tema e escolhas de interface — consentimento quando não essencial.',
            'Analytics: medição de audiência, erros e desempenho — NÃO utilizados atualmente. Caso um fornecedor seja contratado no futuro (ex.: PostHog, Plausible), ele será listado no inventário abaixo e só carregará após consentimento granular.',
            'Marketing/publicidade: campanhas, atribuição e remarketing — NÃO utilizados atualmente; se contratados, exigirão consentimento específico e revogável.',
          ],
        },
        {
          title: 'Escolha, revogação e prova',
          body: [
            'O usuário pode aceitar, rejeitar ou selecionar categorias. A revogação deve ser tão fácil quanto a concessão. Mantemos prova da escolha apenas com os dados necessários. A recusa de cookies opcionais não impede o uso das funções essenciais.',
          ],
        },
        {
          title: 'Terceiros e transferências',
          body: [
            'Provedores atuais: Vercel (frontend), Railway (API e banco PostgreSQL), Cloudflare (DNS/rede) e Google Fonts (fontes); pagamentos via Stripe. Fornecedores de hospedagem, autenticação, pagamento, analytics, suporte, IA e segurança podem receber identificadores conforme a finalidade, sempre minimizados e contratualmente vinculados. Quando houver transferência internacional, a LGPD e (se aplicável) o GDPR devem ser observados.',
          ],
        },
        {
          title: 'Contato de privacidade',
          body: [
            'Dúvidas, revogação de preferências e exercício de direitos: endart.studios@gmail.com.',
          ],
        },
      ],
      inventoryTitle: 'Inventário de cookies em uso',
      inventoryHeaders: ['Cookie', 'Finalidade', 'Categoria', 'Duração', 'Forma'],
      inventory: [
        {
          name: 'access_token',
          purpose: 'Autenticação (sessão do usuário)',
          category: 'Necessário',
          duration: '≈ 15 minutos',
          form: 'Cookie httpOnly, primeira parte',
        },
        {
          name: 'refresh_token',
          purpose: 'Renovação segura da sessão (token rotativo)',
          category: 'Necessário',
          duration: '7 dias',
          form: 'Cookie httpOnly, primeira parte',
        },
        {
          name: 'almanaque_locale',
          purpose: 'Preferência de idioma da interface',
          category: 'Necessário (funcional)',
          duration: '1 ano',
          form: 'Cookie primeira parte',
        },
        {
          name: 'consent_v',
          purpose: 'Armazena sua escolha de consentimento (para não re-exibir o banner)',
          category: 'Necessário (prova de consentimento)',
          duration: '1 ano',
          form: 'localStorage + cookie primeira parte',
        },
        {
          name: '— (x-csrf-token)',
          purpose:
            'Proteção CSRF das escritas — via header HTTP e armazenamento no servidor; NÃO usa cookie',
          category: 'Necessário',
          duration: '24 h (uso único)',
          form: 'Header HTTP',
        },
      ],
      note: 'Classificação e inventário seguem a função real de cada cookie, não o nome comercial do fornecedor. Nenhum cookie de analytics ou marketing está instalado hoje; esta tabela é atualizada a cada mudança de inventário (última revisão: 15/09/2026 — versão 1.0 da política).',
    },
    ia: {
      title: 'Como usamos IA',
      intro:
        'O Almanaque dos Clubes usa inteligência artificial como ferramenta auxiliar de pesquisa, síntese, classificação e apresentação de informações. Esta página explica o funcionamento, as limitações, as diretrizes de uso e seus direitos. As respostas assistidas por IA não são fonte oficial e não substituem verificação humana.',
      sections: [
        {
          title: 'Função e limitações',
          body: [
            'Os recursos de IA do Almanaque dos Clubes são auxiliares de pesquisa, síntese, classificação e navegação do acervo. Respostas podem ser incorretas, incompletas, desatualizadas, ambíguas ou apresentar citações inadequadas.',
            'Aviso junto à consulta: "Resposta assistida por inteligência artificial. Pode conter erros, omissões ou informações desatualizadas. Confira as fontes, datas e contexto antes de usar ou compartilhar. Não insira dados confidenciais ou pessoais desnecessários."',
            'Aviso junto à resposta: "Importante: esta resposta foi gerada ou organizada com auxílio de IA. Ela não é fonte oficial, não garante precisão ou completude e não substitui verificação humana. Consulte as fontes indicadas e reporte uma possível imprecisão pelo e-mail endart.studios@gmail.com."',
          ],
        },
        {
          title: 'Uso permitido',
          body: [
            'A IA deve ser utilizada para pesquisa histórica, localização de registros, síntese, comparação, organização e navegação do acervo, sempre dentro dos limites do plano. O usuário deve conferir a resposta em fontes primárias, fontes citadas, registros oficiais ou outras fontes independentes antes de publicar, compartilhar ou tomar decisão.',
          ],
        },
        {
          title: 'Uso proibido',
          body: [
            'É proibido utilizar a IA para: gerar malware, ransomware, phishing, credenciais falsas ou instruções de invasão; praticar fraude, falsidade, personificação, ameaça, assédio, difamação ou discriminação ilícita; inserir, inferir, expor ou explorar dados pessoais de terceiros sem autorização; inserir senhas, dados de cartão, documentos, dados de saúde, dados de crianças, segredos comerciais ou informações confidenciais desnecessárias; violar direitos autorais, marcas, imagem, personalidade, sigilo, contratos ou licenças; manipular rankings, fabricar fontes, remover citações ou atribuir resposta à END ART ou a fonte oficial sem autorização; realizar engenharia reversa, burlar filtros, contornar rate limits, explorar vulnerabilidades ou interferir na disponibilidade; extrair em massa ou utilizar a base, respostas ou API para construir, treinar ou alimentar produto concorrente; tomar decisões de alto impacto sobre pessoas sem revisão humana, explicação, base legal e salvaguardas adequadas; ou usar saídas como aconselhamento jurídico, médico, financeiro ou como única base para decisão de contratação, investimento, reputação ou segurança.',
          ],
        },
        {
          title: 'Fontes, citações e dados enviados aos provedores',
          body: [
            'Quando houver citação, mostrar fonte e data de consulta ou atualização quando tecnicamente disponível. Não apresentar uma citação fabricada como fonte verificável.',
            'A END ART mantém uma lista atualizada dos provedores de IA, suas funções, países, subprocessadores, retenção, medidas de segurança e uso ou não para treinamento. A Política de Privacidade informa quais prompts, contexto, metadados, feedback e respostas podem ser enviados. Não usar conteúdo identificável do usuário para treinamento fora da finalidade informada, salvo base legal adequada.',
          ],
        },
        {
          title: 'Filtros e contestação',
          body: [
            'O usuário não deve inserir senhas, dados bancários, dados de saúde, dados de crianças, documentos de identidade, segredos comerciais ou informações confidenciais desnecessárias nos prompts.',
            'Diante de abuso, risco de segurança ou violação, a END ART poderá bloquear uma consulta, reduzir limite, suspender temporariamente, revogar API ou encerrar uma conta, de forma proporcional. Sempre que possível, comunicará o motivo e oferecerá contestação em endart.studios@gmail.com. Medidas urgentes poderão ocorrer sem aviso prévio quando necessárias para impedir dano grave.',
          ],
        },
      ],
    },
    termosAssinatura: {
      title: 'Termos de Assinatura — Pro e Elite',
      intro:
        'Estes Termos disciplinam a assinatura dos planos Pro e Elite do Almanaque dos Clubes, fornecidos por END ART Studios (CNPJ 45.370.930/0001-75), Osasco, SP - Brasil. Vigência: 01/09/2026. Em conflito, prevalece a norma cogente e a condição mais favorável ao consumidor.',
      sections: [
        {
          title: 'Objeto, planos e preço',
          body: [
            'Pro: {proMonthly}/mês (anual com 15% de desconto). Elite: {eliteMonthly}/mês (anual com 15% de desconto). A moeda segue a localização real do consumidor: América do Sul e Central em reais (R$), países que usam dólar em dólar ($) e Europa em euro (€). Pagamento via Stripe. A periodicidade, tributos, renovação, limites e recursos constam do checkout e do recibo. Nenhum plano gratuito é convertido automaticamente em pago; o pagamento exige ação afirmativa do consumidor.',
          ],
        },
        {
          title: 'Renovação e alterações',
          body: [
            'A renovação automática somente ocorre se informada e autorizada antes da contratação, com aviso prévio. Alteração de preço, periodicidade ou redução substancial de recursos será comunicada antes de produzir efeitos; quando modificar materialmente o contrato, o consumidor poderá cancelar sem penalidade desproporcional.',
          ],
        },
        {
          title: 'Uso e limitações da IA',
          body: [
            'As ferramentas de IA são auxiliares e podem errar. É proibido usar a plataforma para fraude, malware, assédio, violação de direitos, decisão automatizada relevante sem revisão, extração em massa, engenharia reversa, burla de limites ou treinamento de modelo concorrente sem licença escrita.',
          ],
        },
        {
          title: 'Cancelamento e arrependimento',
          body: [
            'O consumidor pode cancelar a renovação pelo painel ou pelo mesmo meio da contratação, sem justificativa. Nas hipóteses do art. 49 do CDC, pode exercer o arrependimento em até 7 dias, sem barreiras, com restituição dos valores pagos conforme a lei. O cancelamento ordinário após o prazo não implica reembolso proporcional automático, salvo falha do serviço, cobrança indevida ou descumprimento da oferta.',
          ],
        },
        {
          title: 'Responsabilidade e proteção de dados',
          body: [
            'A END ART responde conforme o CDC, a LGPD e demais leis por falhas que lhe sejam imputáveis. Nenhuma cláusula exclui responsabilidade legal inderrogável. O tratamento de dados segue a Política de Privacidade; o consumidor pode exercer seus direitos por endart.studios@gmail.com. O marketing é opcional e não condiciona a contratação.',
          ],
        },
        {
          title: 'Lei e foro',
          body: [
            'Aplica-se a legislação brasileira. Nas relações de consumo, preserva-se o foro do domicílio do consumidor e qualquer outro foro legalmente favorável, sem prejuízo dos órgãos de defesa do consumidor.',
          ],
        },
      ],
      note: 'Fornecedor: END ART Studios — CNPJ 45.370.930/0001-75, Osasco, SP — Brasil. Gateway: Stripe. Vigência: 01/09/2026.',
    },
  },
  langSelector: { label: 'Idioma', current: 'Idioma atual' },
  legal: {
    updatedLabel: 'Última atualização',
    terms: {
      title: 'Termos de Uso e Serviço',
      intro:
        'Estes Termos de Uso e Serviço ("Termos") regulam o acesso e o uso da Plataforma Almanaque dos Clubes, operada por END ART Studios, CNPJ nº 45.370.930/0001-75 ("END ART"). Ao criar uma conta, contratar um plano ou utilizar a Plataforma, o usuário declara ter lido e aceito estes Termos. Última atualização: 02 de setembro de 2026 · Versão 2.0.',
      sections: [
        {
          title: 'Identificação do fornecedor',
          body: [
            'END ART Studios — Nome Fantasia: END ART Studios — CNPJ nº 45.370.930/0001-75 — Osasco, São Paulo, Brasil — contato: endart.studios@gmail.com.',
          ],
        },
        {
          title: 'Termos de Uso e Serviço ("Termos")',
          body: [
            'Estes Termos regulam o acesso e o uso do site, da aplicação, das ferramentas de busca, dos dados históricos, dos rankings, da API, dos recursos assistidos por inteligência artificial e dos planos Free, Pro e Elite do Almanaque dos Clubes ("Plataforma").',
            'A contratação e o uso da Plataforma também estão sujeitos à Política de Privacidade, à Política de Cookies e à Política de Segurança. Em caso de conflito entre estes Termos e uma norma obrigatória de proteção do consumidor ou de proteção de dados, a norma obrigatória prevalecerá.',
          ],
        },
        {
          title: '1. Aceite separado e informação prévia',
          body: [
            'O usuário terá acesso a estes Termos antes de criar conta ou contratar um plano. O aceite contratual será realizado por mecanismo separado de qualquer consentimento para marketing, cookies opcionais ou outras finalidades não necessárias à execução do serviço.',
            'Ao marcar "Li e aceito os Termos de Uso", criar uma conta ou contratar um plano, o usuário confirma que teve oportunidade de ler o documento. A Plataforma registrará a versão, a data e a hora do aceite. A ausência de consentimento para marketing ou cookies opcionais não impede o cadastro nem a contratação.',
          ],
        },
        {
          title: '2. Identificação e objeto',
          body: [
            'A Plataforma é operada por END ART Studios, CNPJ nº 45.370.930/0001-75, Nome Fantasia END ART Studios, em Osasco, São Paulo, Brasil, contato endart.studios@gmail.com.',
            'O Almanaque dos Clubes reúne e organiza informações históricas sobre clubes, jogadores, competições, partidas e rankings, com ferramentas de busca e recursos assistidos por IA. A Plataforma poderá utilizar fontes públicas, bases licenciadas, contribuições autorizadas e processos internos de revisão.',
            'O Almanaque não é órgão oficial de federação, clube, liga, atleta ou competição, salvo indicação expressa e documentada. A presença de nome, escudo, marca, imagem ou registro não implica patrocínio, endosso, afiliação ou autorização de terceiro.',
          ],
        },
        {
          title: '3. Cadastro e conta',
          body: [
            'Para criar uma conta, o usuário deverá fornecer informações verdadeiras, atuais e necessárias, manter seu e-mail atualizado e proteger sua senha. Senhas devem ser armazenadas pela Plataforma em formato protegido e não em texto claro.',
            'O usuário não deve compartilhar credenciais, criar conta para outra pessoa sem autorização, contornar controles, acessar dados de terceiros ou permitir que sua conta seja usada para fraude, invasão, extração abusiva ou violação de direitos.',
            'A Plataforma poderá solicitar confirmação proporcional de identidade para segurança, reembolso, alteração sensível ou exercício de direitos. Não será solicitada senha por e-mail.',
          ],
        },
        {
          title: '4. Planos, preço e características da oferta',
          body: [
            'A Plataforma oferece o plano Free e os planos pagos Pro e Elite, com periodicidade mensal ou anual (o ciclo anual aplica desconto sobre 12 mensalidades). Os valores vigentes de cada plano, as moedas por região e os recursos incluídos são os descritos na página /planos, que integra estes Termos para todos os efeitos, conforme descrito em /planos.',
            'O checkout exibirá, antes da confirmação, o preço total do período, a periodicidade, o desconto, tributos eventualmente aplicáveis, a forma de pagamento, a data da próxima cobrança e as limitações relevantes.',
            'O plano Free permite utilizar os recursos gratuitos identificados na Plataforma, sem conversão automática para plano pago. Pro e Elite permitem os recursos pagos descritos no checkout, incluindo, quando indicados, pesquisa ampliada, IA assistida com citações, limites técnicos e, para o Elite, API ou exportação quando expressamente incluídos.',
            'A END ART não presumirá que API, exportação, créditos ilimitados de IA, acesso irrestrito ou suporte prioritário estão incluídos se não estiverem expressamente descritos no resumo da contratação. O limite vigente de consultas, créditos, requisições, exportações, armazenamento e rate limit será exibido antes do pagamento e no painel do assinante.',
          ],
        },
        {
          title: '5. Checkout, contratação e renovação',
          body: [
            'Antes de finalizar o pagamento, o consumidor visualizará um resumo com: fornecedor, plano, recursos, limites, preço, desconto, preço total, tributos, periodicidade, renovação automática, meio de pagamento, data da cobrança seguinte, regras de cancelamento, direito de arrependimento e links para estes Termos e a Política de Privacidade.',
            'O consumidor poderá corrigir dados, plano ou forma de pagamento antes da confirmação. A contratação somente será concluída após confirmação expressa do botão de pagamento. A END ART enviará confirmação e cópia eletrônica conservável do contrato.',
            'A assinatura mensal ou anual será renovada automaticamente somente se isso for informado com destaque antes do pagamento. Não haverá conversão do Free para plano pago sem nova contratação expressa. Nenhum aumento de preço, redução substancial de recursos ou alteração de periodicidade será aplicado sem aviso prévio claro e, quando necessário, nova aceitação.',
          ],
        },
        {
          title: '6. Pagamento e falha de cobrança',
          body: [
            'Os pagamentos poderão ser processados por Stripe ou outro provedor indicado no checkout. A END ART não solicita nem armazena a senha do cartão e, quando não for necessário, não armazena dados completos do cartão.',
            'Em caso de falha de cobrança, a END ART poderá informar o problema, permitir atualização do meio de pagamento e limitar temporariamente recursos pagos após aviso razoável. Não serão realizadas cobranças ocultas, duplicadas ou diferentes do preço confirmado.',
          ],
        },
        {
          title: '7. Cancelamento',
          body: [
            'O consumidor poderá cancelar a renovação pelo painel da conta ou pelo mesmo meio usado para contratar, ou por endart.studios@gmail.com, sem justificativa.',
            'O cancelamento da renovação interrompe cobranças futuras. Salvo encerramento imediato solicitado pelo consumidor ou medida necessária por violação comprovada, o acesso aos recursos pagos permanecerá até o final do período já pago. O cancelamento não elimina direitos a reembolso ou arrependimento.',
            'A exclusão da conta e a eliminação de dados seguem a Política de Privacidade. Registros necessários a reembolso, contabilidade, segurança, prevenção de fraude, obrigação legal ou defesa poderão ser conservados de forma restrita pelo prazo necessário.',
          ],
        },
        {
          title: '8. Direito de arrependimento e reembolso',
          body: [
            'Nas contratações realizadas fora do estabelecimento comercial, o consumidor poderá exercer o direito de arrependimento no prazo de 7 dias a contar da assinatura ou do recebimento do serviço, nos termos do art. 49 do Código de Defesa do Consumidor.',
            'O pedido poderá ser realizado pelo painel, pelo fluxo de cancelamento ou por endart.studios@gmail.com. A END ART fornecerá confirmação e protocolo, interromperá a renovação e solicitará a restituição pelo meio de pagamento utilizado. O consumidor não será obrigado a aceitar crédito quando a lei exigir restituição.',
            'O uso do serviço não será utilizado, isoladamente, para negar automaticamente o direito legal de arrependimento. Eventuais disputas de fraude, chargeback ou uso por terceiro serão apuradas separadamente.',
          ],
        },
        {
          title: '9. Conteúdo, fontes e precisão',
          body: [
            'Informações históricas podem conter lacunas, divergências entre fontes, alterações posteriores, erros de transcrição ou dados ainda não revisados. A expressão "fontes verificadas" significa que a Plataforma busca identificar e revisar fontes, não que todo registro seja infalível ou oficialmente reconhecido.',
            'A data de atualização, a fonte e a metodologia, quando disponíveis, deverão ser consultadas na página do registro ou do ranking. O usuário poderá reportar imprecisões por endart.studios@gmail.com.',
          ],
        },
        {
          title: '10. Diretrizes de uso da inteligência artificial',
          body: [
            'Os recursos de IA são auxiliares de pesquisa e organização. Respostas podem ser incorretas, incompletas, desatualizadas, ambíguas ou apresentar citações inadequadas. O usuário deverá verificar fontes, datas e contexto antes de publicar, compartilhar ou tomar decisão com base em uma saída.',
            'É proibido utilizar a IA ou a Plataforma para: gerar ou disseminar malware, phishing ou instruções de invasão; fraudar, ameaçar, assediar, difamar ou discriminar; produzir falsificações ou personificações; inserir ou explorar dados pessoais de terceiros sem autorização; violar direitos autorais, marcas, imagem ou segredo comercial; manipular rankings ou informações históricas; burlar filtros, rate limits ou controles; realizar engenharia reversa; copiar ou extrair a base em escala; treinar ou alimentar modelo concorrente com dados da Plataforma; ou tomar decisão de alto impacto sem revisão humana adequada.',
            'O usuário não deve inserir senhas, dados bancários, dados de saúde, dados de crianças, documentos de identidade, segredos comerciais ou informações confidenciais desnecessárias nos prompts. O tratamento de prompts, respostas, metadados e logs é descrito na Política de Privacidade.',
            'A END ART poderá aplicar filtros, limitar requisições, revogar chave de API, suspender ou encerrar acesso de forma proporcional quando houver indício razoável de abuso, risco de segurança ou violação. Quando possível, informará a razão, preservará evidências mínimas e disponibilizará canal de contestação.',
          ],
        },
        {
          title: '11. Propriedade intelectual',
          body: [
            'A END ART ou seus licenciantes detêm os direitos aplicáveis sobre a marca, identidade visual, software, código, layout, arquitetura, API, documentação, taxonomias, modelos de dados, índices, scripts, pipelines, metodologias, textos editoriais originais, imagens próprias, prompts proprietários, seleção, organização, normalização, curadoria e disposição criativa do acervo.',
            'Fatos históricos, nomes, datas, resultados, estatísticas, registros públicos, marcas, escudos, fotografias, vídeos e materiais de terceiros não se tornam propriedade exclusiva da END ART apenas por serem exibidos, agregados ou organizados na Plataforma. Esses materiais permanecem sujeitos aos direitos e licenças de seus respectivos titulares.',
            'Durante a vigência do plano, a END ART concede ao usuário licença limitada, pessoal, não exclusiva, não transferível e sem direito de sublicença para acessar e utilizar a Plataforma conforme o plano contratado. Essa licença não transfere propriedade nem autoriza copiar substancialmente, extrair, espelhar, revender, redistribuir em escala, publicar em base concorrente, remover avisos, contornar limites ou realizar scraping abusivo.',
            'O usuário conserva os direitos sobre o conteúdo que enviar, quando os possuir, e concede à END ART somente a licença técnica necessária para hospedar, processar, exibir ao próprio usuário, executar a funcionalidade solicitada, manter segurança, suporte, backup e cumprir obrigação legal.',
            'As saídas de IA podem não ser exclusivas, podem conter elementos não protegíveis ou de terceiros e podem exigir revisão. Na medida permitida pela lei, o usuário poderá utilizar uma saída legítima para finalidade compatível com o plano.',
          ],
        },
        {
          title: '12. API e extração',
          body: [
            'Quando a API estiver incluída no plano, o acesso será limitado à documentação, à chave individual, aos limites e às finalidades do checkout. É proibido compartilhar chave, contornar rate limits, extrair integral ou substancialmente a base, construir espelho, revender respostas, redistribuir em escala ou criar serviço concorrente sem autorização escrita.',
            'A END ART poderá bloquear requisições anômalas para proteger disponibilidade e dados. A medida será proporcional e poderá ser contestada por endart.studios@gmail.com.',
          ],
        },
        {
          title: '13. Segurança, suspensão e encerramento',
          body: [
            'A END ART adota controles proporcionais ao risco, incluindo proteção de credenciais, controle de acesso, gestão de segredos, TLS quando aplicável, logs, backups, atualizações, monitoramento e rate limiting. Nenhum serviço conectado à internet é absolutamente invulnerável.',
            'Diante de violação, fraude, risco de segurança ou uso abusivo, a END ART poderá emitir advertência, limitar função, revogar chave, suspender temporariamente ou encerrar conta, conforme gravidade e urgência. Quando possível, comunicará o motivo e oferecerá contestação. Medidas de emergência poderão ser aplicadas imediatamente.',
            'Quando o encerramento ocorrer por decisão da END ART sem culpa do consumidor durante período pago, será avaliada solução proporcional, como correção, recurso equivalente, abatimento ou restituição cabível.',
          ],
        },
        {
          title: '14. Responsabilidade',
          body: [
            'A END ART responderá conforme o Código de Defesa do Consumidor, a LGPD e demais leis aplicáveis pelos danos e falhas que lhe sejam imputáveis. Nada nestes Termos exclui responsabilidade legal inderrogável, vício ou defeito do serviço, cobrança indevida, violação de dados ou direitos básicos do consumidor.',
            'A END ART não garante disponibilidade contínua, ausência absoluta de erro ou atualização instantânea de todo o acervo. Essa limitação não autoriza descumprimento da oferta, nega direitos legais nem impede correção, suporte ou reparação quando cabível.',
            'O usuário poderá responder por danos comprovadamente causados por uso ilícito, inserção não autorizada de conteúdo, fraude, extração abusiva ou violação de direitos de terceiros.',
          ],
        },
        {
          title: '15. Alterações',
          body: [
            'Alterações não materiais poderão ser incorporadas com indicação da data de atualização. Alterações materiais serão comunicadas antes da produção de efeitos, com resumo claro e nova aceitação quando necessária. O uso continuado não será utilizado isoladamente para impor mudança material a contrato de adesão sem comunicação adequada.',
          ],
        },
        {
          title: '16. Comunicações e contato',
          body: [
            'Atendimento, cancelamento, reembolso, correção de conteúdo, privacidade e dúvidas contratuais: endart.studios@gmail.com. Para segurança, recomenda-se o canal dedicado indicado na Política de Segurança, quando disponibilizado.',
          ],
        },
        {
          title: '17. Lei aplicável e foro',
          body: [
            'Aplica-se a legislação brasileira. Em relação de consumo, fica preservado o foro do domicílio do consumidor e qualquer outro foro que a legislação reconheça como competente ou mais favorável. A indicação de Osasco, São Paulo, não impede o consumidor de utilizar seu foro legal, órgãos de defesa do consumidor ou o Poder Judiciário.',
          ],
        },
        {
          title: 'Referências',
          body: [
            '[1] CDC — Lei nº 8.078/1990 · [2] Decreto nº 7.962/2013 (comércio eletrônico) · [3] LGPD — Lei nº 13.709/2018 · [4] Lei nº 9.610/1998 (Direitos Autorais) · [5] GDPR — Regulamento (UE) 2016/679, quando aplicável.',
          ],
        },
      ],
    },
    privacy: {
      title: 'Política de Privacidade',
      intro:
        'Esta Política de Privacidade descreve como a END ART Studios (CNPJ 45.370.930/0001-75) coleta, utiliza, armazena e protege os dados pessoais dos usuários da plataforma Almanaque dos Clubes, em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD) e demais normas aplicáveis.',
      sections: [
        {
          title: '1. Dados coletados',
          body: [
            'Dados de cadastro: nome, e-mail e senha (armazenada de forma segura com hash).',
            'Dados de uso: informações de navegação, dispositivos e logs de acesso, para fins de segurança e melhoria do serviço.',
            'Dados de cobrança: processados por provedores de pagamento externos; a END ART Studios não armazena dados completos de cartão.',
          ],
        },
        {
          title: '2. Finalidades do tratamento',
          body: [
            'Criar e gerenciar a conta, autenticar o usuário e proteger o acesso.',
            'Prestar os serviços contratados, incluindo planos pagos e recursos de IA.',
            'Garantir a segurança da plataforma, prevenir fraudes e atividades abusivas.',
            'Comunicar atualizações, alterações de termos e informações relevantes.',
          ],
        },
        {
          title: '3. Base legal',
          body: [
            'O tratamento se baseia no consentimento (art. 7º, I, da LGPD), na execução de contrato, no legítimo interesse e no cumprimento de obrigações legais, conforme aplicável.',
          ],
        },
        {
          title: '4. Compartilhamento',
          body: [
            'Não vendemos dados pessoais. Dados podem ser compartilhados com provedores de infraestrutura e pagamento, estritamente necessários à operação, e com autoridades quando exigido por lei.',
            'Provedores atuais do ambiente: Vercel (hospedagem do frontend), Railway (hospedagem da API e do banco de dados PostgreSQL), Cloudflare (DNS e proteção de rede) e Google Fonts (fontes tipográficas). Pagamentos são processados pelo Stripe, que atua como controlador dos dados de pagamento perante o titular. Esta lista é atualizada sempre que um fornecedor é contratado ou substituído.',
          ],
        },
        {
          title: '5. Direitos do titular (LGPD)',
          body: [
            'O usuário pode solicitar confirmação, acesso, correção, anonimização, portabilidade, eliminação e revogação do consentimento.',
            'Para exercer seus direitos, entre em contato com o canal de privacidade indicado abaixo.',
          ],
        },
        {
          title: '6. Cookies',
          body: [
            'Utilizamos cookies necessários para autenticação, segurança e preferências (como idioma) e registramos prova da sua escolha de consentimento. Cookies opcionais (analytics/marketing) só são ativados mediante consentimento e podem ser revogados a qualquer momento pelo rodapé ("Gerenciar cookies"). Inventário completo: Política de Cookies (/cookies).',
          ],
        },
        {
          title: '7. Segurança',
          body: [
            'Adotamos medidas técnicas e organizacionais (criptografia de senha, controle de acesso, monitoramento) para proteger os dados. Nenhum sistema é infalível; guardamos a senha de forma hash e não em texto claro.',
          ],
        },
        {
          title: '8. Retenção',
          body: [
            'Os dados são mantidos pelo tempo necessário às finalidades e obrigações legais, ou até a exclusão a pedido do titular ou encerramento da conta.',
          ],
        },
        {
          title: '9. Menores',
          body: [
            'A plataforma não se destina a menores de idade sem consentimento dos responsáveis. Não coletamos intencionalmente dados de menores.',
          ],
        },
        {
          title: '10. Encarregado (DPO) e contato',
          body: [
            'Solicitações de privacidade e exercício de direitos: endart.studios@gmail.com.',
            'A END ART Studios é o controlador dos dados tratados na plataforma.',
          ],
        },
        {
          title: '11. Localização, geolocalização e moeda',
          body: [
            'Para exibir e cobrar o preço na moeda correta, determinamos o país do usuário a partir do endereço IP (localização aproximada). Para isso, o IP pode ser processado por provedores de geolocalização (ex.: ipwho.is) e pelo provedor de hospedagem (ex.: Vercel, Railway), estritamente para identificar o país e definir a moeda (América do Sul/Central: reais; países que usam dólar: dólar; Europa: euros).',
            'Base legal: execução do contrato e legítimo interesse. A localização não é usada para publicidade, perfilamento ou decisões automatizadas fora da precificação, e é tratada de forma minimizada apenas na definição da moeda.',
          ],
        },
      ],
    },
  },
};

export default pt;
