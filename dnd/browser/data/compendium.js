export const DND_CATEGORIES = [
  { id: "classes", group: "players", label: "Clases", icon: "⚔" },
  { id: "species", group: "players", label: "Especies", icon: "◇" },
  { id: "backgrounds", group: "players", label: "Trasfondos", icon: "✦" },
  { id: "feats", group: "players", label: "Dotes", icon: "◆" },
  { id: "spells", group: "players", label: "Conjuros", icon: "✧" },
  { id: "items", group: "players", label: "Objetos", icon: "◈" },
  { id: "bestiary", group: "dm", label: "Bestiario", icon: "☉" },
  { id: "encounters", group: "dm", label: "Encuentros", icon: "◎" },
  { id: "rules", group: "dm", label: "Reglas", icon: "§" }
];

export const DND_COMPENDIUM = [
  {
    id: "fighter",
    category: "classes",
    name: "Guerrero",
    source: "SRD",
    tags: ["marcial", "armas", "defensa"],
    summary: "Clase marcial resistente, flexible y sencilla de adaptar a muchos estilos de combate.",
    details: [
      "Rol recomendado: primera linea, defensa o dano sostenido.",
      "Atributos clave: Fuerza o Destreza, Constitucion.",
      "Buen punto de partida para el futuro constructor porque concentra decisiones claras: estilo de combate, equipo y arquetipo."
    ]
  },
  {
    id: "wizard",
    category: "classes",
    name: "Mago",
    source: "SRD",
    tags: ["arcano", "preparacion", "control"],
    summary: "Lanzador de conjuros con gran capacidad de preparacion, utilidad y control tactico.",
    details: [
      "Rol recomendado: control, utilidad y dano puntual.",
      "Atributo clave: Inteligencia.",
      "Necesita un modelo de datos capaz de distinguir conjuros conocidos, preparados y disponibles por nivel."
    ]
  },
  {
    id: "human",
    category: "species",
    name: "Humano",
    source: "SRD",
    tags: ["versatil", "generalista"],
    summary: "Especie flexible, facil de encajar en cualquier arquetipo o campana.",
    details: [
      "Funciona bien como opcion neutral para probar flujos de creacion.",
      "En el constructor conviene representar rasgos como bloques independientes para poder reutilizarlos."
    ]
  },
  {
    id: "elf",
    category: "species",
    name: "Elfo",
    source: "SRD",
    tags: ["destreza", "percepcion", "ancestria"],
    summary: "Especie longeva con enfoque habitual en Destreza, percepcion y rasgos magicos o sensoriales.",
    details: [
      "Buena categoria para probar variantes o subespecies.",
      "Los rasgos deberian poder venir desde datos configurables, no desde logica hardcodeada."
    ]
  },
  {
    id: "acolyte",
    category: "backgrounds",
    name: "Acolito",
    source: "SRD",
    tags: ["religion", "historia", "contactos"],
    summary: "Trasfondo asociado a templos, ordenes religiosas y conocimiento espiritual.",
    details: [
      "Aporta competencias y una identidad narrativa clara.",
      "Es un buen ejemplo para separar beneficios mecanicos de descripcion narrativa."
    ]
  },
  {
    id: "alert",
    category: "feats",
    name: "Alerta",
    source: "SRD",
    tags: ["iniciativa", "percepcion", "defensa"],
    summary: "Dote orientada a reaccionar antes y evitar emboscadas.",
    details: [
      "En un constructor, las dotes pueden modelarse como modificadores aplicables a estadisticas derivadas.",
      "Conviene validar prerequisitos antes de permitir seleccionarla."
    ]
  },
  {
    id: "fireball",
    category: "spells",
    name: "Bola de fuego",
    source: "SRD",
    tags: ["nivel 3", "evocacion", "area"],
    summary: "Conjuro ofensivo de area, clasico para medir dano y escalado por nivel.",
    details: [
      "Nivel: 3.",
      "Escuela: Evocacion.",
      "Util para probar filtros por nivel, escuela, clase y tipo de tirada."
    ]
  },
  {
    id: "healing-potion",
    category: "items",
    name: "Pocion de curacion",
    source: "SRD",
    tags: ["consumible", "curacion"],
    summary: "Objeto consumible comun para recuperar puntos de golpe.",
    details: [
      "Categoria: consumible.",
      "El inventario del futuro manager deberia guardar cantidad, estado y notas por personaje."
    ]
  },
  {
    id: "goblin",
    category: "bestiary",
    name: "Goblin",
    source: "SRD",
    tags: ["criatura", "pequeno", "encuentro"],
    summary: "Enemigo basico util para encuentros de bajo nivel.",
    details: [
      "Sirve como dato inicial para probar busqueda y preparacion de encuentros.",
      "El panel de detalle puede crecer hacia bloques de estadisticas completos."
    ]
  },
  {
    id: "ambush",
    category: "encounters",
    name: "Emboscada en el camino",
    source: "Personal",
    tags: ["nivel bajo", "exploracion", "combate"],
    summary: "Plantilla de encuentro para iniciar una sesion con tension inmediata.",
    details: [
      "Estado autoritativo: el DM decide enemigos activos y condiciones del terreno.",
      "Estado local: cada jugador solo necesita iniciativa, recursos visibles y notas."
    ]
  },
  {
    id: "advantage",
    category: "rules",
    name: "Ventaja y desventaja",
    source: "SRD",
    tags: ["tiradas", "regla basica"],
    summary: "Regla central para resolver condiciones favorables o desfavorables en una tirada.",
    details: [
      "Un sistema de ayuda contextual podria enlazar esta regla desde acciones, estados o conjuros.",
      "Se modela mejor como referencia consultable, no como logica mezclada con UI."
    ]
  }
];
