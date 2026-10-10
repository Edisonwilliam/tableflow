// Lightweight helpers (no three.js). Safe to import from anywhere.

const KINDS = [
  "fries",
  "spaghetti",
  "rice",
  "pizza",
  "burger",
  "drink",
  "salad",
  "chicken",
  "plate",
];

const MATCHERS = [
  [/pizza/, "pizza"],
  [/burger|sandwich|slider/, "burger"],
  [/fries|chips|potato/, "fries"],
  [/sph?ag|pasta|noodle|macaroni|linguine|penne/, "spaghetti"],
  [/\brice\b|jol+of|jello|pilau|risotto|biryani|ofada/, "rice"],
  [/salad|greens|veggie/, "salad"],
  [/chicken|wings|drumstick|thigh/, "chicken"],
];

const DRINK_RE =
  /drink|beverage|cocktail|mojito|juice|smoothie|soda|cola|zobo|water|tea|coffee|shake|chapman|wine|beer|lemonade|fanta|sprite/;

export const pickScene = (item) => {
  const type = (item?.animationType || "").toLowerCase().trim();
  if (KINDS.includes(type)) return type;

  const text = `${type} ${item?.name || ""}`.toLowerCase();
  for (const [re, kind] of MATCHERS) if (re.test(text)) return kind;

  const cat = (item?.category || "").toLowerCase();
  if (DRINK_RE.test(text) || /drink|beverage|cocktail/.test(cat)) return "drink";

  return "plate";
};

export const drinkColor = (name = "") => {
  const n = name.toLowerCase();
  if (/chapman|zobo|hibiscus|berry|strawberry|cranberry|watermelon/.test(n)) return "#c43a4a";
  if (/orange|fanta|mango|pineapple|passion/.test(n)) return "#f08a1c";
  if (/lemon|lime|sprite|mojito|mint|green|cucumber/.test(n)) return "#9fd356";
  if (/cola|coke|pepsi|coffee|tea|malt|stout/.test(n)) return "#3a1f12";
  if (/water/.test(n)) return "#bfe3ee";
  return "#d08a3a";
};

const THEMES = {
  fries:     { glow: "#f0aa3240", hint: "Fresh from the fryer" },
  spaghetti: { glow: "#c83c2838", hint: "Twirled to order" },
  pizza:     { glow: "#e0502a38", hint: "Fresh from the oven" },
  burger:    { glow: "#d9923a38", hint: "Stacked and grilled" },
  rice:      { glow: "#d9622a3a", hint: "Served steaming hot" },
  chicken:   { glow: "#d9773738", hint: "Grilled to order" },
  salad:     { glow: "#7fb05538", hint: "Tossed fresh" },
  drink:     { glow: "#d08a3a38", hint: "Served ice cold" },
  plate:     { glow: "#c8875538", hint: "Served with care" },
};

export const themeFor = (item) => {
  const kind = pickScene(item);
  const base = THEMES[kind] || THEMES.plate;
  return {
    kind,
    hint: base.hint,
    glow: kind === "drink" ? `${drinkColor(item?.name)}38` : base.glow,
  };
};