export const POKEMON_TYPES = [
  'normal',
  'fire',
  'water',
  'electric',
  'grass',
  'ice',
  'fighting',
  'poison',
  'ground',
  'flying',
  'psychic',
  'bug',
  'rock',
  'ghost',
  'dragon',
  'dark',
  'steel',
  'fairy',
] as const;

export const SORT_KEYS = ['level', 'name', 'hp', 'attack', 'defense', 'speed'] as const;

export const STAT_NAMES = ['hp', 'attack', 'defense', 'speed'] as const;

export const MAX_PARTY_SIZE = 6;
export const MIN_LEVEL = 1;
export const MAX_LEVEL = 100;
export const STARTING_LEVEL = 5;
export const MAX_NICKNAME_LENGTH = 12;

export const MAX_SPECIES_ID = 1025;
export const API_TIMEOUT_MS = 5000;
export const PREFETCH_CONCURRENCY = 12;
export const POKEDEX_PAGE_SIZE = 40;

export const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'] as const;
export const SPINNER_INTERVAL_MS = 100;

export const STAT_SCALE_DIVISOR = 20;
export const EXP_PER_LEVEL = 20;
export const LEVEL_UP_STAT_GROWTH = 0.05;

export const MIN_WILD_LEVEL = 2;
export const WILD_LEVEL_SPREAD = 2;
export const DAMAGE_POWER = 100;

export const EXP_PER_WILD_LEVEL = 10;
export const EXP_WIN_BONUS = 10;

export const DAMAGE_VARIANCE_MIN = 0.85;
export const DAMAGE_VARIANCE_SPREAD = 0.15;

export const CATCH_HP_WEIGHT = 0.66;
export const CATCH_RATE_DIVISOR = 255;
export const CATCH_RATE_DIVISOR_MIN = 1;
export const CATCH_FACTOR = 3;
export const CATCH_CHANCE_MIN = 0.1;
export const CATCH_CHANCE_MAX = 0.95;

export const RUN_BASE_CHANCE = 0.5;
export const RUN_SPEED_DIVISOR = 100;
export const RUN_CHANCE_MIN = 0.25;
export const RUN_CHANCE_MAX = 0.9;

export const HP_BAR_WIDTH = 20;
export const HP_BAR_WARNING_RATIO = 0.5;
export const HP_BAR_DANGER_RATIO = 0.2;
export const HP_BAR_STATUS_PADDING = 4;
export const HP_BAR_STATUS_WIDTH = 9;
export const HP_BAR_BRACKET_WIDTH = 10;

export const TEXT_COLUMN_WIDTH = 4;
export const TEXT_COLUMN_PADDING = 2;
export const LIST_PREVIEW_LIMIT = 20;

export const ANIMATION_ENABLED = true;
export const ANIMATION_EVENT_DELAY_MS = 180;
export const ANIMATION_HP_TICK_MS = 60;
export const HP_DRAIN_STEPS = 4;

export const TYPE_COLORS = {
  normal: '#A8A77A',
  fire: '#EE8130',
  water: '#6390F0',
  electric: '#F7D02C',
  grass: '#7AC74C',
  ice: '#96D9D6',
  fighting: '#C22E28',
  poison: '#A33EA1',
  ground: '#E2BF65',
  flying: '#A98FF3',
  psychic: '#F95587',
  bug: '#A6B91A',
  rock: '#B6A136',
  ghost: '#735797',
  dragon: '#6F35FC',
  dark: '#705746',
  steel: '#B7B7CE',
  fairy: '#D685AD',
} as const satisfies Record<(typeof POKEMON_TYPES)[number], string>;

const CHART_IMMUNE = 0;
const CHART_NOT_VERY = 0.5;
const CHART_SUPER = 2;

