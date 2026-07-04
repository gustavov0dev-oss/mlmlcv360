export const mockUsers = [
  { id: '1', username: 'gustavo_admin', full_name: 'Gustavo Ortiz', email: 'admin@mlm360.pe', role: 'super_admin', status: 'active', rank: 'diamond', plan: 'elite', referral_code: 'GUST001', created_at: '2024-01-10' },
  { id: '2', username: 'inspector_demo', full_name: 'Carlos Inspector', email: 'inspector@mlm360.pe', role: 'inspector', status: 'active', rank: 'platinum', plan: 'pro', referral_code: 'INSP002', created_at: '2024-01-15' },
  { id: '3', username: 'usuario_demo', full_name: 'María González', email: 'usuario@mlm360.pe', role: 'user', status: 'active', rank: 'gold', plan: 'pro', referral_code: 'USER003', created_at: '2024-02-01' },
  { id: '4', username: 'juan_perez', full_name: 'Juan Pérez', email: 'juan@example.com', role: 'user', status: 'active', rank: 'silver', plan: 'inicio', referral_code: 'JUAN004', created_at: '2024-02-10' },
  { id: '5', username: 'ana_lopez', full_name: 'Ana López', email: 'ana@example.com', role: 'user', status: 'suspended', rank: 'bronze', plan: 'inicio', referral_code: 'ANA005', created_at: '2024-02-15' },
  { id: '6', username: 'pedro_garcia', full_name: 'Pedro García', email: 'pedro@example.com', role: 'user', status: 'active', rank: 'gold', plan: 'pro', referral_code: 'PEDR006', created_at: '2024-03-01' },
  { id: '7', username: 'lucia_torres', full_name: 'Lucía Torres', email: 'lucia@example.com', role: 'support', status: 'active', rank: 'silver', plan: 'pro', referral_code: 'LUCI007', created_at: '2024-03-05' },
  { id: '8', username: 'roberto_silva', full_name: 'Roberto Silva', email: 'roberto@example.com', role: 'user', status: 'active', rank: 'platinum', plan: 'elite', referral_code: 'ROBE008', created_at: '2024-03-10' },
  { id: '9', username: 'carmen_ruiz', full_name: 'Carmen Ruiz', email: 'carmen@example.com', role: 'user', status: 'pending', rank: 'bronze', plan: 'inicio', referral_code: 'CARM009', created_at: '2024-03-15' },
  { id: '10', username: 'miguel_flores', full_name: 'Miguel Flores', email: 'miguel@example.com', role: 'admin', status: 'active', rank: 'crown', plan: 'elite', referral_code: 'MIGU010', created_at: '2024-01-20' },
  ...Array.from({ length: 40 }, (_, i) => ({
    id: `${i + 11}`,
    username: `usuario_${i + 11}`,
    full_name: `Usuario Demo ${i + 11}`,
    email: `user${i + 11}@example.com`,
    role: 'user',
    status: i % 5 === 0 ? 'suspended' : 'active',
    rank: ['bronze', 'silver', 'gold', 'platinum'][i % 4],
    plan: ['inicio', 'pro', 'elite'][i % 3],
    referral_code: `USR${String(i + 11).padStart(3, '0')}`,
    created_at: `2024-0${(i % 9) + 1}-${String((i % 28) + 1).padStart(2, '0')}`,
  }))
];

export const revenueData = [
  { date: '1 Ene', ingresos: 3200, comisiones: 1100, afiliados: 8 },
  { date: '8 Ene', ingresos: 4100, comisiones: 1450, afiliados: 12 },
  { date: '15 Ene', ingresos: 3800, comisiones: 1300, afiliados: 10 },
  { date: '22 Ene', ingresos: 5200, comisiones: 1850, afiliados: 15 },
  { date: '29 Ene', ingresos: 4700, comisiones: 1650, afiliados: 13 },
  { date: '5 Feb', ingresos: 6100, comisiones: 2200, afiliados: 18 },
  { date: '12 Feb', ingresos: 5800, comisiones: 2050, afiliados: 16 },
  { date: '19 Feb', ingresos: 7200, comisiones: 2600, afiliados: 22 },
  { date: '26 Feb', ingresos: 6900, comisiones: 2450, afiliados: 20 },
  { date: '4 Mar', ingresos: 8400, comisiones: 3050, afiliados: 25 },
  { date: '11 Mar', ingresos: 7800, comisiones: 2800, afiliados: 23 },
  { date: '18 Mar', ingresos: 9200, comisiones: 3350, afiliados: 28 },
  { date: '25 Mar', ingresos: 8900, comisiones: 3200, afiliados: 26 },
  { date: '1 Abr', ingresos: 10500, comisiones: 3800, afiliados: 32 },
  { date: '8 Abr', ingresos: 11200, comisiones: 4100, afiliados: 35 },
  { date: '15 Abr', ingresos: 10800, comisiones: 3900, afiliados: 33 },
  { date: '22 Abr', ingresos: 12100, comisiones: 4400, afiliados: 38 },
  { date: '29 Abr', ingresos: 11800, comisiones: 4250, afiliados: 36 },
  { date: '6 May', ingresos: 13500, comisiones: 4900, afiliados: 42 },
  { date: '13 May', ingresos: 12800, comisiones: 4600, afiliados: 40 },
  { date: '20 May', ingresos: 14200, comisiones: 5150, afiliados: 45 },
  { date: '27 May', ingresos: 13900, comisiones: 5000, afiliados: 43 },
];

