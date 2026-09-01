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
    notFoundTitle: 'Página não encontrada',
    cookieBanner: { title: 'Sua privacidade importa', body: 'Usamos cookies necessários para autenticação, segurança e funcionamento. Com sua autorização, também podemos usar cookies opcionais para medir audiência, melhorar o serviço e, quando aplicável, realizar marketing. Você pode aceitar, rejeitar ou escolher por categoria; a recusa não impede as funções essenciais.', accept: 'Aceitar opcionais', reject: 'Rejeitar opcionais', manage: 'Gerenciar preferências', save: 'Salvar preferências', necessary: 'Cookies necessários — sempre ativos', necessaryAlways: 'Sempre ativos: indispensáveis para funcionamento e segurança', preferences: 'Cookies de preferências', analytics: 'Cookies de analytics', personalization: 'Cookies de personalização', marketing: 'Cookies de marketing/publicidade', footerManage: 'Gerenciar cookies' },
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
    acceptRequired: 'É necessário aceitar os Termos de Uso e a Política de Privacidade para se cadastrar.',
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
    clubs: { title: 'Clubes', subtitle: 'Explore {n} clubes de futebol cadastrados.', placeholder: 'Buscar clubes por nome, país ou cidade...' },
    players: { title: 'Jogadores', subtitle: 'Pesquise jogadores de futebol de todos os tempos e lugares.', placeholder: 'Buscar jogadores por nome, país ou posição...' },
    competitions: { title: 'Competições', subtitle: 'Explore {n} competições de futebol cadastradas.', empty: 'Nenhuma competição encontrada.' },
    rankings: { title: 'Rankings', subtitle: 'Rankings históricos com fontes verificadas e data de publicação.' },
    search: { title: 'Busca Avançada', subtitle: 'Pesquise clubes, jogadores, competições e estatísticas com filtros avançados.', placeholder: 'Digite um termo para buscar...' },
    sobre: {
      title: 'Sobre nós',
      intro: 'O Almanaque dos Clubes é uma plataforma digital dedicada à pesquisa e organização de informações históricas sobre futebol. Reunimos dados sobre clubes, jogadores, competições, partidas e rankings, com ferramentas de busca e recursos assistidos por inteligência artificial.',
      sections: [
        { title: 'Nosso compromisso', body: [
          'Nosso compromisso é oferecer uma experiência útil, transparente e responsável. As informações podem ser compiladas de fontes públicas, bases licenciadas, contribuições de usuários e processos internos de revisão. A existência de uma fonte ou citação não significa que o Almanaque endosse todos os seus conteúdos, nem que cada registro esteja livre de erro.',
          'A data de atualização e, quando disponível, a fonte de cada informação devem ser consultadas na própria página do registro.',
        ]},
        { title: 'Não somos órgão oficial', body: [
          'O Almanaque não é órgão oficial de federação, clube, liga, atleta ou competição, salvo indicação expressa. Nomes, marcas, escudos, imagens e outros sinais pertencentes a terceiros permanecem de seus respectivos titulares.',
          'O uso nominativo ou informativo não implica patrocínio, afiliação ou autorização, e os materiais protegidos devem ser utilizados somente com licença, autorização, base legal ou finalidade permitida.',
        ]},
        { title: 'Operação e identificação', body: [
          'A operação e o fornecimento dos serviços são realizados por END ART Studios — CNPJ 45.370.930/0001-75, Osasco, SP — Brasil. Para questões de atendimento, conteúdo, privacidade ou segurança, utilize os canais indicados no rodapé e nas páginas correspondentes.',
        ]},
      ],
    },
    planos: {
      title: 'Planos',
      intro: 'O Almanaque dos Clubes oferece planos gratuitos e pagos. Valores vigentes a partir de 01/09/2026; a moeda é definida pela localização real do visitante (América do Sul e Central: R$; países que usam dólar: $; Europa: €).',
      sections: [
        { title: 'Free — {free}', body: ['Recursos gratuitos indicados na página, sujeitos a limites técnicos razoáveis informados previamente.'] },
        { title: 'Pro — {proMonthly}', body: ['{proMonthly}/mês; anual com 15% de desconto. Pagamento via Stripe, somente após confirmação expressa do consumidor; recursos e limites descritos antes do pagamento.'] },
        { title: 'Elite — {eliteMonthly}', body: ['{eliteMonthly}/mês; anual com 15% de desconto. Pagamento via Stripe, somente após confirmação expressa do consumidor; recursos e limites descritos antes do pagamento.'] },
        { title: 'Contratação transparente', body: [
          'A assinatura somente será concluída após o consumidor visualizar um resumo com plano, preço total, periodicidade, renovação, forma de pagamento, limitações relevantes e política de cancelamento.',
          'O consumidor pode cancelar a renovação pelos mesmos meios usados para contratar, sem necessidade de justificativa. O direito de arrependimento legal será respeitado.',
          'Não haverá aumento de preço, redução substancial de recursos ou mudança de periodicidade sem aviso prévio claro. O Free não deve ser convertido automaticamente em plano pago.',
        ]},
      ],
      note: 'Mês: Pro {proMonthly} · Elite {eliteMonthly}. Ano: 15% de desconto. Pagamento via Stripe. Moeda conforme a localização real.',
    },
    seguranca: {
      title: 'Segurança e Vulnerabilidades',
      intro: 'A segurança é responsabilidade compartilhada. Esta página descreve os controles adotados e o canal para reporte de vulnerabilidades.',
      sections: [
        { title: 'Controles adotados', body: ['Adotamos controles proporcionais ao risco: autenticação segura, senhas com hash forte e sal, proteção de sessão, TLS, gestão de segredos fora do código, princípio do menor privilégio, logs protegidos, backups testados, correções e dependências atualizadas, revisão de permissões, segregação de ambientes, monitoramento, rate limiting e plano de continuidade.'] },
        { title: 'Reporte de vulnerabilidades', body: ['Vulnerabilidades podem ser reportadas em endart.studios@gmail.com. Informe o ativo afetado, passos reprodutíveis, impacto, evidências mínimas e contato.', 'Não acesse, altere, exclua ou exfiltre dados além do indispensável à demonstração, nem realize indisponibilidade, engenharia social ou testes em terceiros.'] },
        { title: 'Resposta e divulgação', body: ['Responderemos ao recebimento, investigaremos, preservaremos evidências, corrigiremos ou mitigaremos e comunicaremos o status em prazo razoável. A divulgação coordenada é preferida.'] },
        { title: 'Incidentes com dados pessoais', body: ['Em caso de incidente com dados pessoais, classificamos o risco, contemos o evento, preservamos logs, redefinimos credenciais, avaliamos titulares afetados, registramos decisões e cumprimos os deveres de comunicação da LGPD e da ANPD.'] },
      ],
    },
    cookiePolicy: {
      title: 'Política de Cookies',
      intro: 'Esta Política de Cookies explica como a END ART Studios utiliza cookies e tecnologias semelhantes no Almanaque dos Clubes. O inventário será atualizado conforme os cookies, fornecedores e tecnologias efetivamente instalados. END ART Studios, CNPJ 45.370.930/0001-75.',
      sections: [
        { title: 'O que são cookies', body: ['Cookies são pequenos arquivos ou identificadores armazenados no navegador para permitir funcionamento, segurança, preferências e métricas. Tecnologias semelhantes (pixels, SDKs, local storage) são tratadas de forma equivalente quando permitem reconhecer ou acompanhar o usuário.'] },
        { title: 'Categorias', body: ['Necessários: sessão, login, segurança, prevenção de fraude e preferências essenciais — minimizados e sempre ativos quando indispensáveis.', 'Preferências: idioma, tema e escolhas de interface — consentimento quando não essencial.', 'Analytics: medição de audiência, erros e desempenho — consentimento granular; legítimo interesse apenas quando avaliado e sem rastreamento intrusivo.', 'Marketing/publicidade: campanhas, atribuição e remarketing — consentimento específico e revogável.'] },
        { title: 'Escolha, revogação e prova', body: ['O usuário pode aceitar, rejeitar ou selecionar categorias. A revogação deve ser tão fácil quanto a concessão. Mantemos prova da escolha apenas com os dados necessários. A recusa de cookies opcionais não impede o uso das funções essenciais.'] },
        { title: 'Terceiros e transferências', body: ['Fornecedores de hospedagem, autenticação, pagamento, analytics, suporte, IA e segurança podem receber identificadores conforme a finalidade, sempre minimizados e contratualmente vinculados. Quando houver transferência internacional, a LGPD e (se aplicável) o GDPR devem ser observados.'] },
        { title: 'Contato de privacidade', body: ['Dúvidas, revogação de preferências e exercício de direitos: endart.studios@gmail.com.'] },
      ],
      note: 'Classificação e inventário devem seguir a função real de cada cookie, não o nome comercial do fornecedor.',
    },
    ia: {
      title: 'Como usamos IA',
      intro: 'O Almanaque dos Clubes pode usar inteligência artificial como ferramenta auxiliar de pesquisa, síntese, classificação e apresentação de informações. Esta página explica o funcionamento, as limitações e seus direitos.',
      sections: [
        { title: 'Função', body: ['A IA apoia pesquisa, resumo, classificação e geração de respostas. É ferramenta de apoio e não substitui verificação independente, fonte oficial, orientação profissional ou decisão humana.'] },
        { title: 'Limitações', body: ['As respostas podem conter erros, omissões, inferências indevidas ou citações incompletas. Resultados podem variar e não refletir a informação mais recente. A presença de citações não garante endosso ou completude.'] },
        { title: 'Fontes e metodologia', body: ['Indicamos, quando disponível, a fonte e a data de atualização. Rankings e dados históricos refletem a metodologia, as fontes e o momento de atualização informados na página. O Almanaque não é órgão oficial de clubes, ligas ou federações, salvo indicação expressa.'] },
        { title: 'Dados e provedores', body: ['As perguntas podem ser processadas para gerar a resposta e para segurança. O fornecedor de IA, país de processamento, retenção e uso para treinamento constarão da Política de Privacidade; estão em avaliação alternativas gratuitas e de longo prazo.'] },
        { title: 'Seus direitos e contestação', body: ['Você pode solicitar correção de conteúdo, revisão de decisão automatizada, reclamação e exercício dos direitos da LGPD por endart.studios@gmail.com.'] },
      ],
      note: 'Não insira senhas, dados sensíveis, segredos comerciais ou dados de terceiros sem autorização. A IA pode errar; confira as fontes antes de reutilizar a informação.',
    },
    termosAssinatura: {
      title: 'Termos de Assinatura — Pro e Elite',
      intro: 'Estes Termos disciplinam a assinatura dos planos Pro e Elite do Almanaque dos Clubes, fornecidos por END ART Studios (CNPJ 45.370.930/0001-75), Osasco, SP - Brasil. Vigência: 01/09/2026. Em conflito, prevalece a norma cogente e a condição mais favorável ao consumidor.',
      sections: [
        { title: 'Objeto, planos e preço', body: ['Pro: {proMonthly}/mês (anual com 15% de desconto). Elite: {eliteMonthly}/mês (anual com 15% de desconto). A moeda segue a localização real do consumidor: América do Sul e Central em reais (R$), países que usam dólar em dólar ($) e Europa em euro (€). Pagamento via Stripe. A periodicidade, tributos, renovação, limites e recursos constam do checkout e do recibo. Nenhum plano gratuito é convertido automaticamente em pago; o pagamento exige ação afirmativa do consumidor.'] },
        { title: 'Renovação e alterações', body: ['A renovação automática somente ocorre se informada e autorizada antes da contratação, com aviso prévio. Alteração de preço, periodicidade ou redução substancial de recursos será comunicada antes de produzir efeitos; quando modificar materialmente o contrato, o consumidor poderá cancelar sem penalidade desproporcional.'] },
        { title: 'Uso e limitações da IA', body: ['As ferramentas de IA são auxiliares e podem errar. É proibido usar a plataforma para fraude, malware, assédio, violação de direitos, decisão automatizada relevante sem revisão, extração em massa, engenharia reversa, burla de limites ou treinamento de modelo concorrente sem licença escrita.'] },
        { title: 'Cancelamento e arrependimento', body: ['O consumidor pode cancelar a renovação pelo painel ou pelo mesmo meio da contratação, sem justificativa. Nas hipóteses do art. 49 do CDC, pode exercer o arrependimento em até 7 dias, sem barreiras, com restituição dos valores pagos conforme a lei. O cancelamento ordinário após o prazo não implica reembolso proporcional automático, salvo falha do serviço, cobrança indevida ou descumprimento da oferta.'] },
        { title: 'Responsabilidade e proteção de dados', body: ['A END ART responde conforme o CDC, a LGPD e demais leis por falhas que lhe sejam imputáveis. Nenhuma cláusula exclui responsabilidade legal inderrogável. O tratamento de dados segue a Política de Privacidade; o consumidor pode exercer seus direitos por endart.studios@gmail.com. O marketing é opcional e não condiciona a contratação.'] },
        { title: 'Lei e foro', body: ['Aplica-se a legislação brasileira. Nas relações de consumo, preserva-se o foro do domicílio do consumidor e qualquer outro foro legalmente favorável, sem prejuízo dos órgãos de defesa do consumidor.'] },
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
        { title: '11. Localização, geolocalização e moeda', body: [
          'Para exibir e cobrar o preço na moeda correta, determinamos o país do usuário a partir do endereço IP (localização aproximada). Para isso, o IP pode ser processado por provedores de geolocalização (ex.: ipwho.is) e pelo provedor de hospedagem (ex.: Vercel, Railway), estritamente para identificar o país e definir a moeda (América do Sul/Central: reais; países que usam dólar: dólar; Europa: euros).',
          'Base legal: execução do contrato e legítimo interesse. A localização não é usada para publicidade, perfilamento ou decisões automatizadas fora da precificação, e é tratada de forma minimizada apenas na definição da moeda.',
        ]},
      ],
    },
  },
};

export default pt;