const TYPE_CHART_ROWS = {
  normal: { rock: CHART_NOT_VERY, ghost: CHART_IMMUNE, steel: CHART_NOT_VERY },
  fire: {
    fire: CHART_NOT_VERY,
    water: CHART_NOT_VERY,
    grass: CHART_SUPER,
    ice: CHART_SUPER,
    bug: CHART_SUPER,
    rock: CHART_NOT_VERY,
    dragon: CHART_NOT_VERY,
    steel: CHART_SUPER,
  },
  water: {
    fire: CHART_SUPER,
    water: CHART_NOT_VERY,
    grass: CHART_NOT_VERY,
    ground: CHART_SUPER,
    rock: CHART_SUPER,
    dragon: CHART_NOT_VERY,
  },
  electric: {
    water: CHART_SUPER,
    electric: CHART_NOT_VERY,
    grass: CHART_NOT_VERY,
    ground: CHART_IMMUNE,
    flying: CHART_SUPER,
    dragon: CHART_NOT_VERY,
  },
  grass: {
    fire: CHART_NOT_VERY,
    water: CHART_SUPER,
    grass: CHART_NOT_VERY,
    poison: CHART_NOT_VERY,
    ground: CHART_SUPER,
    flying: CHART_NOT_VERY,
    bug: CHART_NOT_VERY,
    rock: CHART_SUPER,
    dragon: CHART_NOT_VERY,
    steel: CHART_NOT_VERY,
  },
  ice: {
    fire: CHART_NOT_VERY,
    water: CHART_NOT_VERY,
    grass: CHART_SUPER,
    ice: CHART_NOT_VERY,
    ground: CHART_SUPER,
    flying: CHART_SUPER,
    dragon: CHART_SUPER,
    steel: CHART_NOT_VERY,
  },
  fighting: {
    normal: CHART_SUPER,
    ice: CHART_SUPER,
    poison: CHART_NOT_VERY,
    flying: CHART_NOT_VERY,
    psychic: CHART_NOT_VERY,
    bug: CHART_NOT_VERY,
    rock: CHART_SUPER,
    ghost: CHART_IMMUNE,
    dark: CHART_SUPER,
    steel: CHART_SUPER,
    fairy: CHART_NOT_VERY,
  },
  poison: {
    grass: CHART_SUPER,
    poison: CHART_NOT_VERY,
    ground: CHART_NOT_VERY,
    rock: CHART_NOT_VERY,
    ghost: CHART_NOT_VERY,
    steel: CHART_IMMUNE,
    fairy: CHART_SUPER,
  },
  ground: {
    fire: CHART_SUPER,
    electric: CHART_SUPER,
    grass: CHART_NOT_VERY,
    poison: CHART_SUPER,
    flying: CHART_IMMUNE,
    bug: CHART_NOT_VERY,
    rock: CHART_SUPER,
    steel: CHART_SUPER,
  },
  flying: {
    electric: CHART_NOT_VERY,
    grass: CHART_SUPER,
    fighting: CHART_SUPER,
    bug: CHART_SUPER,
    rock: CHART_NOT_VERY,
    steel: CHART_NOT_VERY,
  },
  psychic: {
    fighting: CHART_SUPER,
    poison: CHART_SUPER,
    psychic: CHART_NOT_VERY,
    dark: CHART_IMMUNE,
    steel: CHART_NOT_VERY,
  },
  bug: {
    fire: CHART_NOT_VERY,
    grass: CHART_SUPER,
    fighting: CHART_NOT_VERY,
    poison: CHART_NOT_VERY,
    flying: CHART_NOT_VERY,
    psychic: CHART_SUPER,
    ghost: CHART_NOT_VERY,
    dark: CHART_SUPER,
    steel: CHART_NOT_VERY,
    fairy: CHART_NOT_VERY,
  },
  rock: {
    fire: CHART_SUPER,
    ice: CHART_SUPER,
    fighting: CHART_NOT_VERY,
    ground: CHART_NOT_VERY,
    flying: CHART_SUPER,
    bug: CHART_SUPER,
    steel: CHART_NOT_VERY,
  },
  ghost: { normal: CHART_IMMUNE, psychic: CHART_SUPER, ghost: CHART_SUPER, dark: CHART_NOT_VERY },
  dragon: { dragon: CHART_SUPER, steel: CHART_NOT_VERY, fairy: CHART_IMMUNE },
  dark: {
    fighting: CHART_NOT_VERY,
    psychic: CHART_SUPER,
    ghost: CHART_SUPER,
    dark: CHART_NOT_VERY,
    fairy: CHART_NOT_VERY,
  },
  steel: {
    fire: CHART_NOT_VERY,
    water: CHART_NOT_VERY,
    electric: CHART_NOT_VERY,
    ice: CHART_SUPER,
    rock: CHART_SUPER,
    steel: CHART_NOT_VERY,
    fairy: CHART_SUPER,
  },
  fairy: {
    fire: CHART_NOT_VERY,
    fighting: CHART_SUPER,
    poison: CHART_NOT_VERY,
    dragon: CHART_SUPER,
    dark: CHART_SUPER,
    steel: CHART_NOT_VERY,
  },
} as const satisfies Record<
  (typeof POKEMON_TYPES)[number],
  Partial<Record<(typeof POKEMON_TYPES)[number], number>>
>;

type PokemonTypeName = (typeof POKEMON_TYPES)[number];

export const TYPE_CHART: Record<
  PokemonTypeName,
  Partial<Record<PokemonTypeName, number>>
> = TYPE_CHART_ROWS;

export const TYPE_EFFECTIVE_LABELS = {
  immune: 'tidak berpengaruh',
  weak: 'kurang efektif',
  neutral: 'normal',
  strong: 'sangat efektif',
} as const;

export const TYPE_EFFECTIVE_SYMBOLS = {
  immune: '×0',
  weak: '×½',
  neutral: '',
  strong: '×2',
} as const;

export const STARTER_SPECIES_IDS = [1, 4, 7] as const;
