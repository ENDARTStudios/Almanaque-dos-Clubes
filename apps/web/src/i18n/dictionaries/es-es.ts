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
    terms: 'Términos de Uso',
    security: 'Seguridad',
    copyright: 'Copyright © 2026 END ART Studios',
  },
  common: {
    loading: 'Cargando...',
    backHome: 'Volver al inicio',
    viewAll: 'Ver todo',
    learnMore: 'Más información',
    comingSoonTitle: 'Módulo en desarrollo',
    comingSoonDesc: 'Próximamente: contenido completo de este módulo.',
    resultsFor: 'Resultados para:',
    resultsNote: 'La búsqueda full-text se implementará con PostgreSQL tsvector + pg_trgm para ofrecer resultados rápidos incluso con grandes volúmenes de datos.',
    notFoundTitle: 'Página no encontrada',
    cookieBanner: { title: 'Tu privacidad importa', body: 'Usamos cookies necesarios para autenticación, seguridad y funcionamiento. Con tu autorización, también podemos usar cookies opcionales para medir audiencia, mejorar el servicio y, cuando corresponda, realizar marketing. Puedes aceptar, rechazar o elegir por categoría; rechazar cookies opcionales no impide las funciones esenciales.', accept: 'Aceptar opcionales', reject: 'Rechazar opcionales', manage: 'Gestionar preferencias', save: 'Guardar preferencias', necessary: 'Cookies necesarias — siempre activas', necessaryAlways: 'Siempre activas: indispensables para el funcionamiento y la seguridad', preferences: 'Cookies de preferencias', analytics: 'Cookies de analítica', personalization: 'Cookies de personalización', marketing: 'Cookies de marketing/publicidad', footerManage: 'Gestionar cookies' },
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
    },
    featuresTitle: 'Todo sobre el Fútbol Mundial',
    featuresSubtitle: 'Datos históricos completos con herramientas modernas de búsqueda y análisis.',
    features: [
      { title: 'Historia Completa', desc: 'Accede a la colección completa de clubes, jugadores y competiciones desde el siglo XIX.' },
      { title: 'Rankings Auditables', desc: 'Rankings históricos con fuentes verificadas y fecha de publicación.' },
      { title: 'Búsqueda Inteligente', desc: 'Búsqueda de texto avanzada con índices full-text y búsqueda difusa.' },
      { title: 'IA con Citas', desc: 'Pregunta sobre fútbol y recibe respuestas con fuentes verificables.' },
      { title: 'Datos Estructurados', desc: 'API REST con datos normalizados y paginación cursor-based.' },
      { title: 'Multilingüe', desc: 'Soporte para clubes y competiciones de todos los países y federaciones.' },
    ],
  },
  auth: {
    loginTitle: 'Entrar',
    loginSubtitle: 'Accede a tu cuenta de Almanaque dos Clubes',
    email: 'Correo',
    password: 'Contraseña',
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
    acceptRequired: 'Debes aceptar los Términos de Uso y la Política de Privacidad para registrarte.',
    registerErrorDefault: 'Error al crear la cuenta',
  },
  pages: {
    clubs: { title: 'Clubes', subtitle: 'Explora {n} clubes de fútbol registrados.', placeholder: 'Buscar clubes por nombre, país o ciudad...' },
    players: { title: 'Jugadores', subtitle: 'Busca jugadores de fútbol de todas las épocas y lugares.', placeholder: 'Buscar jugadores por nombre, país o posición...' },
    rankings: { title: 'Rankings', subtitle: 'Rankings históricos con fuentes verificadas y fecha de publicación.' },
    search: { title: 'Búsqueda Avanzada', subtitle: 'Busca clubes, jugadores, competiciones y estadísticas con filtros avanzados.', placeholder: 'Escribe un término para buscar...' },
    sobre: {
      title: 'Sobre nosotros',
      intro: 'Almanaque dos Clubes es una plataforma digital dedicada a la investigación y organización de información histórica sobre fútbol. Reunimos datos sobre clubes, jugadores, competiciones, partidos y rankings, con herramientas de búsqueda y funciones asistidas por inteligencia artificial.',
      sections: [
        { title: 'Nuestro compromiso', body: ['Nuestro compromiso es ofrecer una experiencia útil, transparente y responsable. La información puede recopilarse de fuentes públicas, bases licenciadas, contribuciones de usuarios y procesos internos de revisión. La existencia de una fuente o cita no implica que el Almanaque respalde todo su contenido ni que cada registro esté libre de errores.', 'La fecha de actualización y, cuando esté disponible, la fuente de cada información deben consultarse en la propia página del registro.'] },
        { title: 'No somos un organismo oficial', body: ['El Almanaque no es un organismo oficial de ninguna federación, club, liga, atleta o competición, salvo indicación expresa. Los nombres, marcas, escudos, imágenes y otros signos pertenecientes a terceros permanecen en manos de sus respectivos titulares.', 'El uso nominativo o informativo no implica patrocinio, afiliación ni autorización, y el material protegido solo debe utilizarse con licencia, autorización, base legal o finalidad permitida.'] },
        { title: 'Operación e identificación', body: ['La operación y la prestación de los servicios son realizadas por END ART Studios — CNPJ 45.370.930/0001-75, Osasco, SP — Brasil. Para soporte, contenido, privacidad o seguridad, utilice los canales del pie de página y de las páginas correspondientes.'] },
      ],
    },
    planos: {
      title: 'Planes',
      intro: 'Almanaque dos Clubes ofrece planes gratuitos y de pago. Precios vigentes desde el 01/09/2026; la moneda depende del país de origen del registro (América Latina: R$; países que usan dólar: $; países que usan euro: €).',
      sections: [
        { title: 'Free — R$ 0,00', body: ['Funciones gratuitas indicadas en la página, sujetas a límites técnicos razonables informados previamente.'] },
        { title: 'Pro — € 4,90', body: ['€ 4,90/mes; anual 15% de descuento. Pago vía Stripe, solo tras la confirmación expresa del consumidor; funciones y límites descritos antes del pago.'] },
        { title: 'Elite — € 9,90', body: ['€ 9,90/mes; anual 15% de descuento. Pago vía Stripe, solo tras la confirmación expresa del consumidor; funciones y límites descritos antes del pago.'] },
        { title: 'Contratación transparente', body: ['La suscripción solo se completará tras ver un resumen con plan, precio total, periodicidad, renovación, forma de pago, limitaciones relevantes y política de cancelación.', 'El consumidor puede cancelar la renovación por los mismos medios utilizados para contratar, sin necesidad de justificación. Se respetará el derecho legal de desistimiento.', 'No habrá aumento de precio, reducción sustancial de funciones ni cambio de periodicidad sin aviso previo claro. Free no debe convertirse automáticamente en plan de pago.'] },
      ],
      note: 'Mes: Pro € 4,90 · Elite € 9,90. Año: 15% de descuento. Pago vía Stripe. Moneda según origen del registro.',
    },
    seguranca: {
      title: 'Seguridad y Vulnerabilidades',
      intro: 'La seguridad es una responsabilidad compartida. Esta página describe los controles adoptados y el canal para informar vulnerabilidades.',
      sections: [
        { title: 'Controles adoptados', body: ['Adoptamos controles proporcionales al riesgo: autenticación segura, contraseñas con hash fuerte y sal, protección de sesión, TLS, gestión de secretos fuera del código, principio de mínimo privilegio, registros protegidos, copias de seguridad probadas, parches y dependencias actualizadas, revisión de permisos, segregación de entornos, monitoreo, limitación de tasa y plan de continuidad.'] },
        { title: 'Reporte de vulnerabilidades', body: ['Las vulnerabilidades pueden reportarse en endart.studios@gmail.com. Indique el activo afectado, pasos reproducibles, impacto, evidencia mínima y contacto.', 'No acceda, altere, elimine ni exfiltre datos más allá de lo necesario para demostrar el problema, ni provoque caídas, ingeniería social o pruebas contra terceros.'] },
        { title: 'Respuesta y divulgación', body: ['Acusaremos recibo, investigaremos, preservaremos evidencia, corregiremos o mitigaremos e informaremos el estado en un plazo razonable. Se prefiere la divulgación coordinada.'] },
        { title: 'Incidentes con datos personales', body: ['Ante un incidente con datos personales, clasificamos el riesgo, contenemos el evento, preservamos registros, restablecemos credenciales, evaluamos a los titulares afectados, registramos decisiones y cumplimos los deberes de comunicación de la LGPD y la ANPD.'] },
      ],
    },
    cookiePolicy: {
      title: 'Política de Cookies',
      intro: 'Esta Política de Cookies explica cómo END ART Studios (CNPJ 45.370.930/0001-75) utiliza cookies y tecnologías similares en Almanaque dos Clubes. El inventario se actualizará según las cookies, proveedores y tecnologías realmente instaladas.',
      sections: [
        { title: 'Qué son las cookies', body: ['Las cookies son pequeños archivos o identificadores almacenados en el navegador para permitir funcionamiento, seguridad, preferencias y métricas. Las tecnologías similares (píxeles, SDKs, local storage) se tratan de forma equivalente cuando pueden reconocer o seguir al usuario.'] },
        { title: 'Categorías', body: ['Necesarias: sesión, inicio de sesión, seguridad, prevención de fraude y preferencias esenciales — minimizadas y siempre activas cuando son indispensables.', 'Preferencias: idioma, tema y elecciones de interfaz — consentimiento cuando no son esenciales.', 'Analítica: medición de audiencia, errores y rendimiento — consentimiento granular; interés legítimo solo cuando se evalúa y sin rastreo intrusivo.', 'Marketing/publicidad: campañas, atribución y remarketing — consentimiento específico y revocable.'] },
        { title: 'Elección, retirada y prueba', body: ['El usuario puede aceptar, rechazar o seleccionar categorías. La retirada debe ser tan fácil como la concesión. Guardamos prueba de la elección solo con los datos necesarios. Rechazar cookies opcionales no impide el uso de las funciones esenciales.'] },
        { title: 'Terceros y transferencias', body: ['Los proveedores de alojamiento, autenticación, pago, analítica, soporte, IA y seguridad pueden recibir identificadores según la finalidad, siempre minimizados y vinculados contractualmente. Cuando haya transferencia internacional, deben observarse la LGPD y (si aplica) el GDPR.'] },
        { title: 'Contacto de privacidad', body: ['Dudas, retirada de preferencias y ejercicio de derechos: endart.studios@gmail.com. El canal actual de soporte es endart.studios@gmail.com.'] },
      ],
      note: 'La clasificación y el inventario deben seguir la función real de cada cookie, no el nombre comercial del proveedor.',
    },
    ia: {
      title: 'Cómo usamos la IA',
      intro: 'Almanaque dos Clubes puede usar inteligencia artificial como herramienta auxiliar de investigación, síntesis, clasificación y presentación de información. Esta página explica su funcionamiento, limitaciones y tus derechos.',
      sections: [
        { title: 'Función', body: ['La IA apoya la investigación, el resumen, la clasificación y la generación de respuestas. Es una herramienta de apoyo y no sustituye la verificación independiente, una fuente oficial, el asesoramiento profesional ni la decisión humana.'] },
        { title: 'Limitaciones', body: ['Las respuestas pueden contener errores, omisiones, inferencias indebidas o citas incompletas. Los resultados pueden variar y no reflejar la información más reciente. La presencia de citas no garantiza respaldo ni completitud.'] },
        { title: 'Fuentes y metodología', body: ['Indicamos, cuando está disponible, la fuente y la fecha de actualización. Los rankings y datos históricos reflejan la metodología, las fuentes y el momento de actualización mostrados en la página. El Almanaque no es un organismo oficial de clubes, ligas o federaciones, salvo indicación expresa.'] },
        { title: 'Datos y proveedores', body: ['Las preguntas pueden procesarse para generar la respuesta y por seguridad. El proveedor de IA, el país de procesamiento, la retención y el uso para entrenamiento constarán en la Política de Privacidad; se están evaluando alternativas gratuitas a largo plazo.'] },
        { title: 'Tus derechos y contestación', body: ['Puedes solicitar corrección de contenido, revisión de una decisión automatizada, una reclamación y el ejercicio de los derechos de la LGPD en endart.studios@gmail.com.'] },
      ],
      note: 'No introduzcas contraseñas, datos sensibles, secretos comerciales ni datos de terceros sin autorización. La IA puede equivocarse; verifica las fuentes antes de reutilizar la información.',
    },
    termosAssinatura: {
      title: 'Términos de Suscripción — Pro y Elite',
      intro: 'Estos Términos regulan la suscripción a los planes Pro y Elite de Almanaque dos Clubes, prestados por END ART Studios (CNPJ 45.370.930/0001-75), Osasco, SP - Brasil. Vigencia: 01/09/2026. En conflicto, prevalecen la norma cogente y la condición más favorable al consumidor.',
      sections: [
        { title: 'Objeto, planes y precio', body: ['Pro: € 4,90/mes (anual 15% de descuento). Elite: € 9,90/mes (anual 15% de descuento). La moneda sigue el origen del registro: América Latina en reales (R$), países que usan dólar en dólares ($), países que usan euro en euros (€). Pago vía Stripe. La periodicidad, impuestos, renovación, límites y funciones constan en el checkout y en el recibo. Ningún plan gratuito se convierte automáticamente en pago; el pago exige una acción afirmativa del consumidor.'] },
        { title: 'Renovación y cambios', body: ['La renovación automática solo ocurre si se informa y autoriza antes de la contratación, con aviso previo. Un cambio de precio, periodicidad o reducción sustancial de funciones se comunicará antes de producir efectos; cuando modifique materialmente el contrato, el consumidor podrá cancelar sin penalidad desproporcionada.'] },
        { title: 'Uso y limitaciones de la IA', body: ['Las herramientas de IA son auxiliares y pueden equivocarse. Está prohibido usar la plataforma para fraude, malware, acoso, vulneración de derechos, decisión automatizada relevante sin revisión, extracción masiva, ingeniería inversa, elusión de límites o entrenamiento de un modelo competidor sin licencia escrita.'] },
        { title: 'Cancelación y desistimiento', body: ['El consumidor puede cancelar la renovación desde el panel o por el mismo medio usado para contratar, sin justificación. Bajo el art. 49 del CDC, puede ejercer el desistimiento en 7 días, sin barreras, con devolución de los importes pagados según la ley. La cancelación ordinaria tras el plazo no implica reembolso proporcional automático, salvo fallo del servicio, cobro indebido o incumplimiento de la oferta.'] },
        { title: 'Responsabilidad y protección de datos', body: ['END ART responde conforme al CDC, la LGPD y la ley aplicable por fallos que le sean imputables. Ninguna cláusula excluye responsabilidad legal inderogable. El tratamiento de datos sigue la Política de Privacidad; el consumidor puede ejercer sus derechos en endart.studios@gmail.com. El marketing es opcional y no condiciona la contratación.'] },
        { title: 'Ley y foro', body: ['Se aplica la legislación brasileña. En las relaciones de consumo, se preserva el foro del domicilio del consumidor y cualquier otro foro legalmente favorable, sin perjuicio de los órganos de defensa del consumidor.'] },
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
        'Estos Términos de Uso y Servicio ("Términos") rigen el acceso y el uso de la plataforma Almanaque dos Clubes, operada por END ART Studios (CNPJ 45.370.930/0001-75). Al crear una cuenta o utilizar la plataforma, el usuario declara haber leído, comprendido y aceptado íntegramente estos Términos.',
      sections: [
        { title: '1. Aceptación', body: [
          'Al registrarse o utilizar la plataforma, el usuario acepta estos Términos y la Política de Privacidad. Si no está de acuerdo, no utilice la plataforma.',
          'La aceptación se exige en el momento del registro como consentimiento expreso y no puede dispensarse.',
        ]},
        { title: '2. Registro y cuenta', body: [
          'El registro requiere información verdadera y actualizada (nombre y correo válido) y la creación de una contraseña segura.',
          'El usuario es responsable de mantener la confidencialidad de las credenciales de acceso y de todas las actividades realizadas en su cuenta.',
          'El usuario debe tener capacidad legal para contratar; los menores de edad requieren autorización de sus responsables.',
        ]},
        { title: '3. Uso permitido', body: [
          'La plataforma está destinada a la consulta, investigación y análisis de datos históricos del fútbol mundial.',
          'Está prohibido usar la plataforma para fines ilícitos, vulnerar derechos de terceros, intentar acceder a datos de otros usuarios o comprometer la seguridad de la plataforma.',
        ]},
        { title: '4. Planes y pagos (CDC)', body: [
          'La plataforma ofrece planes gratuitos y de pago (Free, Pro y Elite), tal como se describe en el sitio.',
          'El cobro puede procesarse mediante un proveedor de pagos externo. Las relaciones de consumo se rigen por el Código de Defensa del Consumidor (Ley n.º 8.078/1990), incluido el derecho de arrepentimiento cuando corresponda.',
        ]},
        { title: '5. Propiedad intelectual', body: [
          'Todo el contenido, la marca, el software y el código fuente de la plataforma son propiedad de END ART Studios y están protegidos por derechos de autor y la legislación aplicable.',
          'El usuario no puede copiar, modificar, distribuir, sublicenciar ni utilizar el software sin autorización previa por escrito, según el archivo LICENSE.',
        ]},
        { title: '6. Contenido y datos', body: [
          'Los datos históricos se muestran con base en fuentes verificadas. END ART Studios no garantiza la actualización continua de todos los datos, pero realiza esfuerzos de verificación.',
          'El usuario puede reportar imprecisiones para su revisión.',
        ]},
        { title: '7. Limitación de responsabilidad', body: [
          'La plataforma se proporciona "tal cual". END ART Studios no se hace responsable de daños indirectos derivados del uso, en la medida permitida por la ley.',
        ]},
        { title: '8. Suspensión y rescisión', body: [
          'El incumplimiento de estos Términos puede conllevar la suspensión o cancelación de la cuenta, sin perjuicio de otras medidas legales.',
        ]},
        { title: '9. Cambios', body: [
          'Estos Términos pueden actualizarse. Los cambios relevantes se comunicarán, y el uso continuado de la plataforma tras una actualización implica la aceptación de la nueva versión.',
        ]},
        { title: '10. Contacto y jurisdicción', body: [
          'Consultas sobre estos Términos: endart.studios@gmail.com. Juzgado competente: comarca de Osasco, São Paulo, salvo disposición legal en contrario.',
        ]},
      ],
    },
    privacy: {
      title: 'Política de Privacidad',
      intro:
        'Esta Política de Privacidad describe cómo END ART Studios (CNPJ 45.370.930/0001-75) recopila, utiliza, almacena y protege los datos personales de los usuarios de la plataforma Almanaque dos Clubes, de conformidad con la Ley General de Protección de Datos (Ley n.º 13.709/2018 — LGPD) y demás normas aplicables.',
      sections: [
        { title: '1. Datos recopilados', body: [
          'Datos de registro: nombre, correo y contraseña (almacenada de forma segura con hash).',
          'Datos de uso: información de navegación, dispositivos y registros de acceso, para seguridad y mejora del servicio.',
          'Datos de cobro: procesados por proveedores de pago externos; END ART Studios no almacena datos completos de tarjeta.',
        ]},
        { title: '2. Finalidades del tratamiento', body: [
          'Crear y gestionar la cuenta, autenticar al usuario y proteger el acceso.',
          'Prestar los servicios contratados, incluidos los planes de pago y las funciones de IA.',
          'Garantizar la seguridad de la plataforma y prevenir fraudes y actividades abusivas.',
          'Comunicar actualizaciones, cambios de términos e información relevante.',
        ]},
        { title: '3. Base legal', body: [
          'El tratamiento se basa en el consentimiento (art. 7.º, I, de la LGPD), la ejecución del contrato, el interés legítimo y el cumplimiento de obligaciones legales, según corresponda.',
        ]},
        { title: '4. Compartición', body: [
          'No vendemos datos personales. Los datos pueden compartirse con proveedores de infraestructura y pagos, estrictamente necesarios para la operación, y con las autoridades cuando la ley lo exija.',
        ]},
        { title: '5. Derechos del titular (LGPD)', body: [
          'El usuario puede solicitar confirmación, acceso, corrección, anonimización, portabilidad, eliminación y revocación del consentimiento.',
          'Para ejercer sus derechos, contacta con el canal de privacidad indicado abajo.',
        ]},
        { title: '6. Cookies', body: [
          'Utilizamos cookies y tecnologías similares para el funcionamiento, la autenticación y las preferencias (como el idioma). El usuario puede gestionar las cookies en su navegador.',
        ]},
        { title: '7. Seguridad', body: [
          'Adoptamos medidas técnicas y organizativas (cifrado de contraseña, control de acceso, monitorización) para proteger los datos. Ningún sistema es infalible; almacenamos las contraseñas con hash y nunca en texto claro.',
        ]},
        { title: '8. Conservación', body: [
          'Los datos se conservan durante el tiempo necesario para las finalidades y obligaciones legales, o hasta la eliminación a petición del titular o el cierre de la cuenta.',
        ]},
        { title: '9. Menores', body: [
          'La plataforma no está destinada a menores sin el consentimiento de sus responsables. No recopilamos intencionalmente datos de menores.',
        ]},
        { title: '10. Delegado de Protección de Datos (DPO) y contacto', body: [
          'Solicitudes de privacidad y ejercicio de derechos: endart.studios@gmail.com.',
          'END ART Studios es el responsable del tratamiento de los datos de la plataforma.',
        ]},
      ],
    },
  },
};

export default es;
