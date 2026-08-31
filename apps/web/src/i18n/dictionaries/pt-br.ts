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
    terms: 'Termos de Uso',
    security: 'Segurança',
    copyright: 'Copyright © 2026 END ART Studios',
  },
  common: {
    loading: 'Carregando...',
    backHome: 'Voltar ao início',
    viewAll: 'Ver tudo',
    learnMore: 'Saiba mais',
    comingSoonTitle: 'Módulo em desenvolvimento',
    comingSoonDesc: 'Em breve: conteúdo completo deste módulo.',
    resultsFor: 'Resultados para:',
    resultsNote: 'A busca full-text será implementada com PostgreSQL tsvector + pg_trgm para fornecer resultados rápidos mesmo com grandes volumes de dados.',
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
    },
    featuresTitle: 'Tudo sobre o Futebol Mundial',
    featuresSubtitle: 'Dados históricos completos com ferramentas modernas de busca e análise.',
    features: [
      { title: 'História Completa', desc: 'Acesse o acervo completo de clubes, jogadores e competições desde o século XIX.' },
      { title: 'Rankings Auditáveis', desc: 'Rankings históricos com fontes verificadas e data de publicação.' },
      { title: 'Busca Inteligente', desc: 'Busca textual avançada com índices full-text e fuzzy search.' },
      { title: 'IA com Citações', desc: 'Pergunte sobre futebol e receba respostas com fontes verificáveis.' },
      { title: 'Dados Estruturados', desc: 'API REST com dados normalizados e paginação cursor-based.' },
      { title: 'Multi-idioma', desc: 'Suporte a clubes e competições de todos os países e federações.' },
    ],
  },
  auth: {
    loginTitle: 'Entrar',
    loginSubtitle: 'Acesse sua conta no Almanaque dos Clubes',
    email: 'Email',
    password: 'Senha',
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
    acceptRequired: 'É necessário aceitar os Termos de Uso e a Política de Privacidade para se cadastrar.',
    registerErrorDefault: 'Erro ao cadastrar',
  },
  pages: {
    clubs: { title: 'Clubes', subtitle: 'Explore {n} clubes de futebol cadastrados.', placeholder: 'Buscar clubes por nome, país ou cidade...' },
    players: { title: 'Jogadores', subtitle: 'Pesquise jogadores de futebol de todos os tempos e lugares.', placeholder: 'Buscar jogadores por nome, país ou posição...' },
    rankings: { title: 'Rankings', subtitle: 'Rankings históricos com fontes verificadas e data de publicação.' },
    search: { title: 'Busca Avançada', subtitle: 'Pesquise clubes, jogadores, competições e estatísticas com filtros avançados.', placeholder: 'Digite um termo para buscar...' },
  },
  langSelector: { label: 'Idioma', current: 'Idioma atual' },
  legal: {
    updatedLabel: 'Última atualização',
    terms: {
      title: 'Termos de Uso e Serviço',
      intro:
        'Estes Termos de Uso e Serviço ("Termos") regem o acesso e o uso da plataforma Almanaque dos Clubes, operada por END ART Studios (CNPJ 45.370.930/0001-75). Ao criar uma conta ou utilizar a plataforma, o usuário declara ter lido, compreendido e aceitado integralmente estes Termos.',
      sections: [
        { title: '1. Aceitação', body: [
          'Ao se cadastrar ou utilizar a plataforma, o usuário concorda com estes Termos e com a Política de Privacidade. Se não concordar, não utilize a plataforma.',
          'O aceite é exigido no momento do cadastro na forma de consentimento expresso e não pode ser dispensado.',
        ]},
        { title: '2. Cadastro e conta', body: [
          'O cadastro exige informações verdadeiras e atualizadas (nome e e-mail válido) e a criação de senha segura.',
          'O usuário é responsável por manter a confidencialidade das credenciais de acesso e por todas as atividades realizadas em sua conta.',
          'O usuário deve ter capacidade legal para contratar; menores de idade necessitam de autorização dos responsáveis.',
        ]},
        { title: '3. Uso permitido', body: [
          'A plataforma destina-se à consulta, pesquisa e análise de dados históricos do futebol mundial.',
          'É vedado usar a plataforma para qualquer fim ilícito, violar direitos de terceiros, tentar acessar dados de outros usuários ou comprometer a segurança da plataforma.',
        ]},
        { title: '4. Planos e pagamentos (CDC)', body: [
          'A plataforma oferece planos gratuitos e pagos (Free, Pro e Elite), conforme descrito no site.',
          'A cobrança pode ser processada por provedor de pagamento externo. As relações de consumo seguem o Código de Defesa do Consumidor (Lei nº 8.078/1990), incluindo direito de arrependimento quando aplicável.',
        ]},
        { title: '5. Propriedade intelectual', body: [
          'Todo o conteúdo, marca, software e código-fonte da plataforma são propriedade de END ART Studios e estão protegidos por direitos autorais e legislação aplicável.',
          'O usuário não pode copiar, modificar, distribuir, sublicenciar ou utilizar o software sem autorização prévia por escrito, conforme o arquivo LICENSE.',
        ]},
        { title: '6. Conteúdo e dados', body: [
          'Os dados históricos são exibidos com base em fontes verificadas. A END ART Studios não garante atualização contínua de todos os dados, mas empenha esforços de verificação.',
          'O usuário pode reportar imprecisões para revisão.', 
        ]},
        { title: '7. Limitação de responsabilidade', body: [
          'A plataforma é fornecida "como está". A END ART Studios não se responsabiliza por danos indiretos decorrentes do uso, na medida permitida pela lei.',
        ]},
        { title: '8. Suspensão e rescisão', body: [
          'O descumprimento destes Termos pode levar à suspensão ou cancelamento da conta, sem prejuízo de outras medidas legais.',
        ]},
        { title: '9. Alterações', body: [
          'Estes Termos podem ser atualizados. Alterações relevantes serão comunicadas, e o uso continuado da plataforma após a atualização implica aceitação da nova versão.',
        ]},
        { title: '10. Contato e foro', body: [
          'Dúvidas sobre estes Termos: endart.studios@gmail.com. Foro competente: comarca de Osasco, São Paulo, salvo disposição legal em contrário.',
        ]},
      ],
    },
    privacy: {
      title: 'Política de Privacidade',
      intro:
        'Esta Política de Privacidade descreve como a END ART Studios (CNPJ 45.370.930/0001-75) coleta, utiliza, armazena e protege os dados pessoais dos usuários da plataforma Almanaque dos Clubes, em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD) e demais normas aplicáveis.',
      sections: [
        { title: '1. Dados coletados', body: [
          'Dados de cadastro: nome, e-mail e senha (armazenada de forma segura com hash).',
          'Dados de uso: informações de navegação, dispositivos e logs de acesso, para fins de segurança e melhoria do serviço.',
          'Dados de cobrança: processados por provedores de pagamento externos; a END ART Studios não armazena dados completos de cartão.',
        ]},
        { title: '2. Finalidades do tratamento', body: [
          'Criar e gerenciar a conta, autenticar o usuário e proteger o acesso.',
          'Prestar os serviços contratados, incluindo planos pagos e recursos de IA.',
          'Garantir a segurança da plataforma, prevenir fraudes e atividades abusivas.',
          'Comunicar atualizações, alterações de termos e informações relevantes.',
        ]},
        { title: '3. Base legal', body: [
          'O tratamento se baseia no consentimento (art. 7º, I, da LGPD), na execução de contrato, no legítimo interesse e no cumprimento de obrigações legais, conforme aplicável.',
        ]},
        { title: '4. Compartilhamento', body: [
          'Não vendemos dados pessoais. Dados podem ser compartilhados com provedores de infraestrutura e pagamento, estritamente necessários à operação, e com autoridades quando exigido por lei.',
        ]},
        { title: '5. Direitos do titular (LGPD)', body: [
          'O usuário pode solicitar confirmação, acesso, correção, anonimização, portabilidade, eliminação e revogação do consentimento.',
          'Para exercer seus direitos, entre em contato com o canal de privacidade indicado abaixo.',
        ]},
        { title: '6. Cookies', body: [
          'Utilizamos cookies e tecnologias semelhantes para funcionamento, autenticação e preferências (como idioma). O usuário pode gerenciar cookies no navegador.',
        ]},
        { title: '7. Segurança', body: [
          'Adotamos medidas técnicas e organizacionais (criptografia de senha, controle de acesso, monitoramento) para proteger os dados. Nenhum sistema é infalível; guardamos a senha de forma hash e não em texto claro.',
        ]},
        { title: '8. Retenção', body: [
          'Os dados são mantidos pelo tempo necessário às finalidades e obrigações legais, ou até a exclusão a pedido do titular ou encerramento da conta.',
        ]},
        { title: '9. Menores', body: [
          'A plataforma não se destina a menores de idade sem consentimento dos responsáveis. Não coletamos intencionalmente dados de menores.',
        ]},
        { title: '10. Encarregado (DPO) e contato', body: [
          'Solicitações de privacidade e exercício de direitos: endart.studios@gmail.com.',
          'A END ART Studios é o controlador dos dados tratados na plataforma.',
        ]},
      ],
    },
  },
};

export default pt;