export const rankData = [
  { rank: 'Bronce', value: 45, fill: '#cd7f32' },
  { rank: 'Plata', value: 30, fill: '#c0c0c0' },
  { rank: 'Oro', value: 15, fill: '#ffd700' },
  { rank: 'Platino', value: 6, fill: '#e5e4e2' },
  { rank: 'Diamante', value: 3, fill: '#b9f2ff' },
  { rank: 'Corona', value: 1, fill: '#ffd700' },
];

export const networkData = [
  { subject: 'Ventas', A: 120, B: 110 },
  { subject: 'Afiliados', A: 98, B: 130 },
  { subject: 'Actividad', A: 86, B: 100 },
  { subject: 'Retención', A: 99, B: 85 },
  { subject: 'Volumen', A: 85, B: 90 },
  { subject: 'Comisiones', A: 65, B: 75 },
];

export const recentActivity = [
  { id: '1', action: 'Nueva afiliación', user: 'María González', type: 'Personal', amount: null, time: 'Hace 2 min' },
  { id: '2', action: 'Comisión binaria', user: 'Juan Pérez', type: 'Binaria', amount: 'S/ 120.50', time: 'Hace 15 min' },
  { id: '3', action: 'Bono por rango', user: 'Ana López', type: 'Rango', amount: 'S/ 300.00', time: 'Hace 1 hora' },
  { id: '4', action: 'Venta directa', user: 'Carlos Ramírez', type: 'Venta', amount: 'S/ 85.75', time: 'Hace 2 horas' },
  { id: '5', action: 'Upgrade de plan', user: 'Luis Mendoza', type: 'Plan', amount: 'S/ 450.00', time: 'Hace 3 horas' },
  { id: '6', action: 'Comisión unilevel', user: 'Rosa Díaz', type: 'Unilevel', amount: 'S/ 65.00', time: 'Hace 4 horas' },
];

export const notifications = [
  { id: '1', title: 'Nuevo afiliado registrado', message: 'María González se unió a tu red', type: 'success', time: 'Hace 2 min', read: false },
  { id: '2', title: 'Comisión acreditada', message: 'Se acreditó tu comisión de S/ 320.50', type: 'success', time: 'Hace 1 hora', read: false },
  { id: '3', title: 'Bono desbloqueado', message: 'Has desbloqueado el bono de liderazgo', type: 'info', time: 'Ayer', read: false },
  { id: '4', title: 'Mantenimiento programado', message: 'Sistema en mantenimiento el domingo a las 2am', type: 'warning', time: 'Hace 2 días', read: true },
  { id: '5', title: 'Nuevo rango disponible', message: 'Estás cerca de alcanzar el rango Platino', type: 'info', time: 'Hace 3 días', read: true },
];

export const mlmTreeData = {
  id: '1',
  name: 'Gustavo Ortiz',
  rank: 'diamond',
  plan: 'elite',
  volume: 12540,
  children: [
    {
      id: '2',
      name: 'María González',
      rank: 'gold',
      plan: 'pro',
      volume: 4250,
      position: 'left',
      children: [
        { id: '4', name: 'Juan Pérez', rank: 'silver', plan: 'inicio', volume: 1200, position: 'left', children: [] },
        { id: '5', name: 'Ana López', rank: 'bronze', plan: 'inicio', volume: 450, position: 'right', children: [] },
      ],
    },
    {
      id: '3',
      name: 'Carlos García',
      rank: 'platinum',
      plan: 'elite',
      volume: 6800,
      position: 'right',
      children: [
        { id: '6', name: 'Pedro Silva', rank: 'gold', plan: 'pro', volume: 2100, position: 'left', children: [
          { id: '8', name: 'Sofía Cruz', rank: 'silver', plan: 'pro', volume: 890, position: 'left', children: [] },
          { id: '9', name: 'Diego Ríos', rank: 'bronze', plan: 'inicio', volume: 320, position: 'right', children: [] },
        ]},
        { id: '7', name: 'Lucia Torres', rank: 'silver', plan: 'inicio', volume: 780, position: 'right', children: [] },
      ],
    },
  ],
};

