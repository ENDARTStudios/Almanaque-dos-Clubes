import type { Dictionary } from '../types';

const es: Dictionary = {
  site: {
    name: 'Almanaque dos Clubes',
    tagline: 'La historia del fútbol mundial en un solo lugar',
    description:
      'La mayor colección de datos históricos del fútbol mundial. Busca clubes, jugadores, competiciones y rankings con inteligencia artificial y fuentes verificadas.',
  },
  nav: {
    clubs: 'Clubes',
    players: 'Jugadores',
    competitions: 'Competiciones',
    map: 'Mapa',
    rankings: 'Rankings',
    search: 'Buscar',
    login: 'Entrar',
    dashboard: 'Panel',
    signOut: 'Salir',
  },
  footer: {
    tagline:
      'La historia completa del fútbol mundial a tu alcance. Clubes, jugadores, competiciones y rankings auditables.',
    platformTitle: 'Plataforma',
    platformClubs: 'Clubes',
    platformPlayers: 'Jugadores',
    platformCompetitions: 'Competiciones',
    platformRankings: 'Rankings',
    platformSearch: 'Búsqueda Avanzada',
    aboutTitle: 'Acerca de',
    aboutUs: 'Sobre nosotros',
    plans: 'Planes',
    api: 'API',
    blog: 'Blog',
    contact: 'Contacto',
    telegram: 'Telegram',
    legalTitle: 'Legal',
    privacy: 'Privacidad',
    cookies: 'Cookies',
    terms: 'Términos de Uso',
    security: 'Seguridad',
    dataSubjectRights: 'Derechos del Titular',
    copyrightClaims: 'Derechos de Autor (DMCA)',
    copyright: 'Copyright © 2026 END ART Studios',
  },
  common: {
    loading: 'Cargando...',
    back: 'Volver',
    backHome: 'Volver al inicio',
    viewAll: 'Ver todo',
    learnMore: 'Más información',
    comingSoonTitle: 'Módulo en desarrollo',
    comingSoonDesc: 'Próximamente: contenido completo de este módulo.',
    resultsFor: 'Resultados para:',
    resultsNote:
      'La búsqueda full-text se implementará con PostgreSQL tsvector + pg_trgm para ofrecer resultados rápidos incluso con grandes volúmenes de datos.',
    notFoundTitle: 'Página no encontrada',
    cookieBanner: {
      title: 'Tu privacidad importa',
      body: 'Usamos cookies necesarios para autenticación, seguridad y funcionamiento. Con tu autorización, también podemos usar cookies opcionales para medir audiencia, mejorar el servicio y, cuando corresponda, realizar marketing. Puedes aceptar, rechazar o elegir por categoría; rechazar cookies opcionales no impide las funciones esenciales.',
      accept: 'Aceptar opcionales',
      reject: 'Rechazar opcionales',
      manage: 'Gestionar preferencias',
      save: 'Guardar preferencias',
      necessary: 'Cookies necesarias — siempre activas',
      necessaryAlways: 'Siempre activas: indispensables para el funcionamiento y la seguridad',
      preferences: 'Cookies de preferencias',
      analytics: 'Cookies de analítica',
      personalization: 'Cookies de personalización',
      marketing: 'Cookies de marketing/publicidad',
      footerManage: 'Gestionar cookies',
    },
    notFoundDesc: 'El contenido que buscas no existe o ha sido movido.',
  },
  home: {
    heroTitle: 'La Historia del Fútbol',
    heroTitleAccent: 'en un Solo Lugar',
    heroSubtitle:
      'La mayor colección de datos históricos del fútbol mundial. Busca clubes, jugadores, competiciones y rankings con inteligencia artificial y fuentes verificadas.',
    ctaSearch: 'Comenzar Búsqueda',
    ctaRegister: 'Crear Cuenta Gratuita',
    stats: {
      clubs: 'Clubes registrados',
      players: 'Jugadores registrados',
      competitions: 'Competiciones históricas',
      matches: 'Partidos catalogados',
      rankings: 'Rankings publicados',
      growing: 'Acervo en crecimiento',
    },
    featuresTitle: 'Todo sobre el Fútbol Mundial',
    featuresSubtitle:
      'Datos históricos completos con herramientas modernas de búsqueda y análisis.',
    features: [
      {
        title: 'Historia Completa',
        desc: 'Accede a la colección completa de clubes, jugadores y competiciones desde el siglo XIX.',
      },
      {
        title: 'Rankings Auditables',
        desc: 'Rankings históricos con fuentes verificadas y fecha de publicación.',
      },
      {
        title: 'Búsqueda Inteligente',
        desc: 'Búsqueda de texto avanzada con índices full-text y búsqueda difusa.',
      },
      {
        title: 'IA con Citas',
        desc: 'Pregunta sobre fútbol y recibe respuestas con fuentes verificables.',
      },
      {
        title: 'Datos Estructurados',
        desc: 'API REST con datos normalizados y paginación cursor-based.',
      },
      {
        title: 'Multilingüe',
        desc: 'Soporte para clubes y competiciones de todos los países y federaciones.',
      },
    ],
  },
  auth: {
    loginTitle: 'Entrar',
    loginSubtitle: 'Accede a tu cuenta de Almanaque dos Clubes',
    email: 'Correo',
    password: 'Contraseña',
    passwordHelp: 'Mín. 8 caracteres, con mayúscula, minúscula y un número.',
    name: 'Nombre',
    loginSubmit: 'Entrar',
    loginErrorDefault: 'Error al iniciar sesión',
    noAccount: '¿No tienes cuenta?',
    loginLink: 'Crea una gratis',
    registerTitle: 'Crear Cuenta',
    registerSubtitle: 'Regístrate gratis en Almanaque dos Clubes',
    registerSubmit: 'Registrarse',
    haveAccount: '¿Ya tienes cuenta?',
    registerLink: 'Inicia sesión',
    acceptTerms: 'He leído y acepto los Términos de Uso y Servicio',
    acceptPrivacy: 'He leído y acepto la Política de Privacidad (LGPD)',
    acceptRequired:
      'Debes aceptar los Términos de Uso y la Política de Privacidad para registrarte.',
    registerErrorDefault: 'Error al crear la cuenta',
    forgotPasswordLink: '¿Olvidaste tu contraseña?',
    forgotPasswordTitle: 'Recuperar contraseña',
    forgotPasswordSubtitle: 'Ingresa tu email para recibir un enlace de restablecimiento.',
    forgotPasswordSubmit: 'Enviar enlace',
    forgotPasswordSent: 'Si el email existe, recibirás un enlace de restablecimiento.',
    resetPasswordTitle: 'Restablecer contraseña',
    resetPasswordSubtitle: 'Establece una nueva contraseña.',
    resetPasswordNew: 'Nueva contraseña',
    resetPasswordConfirm: 'Confirmar contraseña',
    resetPasswordSubmit: 'Guardar nueva contraseña',
    resetPasswordSuccess: 'Contraseña restablecida correctamente. Ya puedes iniciar sesión.',
    backToLogin: 'Volver al inicio de sesión',
    passwordMismatch: 'Las contraseñas no coinciden.',
  },
  pages: {
    clubs: {
      title: 'Clubes',
      subtitle: 'Explora {n} clubes de fútbol registrados.',
      placeholder: 'Buscar clubes por nombre, país o ciudad...',
    },
    players: {
      title: 'Jugadores',
      subtitle: 'Busca jugadores de fútbol de todas las épocas y lugares.',
      placeholder: 'Buscar jugadores por nombre, país o posición...',
    },
    competitions: {
      title: 'Competiciones',
      subtitle: 'Explora {n} competiciones de fútbol registradas.',
      empty: 'No se encontraron competiciones.',
    },
    favoritos: {
      title: 'Mi Almanaque',
      heartAdd: 'Favoritar',
      heartRemove: 'Favorito',
      remove: 'Quitar',
      empty:
        'Todavía no has favoritado ningún club. Usa el corazón en la página de un club para empezar.',
      live: 'En vivo',
      offline: 'Conectando…',
      error: 'Error al cargar favoritos.',
      rankingBadge: '#{position} en {name}',
    },
    champions: {
      title: 'Campeones actuales',
      empty: 'Sin campeones registrados por el momento — el acervo de títulos está en crecimiento.',
      season: 'Temporada',
      rankingBadge: '#{position} en {name}',
      dots: 'Tarjeta',
      prev: 'Anterior',
      next: 'Siguiente',
      hierarchy_mundial: 'Mundial',
      hierarchy_continental: 'Continental',
      hierarchy_nacional: 'Nacional',
      hierarchy_estadual: 'Estadual',
      hierarchy_municipal: 'Municipal',
    },
    compare: {
      title: 'Comparar',
      subtitle: 'Comparación lado a lado de clubes y jugadores con métricas auditables.',
      typeClubs: 'Clubes',
      typePlayers: 'Jugadores',
      searchPlaceholderA: 'Buscar club A…',
      searchPlaceholderB: 'Buscar club B…',
      compareBtn: 'Comparar',
      metric: 'Métrica',
      leader: 'Líder',
      titlesTotal: 'Títulos (acervo)',
      foundedYear: 'Fundación (más antiguo lidera)',
      stadiumCapacity: 'Estadio (mayor capacidad)',
      rankingPoints: 'Puntos del ranking vigente (0-100)',
      matches: 'Partidos en el acervo',
      timelineTitle: 'Evolución en el ranking (por temporada)',
      titlesTitle: 'Títulos por jerarquía',
      noData: 'No hay datos suficientes en el acervo para comparar.',
      selectBoth: 'Selecciona los dos ítems para comparar.',
      world: 'Mundial',
      continental: 'Continental',
      national: 'Nacional',
      state: 'Estadual',
      municipal: 'Municipal',
    },
    rankings: {
      title: 'Rankings',
      subtitle: 'Rankings históricos con fuentes verificadas y fecha de publicación.',
      filterYear: 'Año',
      filterGender: 'Género',
      filterCountry: 'País',
      all: 'Todos',
      genderMen: 'Masculino',
      genderWomen: 'Femenino',
      colPosition: 'Posición',
      colClub: 'Club',
      colPoints: 'Puntos (0-100)',
      colBase: 'Base auditable',
      baseOf: 'con base en {m} partidos / {t} títulos',
      loadMore: 'Cargar más',
      empty: 'Ningún ranking publicado todavía para este filtro.',
      updated: 'Ranking: {name}',
    },
    search: {
      title: 'Búsqueda Avanzada',
      subtitle: 'Busca clubes, jugadores, competiciones y estadísticas con filtros avanzados.',
      placeholder: 'Escribe un término para buscar...',
    },
    sobre: {
      title: 'Sobre nosotros',
      intro:
        'Almanaque dos Clubes es una plataforma digital dedicada a la investigación y organización de información histórica sobre fútbol. Reunimos datos sobre clubes, jugadores, competiciones, partidos y rankings, con herramientas de búsqueda y funciones asistidas por inteligencia artificial.',
      sections: [
        {
          title: 'Nuestro compromiso',
          body: [
            'Nuestro compromiso es ofrecer una experiencia útil, transparente y responsable. La información puede recopilarse de fuentes públicas, bases licenciadas, contribuciones de usuarios y procesos internos de revisión. La existencia de una fuente o cita no implica que el Almanaque respalde todo su contenido ni que cada registro esté libre de errores.',
            'La fecha de actualización y, cuando esté disponible, la fuente de cada información deben consultarse en la propia página del registro.',
          ],
        },
        {
          title: 'No somos un organismo oficial',
          body: [
            'El Almanaque no es un organismo oficial de ninguna federación, club, liga, atleta o competición, salvo indicación expresa. Los nombres, marcas, escudos, imágenes y otros signos pertenecientes a terceros permanecen en manos de sus respectivos titulares.',
            'El uso nominativo o informativo no implica patrocinio, afiliación ni autorización, y el material protegido solo debe utilizarse con licencia, autorización, base legal o finalidad permitida.',
          ],
        },
        {
          title: 'Operación e identificación',
          body: [
            'La operación y la prestación de los servicios son realizadas por END ART Studios — CNPJ 45.370.930/0001-75, Osasco, SP — Brasil. Para soporte, contenido, privacidad o seguridad, utilice los canales del pie de página y de las páginas correspondientes.',
          ],
        },
      ],
    },
    planos: {
      title: 'Planes',
      intro:
        'Almanaque dos Clubes ofrece una modalidad gratuita y dos suscripciones de pago. Para visitantes en Brasil, los precios se muestran en reales ({free}, {proMonthly}, {eliteMonthly}). El precio total, las funciones, los límites, la periodicidad y el próximo cobro se presentarán antes de la confirmación del pago. Última actualización: 2 de septiembre de 2026.',
      sections: [
        {
          title: 'Free',
          body: [
            '{free} — consulta inicial y uso de los recursos gratuitos disponibles. Sin conversión automática a plan de pago.',
          ],
        },
        {
          title: 'Pro',
          body: [
            '{proMonthly}/mes o {proMonthly} anual con 15% de descuento (12 × mensual). Búsqueda y análisis ampliados, con funciones de IA y citas cuando se indiquen en el checkout. Pago vía Stripe, solo tras confirmación expresa.',
          ],
        },
        {
          title: 'Elite',
          body: [
            '{eliteMonthly}/mes o {eliteMonthly} anual con 15% de descuento (12 × mensual). Límites y funciones avanzadas indicados en el checkout, incluida API o exportación cuando se incluya expresamente.',
          ],
        },
        {
          title: 'Funciones y límites',
          body: [
            'Todas las funciones y límites incluidos se describirán en una tabla comparativa en el checkout y en el panel de la cuenta (consultas, créditos de IA, llamadas de API, exportaciones, almacenamiento, soporte y límites de uso justo).',
            'La ausencia de una función o límite en la tabla significa que no está incluida automáticamente. END ART no anunciará "acceso ilimitado" o "API incluida" sin definir el alcance, las restricciones técnicas y la política de uso justo.',
          ],
        },
        {
          title: 'Contratación transparente',
          body: [
            'La contratación se procesa tras la confirmación expresa del consumidor. Antes del pago, será posible revisar plan, periodicidad, precio total, descuento, renovación automática, método de pago, límites, cancelación, reembolso y estos Términos de Uso.',
            'El plan Free no se convierte automáticamente en plan de pago. Los planes Pro y Elite se renuevan solo si esa condición se ha informado y aceptado en el checkout. El consumidor puede cancelar por los mismos canales usados para contratar o por endart.studios@gmail.com.',
          ],
        },
        {
          title: 'Cancelación y arrepentimiento',
          body: [
            'La cancelación detiene cobros futuros. Salvo condición más favorable, las funciones de pago permanecen hasta el final del periodo ya pagado. En contratación fuera del establecimiento comercial, el consumidor puede ejercer el derecho de arrepentimiento en el plazo legal de 7 días (art. 49 del CDC), por el panel o endart.studios@gmail.com.',
            'El reembolso se solicitará por el medio de pago utilizado, con confirmación al consumidor. END ART no reemplazará la restitución legal por crédito sin el consentimiento del consumidor.',
          ],
        },
        {
          title: 'Pago',
          body: [
            'El pago puede procesarse por Stripe o el proveedor identificado en el checkout. END ART no solicita la contraseña de la tarjeta y, cuando no sea necesario, no almacena datos completos de la tarjeta.',
          ],
        },
        {
          title: 'Inteligencia artificial y fuentes',
          body: [
            'Las funciones de IA son auxiliares. Pueden generar respuestas incorrectas, incompletas o desactualizadas. Verifica fuentes y fechas antes de publicar o tomar decisiones. No insertes contraseñas, datos bancarios, datos de salud, datos de menores o secretos comerciales en los prompts.',
          ],
        },
        {
          title: 'Atención e identificación',
          body: [
            'Dudas sobre planes, cancelación, cobro, reembolso o funciones: endart.studios@gmail.com.',
            'END ART Studios — CNPJ nº 45.370.930/0001-75 — Osasco, São Paulo, Brasil.',
          ],
        },
      ],
      note: 'Los valores y funciones mostrados aquí son informativos; la oferta vinculante es la presentada en el checkout, sujeta a los Términos de Uso y la Política de Privacidad.',
    },
    seguranca: {
      title: 'Seguridad y Vulnerabilidades',
      intro:
        'La seguridad es una responsabilidad compartida. Esta página describe los controles adoptados y el canal para informar vulnerabilidades.',
      sections: [
        {
          title: 'Controles adoptados',
          body: [
            'Controles técnicos en producción: Content Security Policy (CSP) y cabeceras de seguridad vía Helmet; contraseñas con hash argon2id; cookies de sesión httpOnly + SameSite con refresh token rotativo; protección CSRF de uso único en todas las operaciones de escritura; limitación de tasa en capas (límite global por IP, anti-fuerza bruta en el login por IP+email, ventana deslizante por usuario+IP en rutas de autenticación); Row-Level Security (RLS) en PostgreSQL para sesiones; audit log append-only para entidades críticas; hardening HTTP (gate de métodos, límite de payload, idempotencia); integración continua con gitleaks, pnpm audit, security-gate y detección de drift de migrations; procedimiento de backup y restauración documentado; mínimo privilegio (usuario de aplicación distinto del propietario de la base); secretos fuera del código; segregación de entornos; y monitoreo de peticiones, 5xx y fallos de autenticación.',
          ],
        },
        {
          title: 'Reporte de vulnerabilidades',
          body: [
            'Las vulnerabilidades pueden reportarse en endart.studios@gmail.com. Indique el activo afectado, pasos reproducibles, impacto, evidencia mínima y contacto.',
            'No acceda, altere, elimine ni exfiltre datos más allá de lo necesario para demostrar el problema, ni provoque caídas, ingeniería social o pruebas contra terceros.',
          ],
        },
        {
          title: 'Respuesta y divulgación',
          body: [
            'Acusaremos recibo, investigaremos, preservaremos evidencia, corregiremos o mitigaremos e informaremos el estado en un plazo razonable. Se prefiere la divulgación coordinada.',
          ],
        },
        {
          title: 'Incidentes con datos personales',
          body: [
            'Ante un incidente con datos personales, clasificamos el riesgo, contenemos el evento, preservamos registros, restablecemos credenciales, evaluamos a los titulares afectados, registramos decisiones y cumplimos los deberes de comunicación de la LGPD y la ANPD.',
          ],
        },
      ],
    },
    cookiePolicy: {
      title: 'Política de Cookies',
      intro:
        'Esta Política de Cookies explica cómo END ART Studios (CNPJ 45.370.930/0001-75) utiliza cookies y tecnologías similares en Almanaque dos Clubes. El inventario se actualizará según las cookies, proveedores y tecnologías realmente instaladas.',
      sections: [
        {
          title: 'Qué son las cookies',
          body: [
            'Las cookies son pequeños archivos o identificadores almacenados en el navegador para permitir funcionamiento, seguridad, preferencias y métricas. Las tecnologías similares (píxeles, SDKs, local storage) se tratan de forma equivalente cuando pueden reconocer o seguir al usuario.',
          ],
        },
        {
          title: 'Categorías',
          body: [
            'Necesarias: sesión, inicio de sesión, seguridad (CSRF), prevención de fraude, registro de la elección de consentimiento y preferencia de idioma — minimizadas y siempre activas cuando son indispensables. El rechazo no aplica a esta categoría.',
            'Preferencias: idioma, tema y elecciones de interfaz — consentimiento cuando no son esenciales.',
            'Analítica: medición de audiencia, errores y rendimiento — NO utilizadas actualmente. Si se contrata un proveedor en el futuro (ej.: PostHog, Plausible), será listado en el inventario siguiente y solo se cargará tras consentimiento granular.',
            'Marketing/publicidad: campañas, atribución y remarketing — NO utilizadas actualmente; si se contratan, exigirán consentimiento específico y revocable.',
          ],
        },
        {
          title: 'Elección, retirada y prueba',
          body: [
            'El usuario puede aceptar, rechazar o seleccionar categorías. La retirada debe ser tan fácil como la concesión. Guardamos prueba de la elección solo con los datos necesarios. Rechazar cookies opcionales no impide el uso de las funciones esenciales.',
          ],
        },
        {
          title: 'Terceros y transferencias',
          body: [
            'Proveedores actuales: Vercel (frontend), Railway (API y base PostgreSQL), Cloudflare (DNS/red) y Google Fonts (fuentes); pagos vía Stripe. Los proveedores de alojamiento, autenticación, pago, analítica, soporte, IA y seguridad pueden recibir identificadores según la finalidad, siempre minimizados y vinculados contractualmente. Cuando haya transferencia internacional, deben observarse la LGPD y (si aplica) el GDPR.',
          ],
        },
        {
          title: 'Contacto de privacidad',
          body: [
            'Dudas, retirada de preferencias y ejercicio de derechos: endart.studios@gmail.com. El canal actual de soporte es endart.studios@gmail.com.',
          ],
        },
      ],
      inventoryTitle: 'Inventario de cookies en uso',
      inventoryHeaders: ['Cookie', 'Finalidad', 'Categoría', 'Duración', 'Forma'],
      inventory: [
        {
          name: 'access_token',
          purpose: 'Autenticación (sesión del usuario)',
          category: 'Necesaria',
          duration: '≈ 15 minutos',
          form: 'Cookie httpOnly, primera parte',
        },
        {
          name: 'refresh_token',
          purpose: 'Renovación segura de la sesión (token rotativo)',
          category: 'Necesaria',
          duration: '7 días',
          form: 'Cookie httpOnly, primera parte',
        },
        {
          name: 'almanaque_locale',
          purpose: 'Preferencia de idioma de la interfaz',
          category: 'Necesaria (funcional)',
          duration: '1 año',
          form: 'Cookie primera parte',
        },
        {
          name: 'consent_v',
          purpose: 'Guarda su elección de consentimiento (para no volver a mostrar el banner)',
          category: 'Necesaria (prueba de consentimiento)',
          duration: '1 año',
          form: 'localStorage + cookie primera parte',
        },
        {
          name: '— (x-csrf-token)',
          purpose:
            'Protección CSRF de las escrituras — vía cabecera HTTP y almacenamiento en el servidor; NO usa cookie',
          category: 'Necesaria',
          duration: '24 h (uso único)',
          form: 'Cabecera HTTP',
        },
      ],
      note: 'La clasificación y el inventario siguen la función real de cada cookie, no el nombre comercial del proveedor. Hoy no hay cookies de analítica ni de publicidad instaladas; esta tabla se actualiza a cada cambio de inventario (última revisión: 15/09/2026 — versión 1.0 de la política).',
    },
    ia: {
      title: 'Cómo usamos la IA',
      intro:
        'Almanaque dos Clubes usa inteligencia artificial como herramienta auxiliar de investigación, síntesis, clasificación y presentación de información. Esta página explica su funcionamiento, limitaciones, directrices de uso y tus derechos. Las respuestas asistidas por IA no son una fuente oficial y no sustituyen la verificación humana.',
      sections: [
        {
          title: 'Función y limitaciones',
          body: [
            'Las funciones de IA de Almanaque dos Clubes son auxiliares de investigación, síntesis, clasificación y navegación del acervo. Las respuestas pueden ser incorrectas, incompletas, desactualizadas, ambiguas o con citas inadecuadas.',
            'Aviso junto a la consulta: "Respuesta asistida por inteligencia artificial. Puede contener errores, omisiones o información desactualizada. Comprueba las fuentes, fechas y contexto antes de usar o compartir. No insertes datos confidenciales o personales innecesarios."',
            'Aviso junto a la respuesta: "Importante: esta respuesta fue generada u organizada con ayuda de IA. No es una fuente oficial, no garantiza precisión o completitud y no sustituye la verificación humana. Consulta las fuentes indicadas y reporta una posible imprecisión a endart.studios@gmail.com."',
          ],
        },
        {
          title: 'Uso permitido',
          body: [
            'La IA debe utilizarse para investigación histórica, localización de registros, síntesis, comparación, organización y navegación del acervo, siempre dentro de los límites del plan. El usuario debe verificar la respuesta en fuentes primarias, fuentes citadas, registros oficiales u otras fuentes independientes antes de publicar, compartir o tomar decisiones.',
          ],
        },
        {
          title: 'Uso prohibido',
          body: [
            'Se prohíbe usar la IA para: generar malware, ransomware, phishing, credenciales falsas o instrucciones de intrusión; cometer fraude, falsedad, suplantación, amenazas, acoso, difamación o discriminación ilícita; insertar, inferir, exponer o explotar datos personales de terceros sin autorización; insertar contraseñas, datos de tarjeta, documentos, datos de salud, datos de menores, secretos comerciales o información confidencial innecesaria; violar derechos de autor, marcas, imagen, personalidad, confidencialidad, contratos o licencias; manipular rankings, fabricar fuentes, eliminar citas o atribuir una respuesta a END ART o a una fuente oficial sin autorización; realizar ingeniería inversa, eludir filtros, sortear rate limits, explotar vulnerabilidades o interferir en la disponibilidad; extraer en masa o usar la base, respuestas o API para construir, entrenar o alimentar un producto competidor; tomar decisiones de alto impacto sobre personas sin revisión humana, explicación, base legal y salvaguardas adecuadas; o usar salidas como asesoramiento jurídico, médico, financiero o como única base para decisiones de contratación, inversión, reputación o seguridad.',
          ],
        },
        {
          title: 'Fuentes, citas y datos enviados a proveedores',
          body: [
            'Cuando haya una cita, mostrar la fuente y la fecha de consulta o actualización cuando esté técnicamente disponible. No presentar una cita fabricada como fuente verificable.',
            'END ART mantiene una lista actualizada de los proveedores de IA, sus funciones, países, subprocesadores, retención, medidas de seguridad y uso o no para entrenamiento. La Política de Privacidad informa qué prompts, contexto, metadatos, comentarios y respuestas pueden enviarse. END ART no usará contenido identificable del usuario para entrenamiento fuera de la finalidad informada, salvo base legal adecuada.',
          ],
        },
        {
          title: 'Filtros e impugnación',
          body: [
            'El usuario no debe insertar contraseñas, datos bancarios, datos de salud, datos de menores, documentos de identidad, secretos comerciales ni información confidencial innecesaria en los prompts.',
            'Ante abuso, riesgo de seguridad o violación, END ART puede bloquear una consulta, reducir límites, suspender temporalmente, revocar API o finalizar una cuenta de forma proporcional. Cuando sea posible, comunicará el motivo y ofrecerá impugnación en endart.studios@gmail.com. Las medidas urgentes pueden ocurrir sin aviso previo cuando sea necesario para evitar daño grave.',
          ],
        },
      ],
    },
    termosAssinatura: {
      title: 'Términos de Suscripción — Pro y Elite',
      intro:
        'Estos Términos regulan la suscripción a los planes Pro y Elite de Almanaque dos Clubes, prestados por END ART Studios (CNPJ 45.370.930/0001-75), Osasco, SP - Brasil. Vigencia: 01/09/2026. En conflicto, prevalecen la norma cogente y la condición más favorable al consumidor.',
      sections: [
        {
          title: 'Objeto, planes y precio',
          body: [
            'Pro: {proMonthly}/mes (anual 15% de descuento). Elite: {eliteMonthly}/mes (anual 15% de descuento). La moneda sigue la ubicación real del consumidor: América del Sur y Central en reales (R$), países que usan dólar en dólares ($), Europa en euros (€). Pago vía Stripe. La periodicidad, impuestos, renovación, límites y funciones constan en el checkout y en el recibo. Ningún plan gratuito se convierte automáticamente en pago; el pago exige una acción afirmativa del consumidor.',
          ],
        },
        {
          title: 'Renovación y cambios',
          body: [
            'La renovación automática solo ocurre si se informa y autoriza antes de la contratación, con aviso previo. Un cambio de precio, periodicidad o reducción sustancial de funciones se comunicará antes de producir efectos; cuando modifique materialmente el contrato, el consumidor podrá cancelar sin penalidad desproporcionada.',
          ],
        },
        {
          title: 'Uso y limitaciones de la IA',
          body: [
            'Las herramientas de IA son auxiliares y pueden equivocarse. Está prohibido usar la plataforma para fraude, malware, acoso, vulneración de derechos, decisión automatizada relevante sin revisión, extracción masiva, ingeniería inversa, elusión de límites o entrenamiento de un modelo competidor sin licencia escrita.',
          ],
        },
        {
          title: 'Cancelación y desistimiento',
          body: [
            'El consumidor puede cancelar la renovación desde el panel o por el mismo medio usado para contratar, sin justificación. Bajo el art. 49 del CDC, puede ejercer el desistimiento en 7 días, sin barreras, con devolución de los importes pagados según la ley. La cancelación ordinaria tras el plazo no implica reembolso proporcional automático, salvo fallo del servicio, cobro indebido o incumplimiento de la oferta.',
          ],
        },
        {
          title: 'Responsabilidad y protección de datos',
          body: [
            'END ART responde conforme al CDC, la LGPD y la ley aplicable por fallos que le sean imputables. Ninguna cláusula excluye responsabilidad legal inderogable. El tratamiento de datos sigue la Política de Privacidad; el consumidor puede ejercer sus derechos en endart.studios@gmail.com. El marketing es opcional y no condiciona la contratación.',
          ],
        },
        {
          title: 'Ley y foro',
          body: [
            'Se aplica la legislación brasileña. En las relaciones de consumo, se preserva el foro del domicilio del consumidor y cualquier otro foro legalmente favorable, sin perjuicio de los órganos de defensa del consumidor.',
          ],
        },
      ],
      note: 'Proveedor: END ART Studios — CNPJ 45.370.930/0001-75, Osasco, SP — Brasil. Gateway: Stripe. Vigencia: 01/09/2026.',
    },
  },
  langSelector: { label: 'Idioma', current: 'Idioma actual' },
  legal: {
    updatedLabel: 'Última actualización',
    terms: {
      title: 'Términos de Uso y Servicio',
      intro:
        'Estos Términos de Uso y Servicio ("Términos") regulan el acceso y uso de la Plataforma Almanaque dos Clubes, operada por END ART Studios, CNPJ nº 45.370.930/0001-75 ("END ART"). Al crear una cuenta, contratar un plan o usar la Plataforma, el usuario declara haber leído y aceptado estos Términos. Última actualización: 2 de septiembre de 2026 · Versión 2.0.',
      sections: [
        {
          title: 'Identificación del proveedor',
          body: [
            'END ART Studios — Nombre Comercial: END ART Studios — CNPJ nº 45.370.930/0001-75 — Osasco, São Paulo, Brasil — contacto: endart.studios@gmail.com.',
          ],
        },
        {
          title: 'Términos de Uso y Servicio ("Términos")',
          body: [
            'Estos Términos regulan el acceso y uso del sitio, la aplicación, las herramientas de búsqueda, los datos históricos, los rankings, la API, las funciones asistidas por inteligencia artificial y los planes Free, Pro y Elite de Almanaque dos Clubes ("Plataforma").',
            'La contratación y el uso de la Plataforma también están sujetos a la Política de Privacidad, la Política de Cookies y la Política de Seguridad. En caso de conflicto entre estos Términos y una norma obligatoria de protección del consumidor o de datos, prevalece la norma obligatoria.',
          ],
        },
        {
          title: '1. Aceptación separada e información previa',
          body: [
            'El usuario tendrá acceso a estos Términos antes de crear una cuenta o contratar un plan. La aceptación contractual es un mecanismo separado de cualquier consentimiento para marketing, cookies opcionales u otras finalidades no necesarias para prestar el servicio.',
            'Al marcar "He leído y acepto los Términos de Uso", crear una cuenta o contratar un plan, el usuario confirma que tuvo la oportunidad de leer el documento. La Plataforma registrará la versión, fecha y hora de la aceptación. La falta de consentimiento para marketing u cookies opcionales no impide el registro ni la contratación.',
          ],
        },
        {
          title: '2. Identificación y objeto',
          body: [
            'La Plataforma es operada por END ART Studios, CNPJ nº 45.370.930/0001-75, Nombre Comercial END ART Studios, en Osasco, São Paulo, Brasil, contacto endart.studios@gmail.com.',
            'Almanaque dos Clubes reúne y organiza información histórica sobre clubes, jugadores, competiciones, partidos y rankings, con herramientas de búsqueda y funciones asistidas por IA. La Plataforma puede usar fuentes públicas, bases licenciadas, contribuciones autorizadas y procesos internos de revisión.',
            'Almanaque no es un organismo oficial de federación, club, liga, atleta o competición, salvo indicación expresa y documentada. La presencia de nombre, escudo, marca, imagen o registro no implica patrocinio, respaldo, afiliación ni autorización de terceros.',
          ],
        },
        {
          title: '3. Registro y cuenta',
          body: [
            'Para crear una cuenta, el usuario debe proporcionar información verdadera, actual y necesaria, mantener su correo actualizado y proteger su contraseña. Las contraseñas deben almacenarse de forma protegida, nunca en texto claro.',
            'El usuario no debe compartir credenciales, crear una cuenta para otra persona sin autorización, eludir controles, acceder a datos de terceros ni permitir que su cuenta se use para fraude, intrusión, extracción abusiva o violación de derechos.',
            'La Plataforma puede solicitar confirmación proporcional de identidad por seguridad, reembolso, cambio sensible o ejercicio de derechos. Nunca se solicitará la contraseña por correo.',
          ],
        },
        {
          title: '4. Planes, precio y características de la oferta',
          body: [
            'La Plataforma ofrece el plan Free y los planes de pago Pro y Elite, con periodicidad mensual o anual (el ciclo anual aplica descuento sobre 12 mensualidades). Los valores vigentes de cada plan, las monedas por región y los recursos incluidos son los descritos en la página /planos, que integra estos Términos para todos los efectos, conforme descrito en /planos.',
            'El checkout mostrará, antes de la confirmación, el precio total del periodo, la periodicidad, el descuento, impuestos aplicables, forma de pago, fecha de la siguiente cobro y limitaciones relevantes.',
            'El plan Free permite usar los recursos gratuitos identificados en la Plataforma, sin conversión automática a plan de pago. Pro y Elite permiten los recursos de pago descritos en el checkout, incluyendo, cuando se indique, búsqueda ampliada, IA asistida con citaciones, límites técnicos y, para Elite, API o exportación cuando se incluya expresamente.',
            'END ART no asumirá que API, exportación, créditos ilimitados de IA, acceso irrestricto o soporte prioritario están incluidos si no se describen expresamente en el resumen. Los límites vigentes de consultas, créditos, solicitudes, exportaciones, almacenamiento y rate limit se mostrarán antes del pago y en el panel del suscriptor.',
          ],
        },
        {
          title: '5. Checkout, contratación y renovación',
          body: [
            'Antes de finalizar el pago, el consumidor verá un resumen con: proveedor, plan, funciones, límites, precio, descuento, precio total, impuestos, periodicidad, renovación automática, medio de pago, fecha del siguiente cobro, reglas de cancelación, derecho de arrepentimiento y enlaces a estos Términos y la Política de Privacidad.',
            'El consumidor puede corregir datos, plan o forma de pago antes de la confirmación. La contratación solo se completa tras la confirmación expresa del botón de pago. END ART enviará confirmación y una copia electrónica conservable del contrato.',
            'La suscripción mensual o anual se renueva automáticamente solo si se informa de forma destacada antes del pago. No hay conversión de Free a plan de pago sin nueva contratación expresa. Ningún aumento de precio, reducción sustancial de funciones o cambio de periodicidad se aplicará sin aviso previo claro y, cuando sea necesario, nueva aceptación.',
          ],
        },
        {
          title: '6. Pago y fallo de cobro',
          body: [
            'Los pagos pueden procesarse por Stripe u otro proveedor indicado en el checkout. END ART no solicita ni almacena la contraseña de la tarjeta y, cuando no sea necesario, no almacena datos completos de la tarjeta.',
            'En caso de fallo de cobro, END ART puede informar el problema, permitir la actualización del medio de pago y limitar temporalmente funciones de pago tras aviso razonable. No se realizarán cobros ocultos, duplicados ni diferentes al precio confirmado.',
          ],
        },
        {
          title: '7. Cancelación',
          body: [
            'El consumidor puede cancelar la renovación desde el panel de la cuenta o el mismo canal usado para contratar, o por endart.studios@gmail.com, sin justificación.',
            'Cancelar la renovación detiene cobros futuros. Salvo cese inmediato solicitado por el consumidor o medida necesaria por violación comprobada, el acceso a funciones de pago permanece hasta el final del periodo ya pagado. La cancelación no elimina derechos de reembolso o arrepentimiento.',
            'La eliminación de la cuenta y de datos sigue la Política de Privacidad. Los registros necesarios para reembolso, contabilidad, seguridad, prevención de fraude, obligación legal o defensa pueden conservarse de forma restringida por el plazo necesario.',
          ],
        },
        {
          title: '8. Derecho de arrepentimiento y reembolso',
          body: [
            'En contrataciones fuera del establecimiento comercial, el consumidor puede ejercer el derecho de arrepentimiento en el plazo de 7 días desde la firma o recepción del servicio, conforme al art. 49 del Código de Defensa del Consumidor.',
            'La solicitud puede realizarse por el panel, el flujo de cancelación o endart.studios@gmail.com. END ART proporcionará confirmación y protocolo, detendrá la renovación y solicitará la restitución por el medio de pago utilizado. El consumidor no estará obligado a aceptar crédito cuando la ley exija restitución.',
            'El uso del servicio no se utilizará aisladamente para negar automáticamente el derecho legal de arrepentimiento. Las disputas de fraude, chargeback o uso por terceros se investigarán por separado.',
          ],
        },
        {
          title: '9. Contenido, fuentes y precisión',
          body: [
            'La información histórica puede contener lagunas, divergencias entre fuentes, cambios posteriores, errores de transcripción o datos aún no revisados. La expresión "fuentes verificadas" significa que la Plataforma busca identificar y revisar fuentes, no que todo registro sea infalible u oficialmente reconocido.',
            'La fecha de actualización, la fuente y la metodología, cuando estén disponibles, deben consultarse en la página del registro o ranking. El usuario puede reportar imprecisiones a endart.studios@gmail.com.',
          ],
        },
        {
          title: '10. Directrices de uso de la IA',
          body: [
            'Las funciones de IA son auxiliares de investigación y organización. Las respuestas pueden ser incorrectas, incompletas, desactualizadas, ambiguas o con citas inadecuadas. El usuario debe verificar fuentes, fechas y contexto antes de publicar, compartir o tomar decisiones.',
            'Se prohíbe usar la IA o la Plataforma para: generar o difundir malware, phishing o instrucciones de intrusión; cometer fraude, amenazas, acoso, difamación o discriminación ilícita; producir falsificaciones o suplantaciones; insertar o explotar datos personales de terceros sin autorización; violar derechos de autor, marcas, imagen o secretos comerciales; manipular rankings o información histórica; eludir filtros, rate limits o controles; realizar ingeniería inversa; copiar o extraer la base a escala; entrenar o alimentar un modelo competidor con datos de la Plataforma; o tomar decisiones de alto impacto sin revisión humana adecuada.',
            'El usuario no debe insertar contraseñas, datos bancarios, datos de salud, datos de menores, documentos de identidad, secretos comerciales ni información confidencial innecesaria en los prompts. El tratamiento de prompts, respuestas, metadatos y logs se describe en la Política de Privacidad.',
            'END ART puede aplicar filtros, limitar solicitudes, revocar claves de API, suspender o finalizar el acceso de forma proporcional cuando haya indicio razonable de abuso, riesgo de seguridad o violación. Cuando sea posible, informará el motivo, preservará evidencia mínima y ofrecerá un canal de impugnación.',
          ],
        },
        {
          title: '11. Propiedad intelectual',
          body: [
            'END ART o sus licenciantes poseen los derechos aplicables sobre la marca, identidad visual, software, código, diseño, arquitectura, API, documentación, taxonomías, modelos de datos, índices, scripts, pipelines, metodologías, textos editoriales originales, imágenes propias, prompts propietarios, selección, organización, normalización, curación y disposición creativa del acervo.',
            'Los hechos históricos, nombres, fechas, resultados, estadísticas, registros públicos, marcas, escudos, fotografías, vídeos y materiales de terceros no se convierten en propiedad exclusiva de END ART solo por mostrarse, agregarse u organizarse en la Plataforma. Estos materiales siguen sujetos a los derechos y licencias de sus titulares.',
            'Durante la vigencia del plan, END ART otorga al usuario una licencia limitada, personal, no exclusiva, no transferible y sin derecho de sublicencia para acceder y usar la Plataforma según el plan contratado. Esta licencia no transfiere propiedad ni autoriza copiar sustancialmente, extraer, reflejar, revender, redistribuir a escala, publicar en una base competidora, eliminar avisos, eludir límites o hacer scraping abusivo.',
            'El usuario conserva los derechos sobre el contenido que envíe, cuando los tenga, y otorga a END ART solo la licencia técnica necesaria para alojar, procesar, mostrar al usuario, ejecutar la función solicitada, mantener seguridad, soporte, respaldo y cumplir obligaciones legales.',
            'Las salidas de IA pueden no ser exclusivas, pueden contener elementos no protegibles o de terceros y pueden requerir revisión. En la medida permitida por la ley, el usuario puede usar una salida legítima para una finalidad compatible con el plan.',
          ],
        },
        {
          title: '12. API y extracción',
          body: [
            'Cuando la API esté incluida en el plan, el acceso se limita a la documentación, clave individual, límites y finalidades del checkout. Se prohíbe compartir claves, eludir rate limits, extraer la base íntegra o sustancialmente, crear un espejo, revender respuestas, redistribuir a escala o crear un servicio competidor sin autorización escrita.',
            'END ART puede bloquear solicitudes anómalas para proteger la disponibilidad y los datos. La medida será proporcional y podrá impugnarse en endart.studios@gmail.com.',
          ],
        },
        {
          title: '13. Seguridad, suspensión y cese',
          body: [
            'END ART adopta controles proporcionales al riesgo, incluida protección de credenciales, control de acceso, gestión de secretos, TLS cuando aplica, logs, copias de seguridad, actualizaciones, monitoreo y rate limiting. Ningún servicio conectado a internet es absolutamente invulnerable.',
            'Ante violación, fraude, riesgo de seguridad o uso abusivo, END ART puede advertir, limitar funciones, revocar una clave, suspender temporalmente o finalizar una cuenta, según gravedad y urgencia. Cuando sea posible, comunicará el motivo y ofrecerá impugnación. Las medidas de emergencia pueden aplicarse de inmediato para evitar daño grave.',
            'Cuando el cese ocurra por decisión de END ART sin culpa del consumidor durante un periodo pagado, se evaluará una solución proporcional, como corrección, recurso equivalente, reducción o reembolso correspondiente.',
          ],
        },
        {
          title: '14. Responsabilidad',
          body: [
            'END ART responderá conforme al Código de Defensa del Consumidor, la LGPD y demás leyes aplicables por los daños y fallos que le sean imputables. Nada en estos Términos excluye responsabilidad legal inderogable, vicio o defecto del servicio, cobro indebido, violación de datos o derechos básicos del consumidor.',
            'END ART no garantiza disponibilidad continua, ausencia absoluta de error ni actualización instantánea de todo el acervo. Esta limitación no autoriza el incumplimiento de la oferta, la negación de derechos legales ni impide la corrección, soporte o reparación cuando proceda.',
            'El usuario puede responder por daños demostradamente causados por uso ilícito, inserción no autorizada de contenido, fraude, extracción abusiva o violación de derechos de terceros.',
          ],
        },
        {
          title: '15. Cambios',
          body: [
            'Los cambios no materiales pueden incorporarse indicando la fecha de actualización. Los cambios materiales se comunicarán antes de producir efectos, con un resumen claro y nueva aceptación cuando sea necesaria. El uso continuado no se utilizará aisladamente para imponer un cambio material a un contrato de adhesión sin comunicación adecuada.',
          ],
        },
        {
          title: '16. Comunicaciones y contacto',
          body: [
            'Servicio, cancelación, reembolso, corrección de contenido, privacidad y dudas contractuales: endart.studios@gmail.com. Para seguridad, se recomienda el canal dedicado indicado en la Política de Seguridad, cuando esté disponible.',
          ],
        },
        {
          title: '17. Ley aplicable y fuero',
          body: [
            'Se aplica la legislación brasileña. En relaciones de consumo, se preserva el fuero del domicilio del consumidor y cualquier otro fuero que la legislación reconozca como competente o más favorable. La indicación de Osasco, São Paulo no impide al consumidor utilizar su fuero legal, organismos de defensa del consumidor o el Poder Judicial.',
          ],
        },
        {
          title: 'Referencias',
          body: [
            '[1] CDC — Ley nº 8.078/1990 · [2] Decreto nº 7.962/2013 (comercio electrónico) · [3] LGPD — Ley nº 13.709/2018 · [4] Ley nº 9.610/1998 (Derechos de Autor) · [5] GDPR — Reglamento (UE) 2016/679, cuando aplique.',
          ],
        },
        {
          title: '18. Derechos de autor (DMCA) e historial de versiones',
          body: [
            'Los titulares de derechos de autor pueden notificar presuntas infracciones mediante el formulario en /direitos-autorais (descripción del material, ubicación, fundamentación legal y contacto) o por el canal endart.studios@gmail.com. Las notificaciones pasan por triaje y decisión motivada; el contenido inequívocamente infractor es retirado.',
            'Historial de versiones: v1.0 (01/09/2026) — versión inicial; v1.1 (18/09/2026) — inclusión del canal de notificaciones de derechos de autor; v1.2 (19/09/2026) — Stripe activado como procesador de pagamentos en producción.',
          ],
        },
      ],
    },
    privacy: {
      title: 'Política de Privacidad',
      intro:
        'Esta Política de Privacidad describe cómo END ART Studios (CNPJ 45.370.930/0001-75) recopila, utiliza, almacena y protege los datos personales de los usuarios de la plataforma Almanaque dos Clubes, de conformidad con la Ley General de Protección de Datos (Ley n.º 13.709/2018 — LGPD) y demás normas aplicables.',
      sections: [
        {
          title: '1. Datos recopilados',
          body: [
            'Datos de registro: nombre, correo y contraseña (almacenada de forma segura con hash).',
            'Datos de uso: información de navegación, dispositivos y registros de acceso, para seguridad y mejora del servicio.',
            'Datos de cobro: procesados por proveedores de pago externos; END ART Studios no almacena datos completos de tarjeta.',
          ],
        },
        {
          title: '2. Finalidades del tratamiento',
          body: [
            'Crear y gestionar la cuenta, autenticar al usuario y proteger el acceso.',
            'Prestar los servicios contratados, incluidos los planes de pago y las funciones de IA.',
            'Garantizar la seguridad de la plataforma y prevenir fraudes y actividades abusivas.',
            'Comunicar actualizaciones, cambios de términos e información relevante.',
          ],
        },
        {
          title: '3. Base legal',
          body: [
            'El tratamiento se basa en el consentimiento (art. 7.º, I, de la LGPD), la ejecución del contrato, el interés legítimo y el cumplimiento de obligaciones legales, según corresponda.',
          ],
        },
        {
          title: '4. Compartición',
          body: [
            'No vendemos datos personales. Los datos pueden compartirse con proveedores de infraestructura y pagos, estrictamente necesarios para la operación, y con las autoridades cuando la ley lo exija.',
            'Proveedores actuales del entorno: Vercel (alojamiento del frontend), Railway (alojamiento de la API y de la base PostgreSQL), Cloudflare (DNS y protección de red) y Google Fonts (fuentes tipográficas). Los pagos son procesados por Stripe, que actúa como controlador independiente de los datos de pago ante el titular. Esta lista se actualiza cada vez que se contrata o sustituye un proveedor.',
            'El procesador de pagos Stripe (Stripe, Inc., EE. UU.) trata datos de pago y antifraude, con transferencia internacional a EE. UU. conforme la LGPD (art. 33 y siguientes) y cláusulas contractuales tipo cuando aplique; los datos completos de tarjeta nunca tocan nuestros servidores (PCI DSS de Stripe).',
          ],
        },
        {
          title: '5. Derechos del titular (LGPD)',
          body: [
            'El usuario puede solicitar confirmación, acceso, corrección, anonimización, portabilidad, eliminación y revocación del consentimiento.',
            'Para ejercer sus derechos, contacta con el canal de privacidad indicado abajo.',
          ],
        },
        {
          title: '6. Cookies',
          body: [
            'Utilizamos cookies necesarias para la autenticación, la seguridad y las preferencias (como el idioma) y guardamos prueba de su elección de consentimiento. Las cookies opcionales (analítica/marketing) solo se activan con consentimiento y pueden revocarse en cualquier momento por el pie de página ("Gestionar cookies"). Inventario completo: Política de Cookies (/cookies).',
          ],
        },
        {
          title: '7. Seguridad',
          body: [
            'Adoptamos medidas técnicas y organizativas (cifrado de contraseña, control de acceso, monitorización) para proteger los datos. Ningún sistema es infalible; almacenamos las contraseñas con hash y nunca en texto claro.',
          ],
        },
        {
          title: '8. Conservación',
          body: [
            'Los datos se conservan durante el tiempo necesario para las finalidades y obligaciones legales, o hasta la eliminación a petición del titular o el cierre de la cuenta.',
          ],
        },
        {
          title: '9. Menores',
          body: [
            'La plataforma no está destinada a menores sin el consentimiento de sus responsables. No recopilamos intencionalmente datos de menores.',
          ],
        },
        {
          title: '10. Delegado de Protección de Datos (DPO) y contacto',
          body: [
            'Solicitudes de privacidad y ejercicio de derechos: endart.studios@gmail.com.',
            'END ART Studios es el responsable del tratamiento de los datos de la plataforma.',
          ],
        },
        {
          title: '11. Ubicación, geolocalización y moneda',
          body: [
            'Para mostrar y cobrar el precio en la moneda correcta, determinamos el país del usuario a partir de la dirección IP (ubicación aproximada). Para ello, la IP puede ser procesada por proveedores de geolocalización (p. ej., ipwho.is) y por nuestro proveedor de alojamiento (p. ej., Vercel, Railway), estrictamente para identificar el país y definir la moneda (América del Sur/Central: reales; países que usan dólar: dólares; Europa: euros).',
            'Base legal: ejecución del contrato e interés legítimo. La ubicación no se usa para publicidad, perfilado ni decisiones automatizadas fuera de la fijación de precios, y se trata de forma minimizada solo para definir la moneda.',
          ],
        },
        {
          title: '12. Ejercicio de derechos, canales e historial de versiones',
          body: [
            'Los derechos del art. 18 de la LGPD (confirmación, acceso, corrección, anonimización, portabilidad, eliminación, información sobre el compartimiento, información sobre las consecuencias de no proporcionar datos, revisión de decisiones automatizadas y revocación del consentimiento) pueden ejercerse mediante el formulario en /direitos-titular, con emisión de protocolo de seguimiento, o por el canal endart.studios@gmail.com.',
            'Las solicitudes de confirmación y acceso reciben respuesta inmediata; las demás, en un plazo de 15 días, prorrogable conforme el art. 18, §3, con comunicación a la ANPD.',
            'Historial de versiones: v1.0 (01/09/2026) — versión inicial; v1.1 (18/09/2026) — inclusión de los canales de ejercicio de derechos del titular y de notificaciones de derechos de autor; v1.2 (19/09/2026) — Stripe activado como procesador de pagamentos en producción.',
          ],
        },
      ],
    },
  },
  direitosTitular: {
    title: 'Derechos del Titular (LGPD art. 18)',
    intro: 'Ejerce tus derechos sobre datos personales sin necesidad de cuenta. La confirmación y el acceso reciben respuesta inmediata; los demás, en un plazo de 15 días (plazo ANPD), prorrogable conforme el art. 18, §3. Recibes un protocolo para seguir tu solicitud.',
    formTitle: 'Nueva solicitud',
    rightTypeLabel: 'Derecho que deseas ejercer',
    emailLabel: 'Tu correo electrónico de contacto',
    notesLabel: 'Detalles de la solicitud',
    notesOptional: '(opcional)',
    submit: 'Enviar solicitud',
    submitting: 'Enviando…',
    successTitle: 'Solicitud registrada',
    successBody: 'Guarda el protocolo de abajo para seguir el progreso.',
    protocolLabel: 'Protocolo',
    trackNow: 'Seguir ahora',
    trackTitle: 'Seguir la solicitud',
    trackInputLabel: 'Protocolo',
    trackButton: 'Consultar',
    notFound: 'Protocolo no encontrado. Verifica los caracteres e inténtalo de nuevo.',
    errorGeneric: 'No se pudo completar. Inténtalo de nuevo o escribe a endart.studios@gmail.com.',
    statusLabel: 'Estado',
    slaLabel: 'Plazo de respuesta',
    createdAtLabel: 'Recibida el',
    rightTypes: {
      confirmacao: 'Confirmación de la existencia del tratamiento',
      acesso: 'Acceso a los datos',
      correcao: 'Corrección de datos incompletos o desactualizados',
      anonimizacao: 'Anonimización, bloqueo o eliminación de datos innecesarios',
      portabilidade: 'Portabilidad de los datos',
      eliminacao: 'Eliminación de los datos tratados con consentimiento',
      infoCompartilhamento: 'Información sobre con quién compartimos los datos',
      infoConsequencia: 'Información sobre las consecuencias de no proporcionar datos',
      revisaoAutomatizada: 'Revisión de decisiones tomadas únicamente de forma automatizada',
      revogacao: 'Revocación del consentimiento',
    },
    statusLabels: {
      recebido: 'Recibida',
      em_andamento: 'En progreso',
      atendido: 'Atendida',
      indeferido: 'Denegada',
    },
  },
  copyrightForm: {
    title: 'Notificación de Derechos de Autor (DMCA)',
    intro: 'Los titulares de derechos de autor pueden notificar presuntas infracciones (DMCA art. 512 / Ley 9.610/98). Las notificaciones pasan por triaje con decisión motivada; el contenido inequívocamente infractor es retirado.',
    materialLabel: 'Material presuntamente vulnerado (describe la obra)',
    locationLabel: 'Ubicación en la plataforma (URL)',
    fundamentLabel: 'Fundamentación legal y declaración de buena fe',
    emailLabel: 'Correo electrónico de contacto',
    submit: 'Enviar notificación',
    submitting: 'Enviando…',
    successTitle: 'Notificación recibida',
    successBody: 'Guarda el protocolo de abajo. El triaje ocurre en hasta 5 días hábiles y las decisiones son siempre motivadas.',
    protocolLabel: 'Protocolo',
    errorGeneric: 'No se pudo enviar. Inténtalo de nuevo o escribe a endart.studios@gmail.com.',
  },

};

export default es;