export const plans = [
  {
    id: 'inicio',
    name: 'Inicio',
    price: 99,
    description: 'Perfecto para comenzar tu viaje en MLM 360',
    color: 'from-slate-500 to-slate-600',
    badge: null,
    features: [
      'Acceso básico al sistema',
      'Red de hasta 50 afiliados',
      'Comisiones directas 5%',
      'Panel de reportes básico',
      'Soporte por correo',
      'App móvil PWA',
    ],
    notIncluded: [
      'Bonos por rango',
      'Comisiones binarias',
      'Soporte prioritario',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 299,
    description: 'Para profesionales que buscan crecer rápidamente',
    color: 'from-blue-500 to-blue-700',
    badge: 'Más Popular',
    features: [
      'Todo lo del plan Inicio',
      'Red ilimitada de afiliados',
      'Comisiones directas 8%',
      'Comisiones binarias 4%',
      'Bonos por rango hasta Platino',
      'Panel de reportes avanzado',
      'Soporte prioritario 24/7',
      'Árbol genealógico interactivo',
    ],
    notIncluded: [
      'Bonos de liderazgo elite',
    ],
  },
  {
    id: 'elite',
    name: 'Elite',
    price: 799,
    description: 'El máximo nivel para líderes de alto impacto',
    color: 'from-amber-500 to-orange-600',
    badge: 'Premium',
    features: [
      'Todo lo del plan Pro',
      'Comisiones directas 12%',
      'Comisiones binarias 7%',
      'Todos los bonos y rangos',
      'Bono de liderazgo elite',
      'Acceso a eventos exclusivos',
      'Gerente de cuenta dedicado',
      'API de integración',
      'Reportes personalizados',
    ],
    notIncluded: [],
  },
];

export const testimonials = [
  {
    id: '1',
    name: 'Roberto Mendoza',
    role: 'Emprendedor, Lima',
    avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=100',
    content: 'MLM 360 transformó mi negocio. En solo 8 meses alcancé el rango Diamante y mis ingresos se multiplicaron por 5. El sistema es intuitivo y el soporte es excepcional.',
    rank: 'diamond',
    earnings: 'S/ 12,500/mes',
  },
  {
    id: '2',
    name: 'Patricia Vega',
    role: 'Ama de casa, Arequipa',
    avatar: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=100',
    content: 'Empecé sin experiencia en negocios y hoy tengo una red de más de 200 afiliados. La plataforma hace todo el trabajo de seguimiento automáticamente.',
    rank: 'gold',
    earnings: 'S/ 4,800/mes',
  },
  {
    id: '3',
    name: 'Miguel Torres',
    role: 'Vendedor, Cusco',
    avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=100',
    content: 'La mejor decisión que tomé fue unirme a MLM 360. El árbol genealógico en tiempo real me permite gestionar mi red desde cualquier lugar.',
    rank: 'platinum',
    earnings: 'S/ 8,200/mes',
  },
];

export const faqItems = [
  {
    question: '¿Qué es MLM 360 y cómo funciona?',
    answer: 'MLM 360 es un sistema de marketing multinivel empresarial que te permite construir una red de afiliados y ganar comisiones por sus ventas. Funciona en estructura binaria y unilevel, maximizando tus ingresos a través de múltiples fuentes.',
  },
  {
    question: '¿Cuánto puedo ganar con MLM 360?',
    answer: 'Tus ganancias dependen de tu esfuerzo y el tamaño de tu red. Los afiliados activos ganan en promedio entre S/ 1,500 y S/ 15,000 mensuales. Los rangos más altos como Diamante y Corona pueden superar los S/ 50,000 mensuales.',
  },
  {
    question: '¿Cómo se calculan las comisiones?',
    answer: 'Las comisiones se calculan automáticamente en base al plan que tengas activo. Incluyen comisiones directas (5-12%), comisiones binarias (4-7%), bonos por rango, y residuales por tu red de afiliados.',
  },
  {
    question: '¿Puedo cambiar de plan en cualquier momento?',
    answer: 'Sí, puedes hacer upgrade de tu plan en cualquier momento. El cambio aplica de forma inmediata y las nuevas comisiones se calculan desde el momento del upgrade.',
  },
  {
    question: '¿Cómo se realizan los pagos de comisiones?',
    answer: 'Los pagos se procesan quincenalmente (1 y 15 de cada mes) mediante transferencia bancaria a cualquier banco peruano, o através de billeteras digitales como Yape, Plin o BCP.',
  },
  {
    question: '¿Es seguro el sistema?',
    answer: 'Sí, MLM 360 utiliza tecnología de encriptación de nivel bancario, autenticación de dos factores, y todos los datos están protegidos según las normativas peruanas de protección de datos.',
  },
];
