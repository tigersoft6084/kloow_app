export const Tabs = {
  Applications: 1,
  Favorites: 2,
  Recents: 3,
  "Screaming Frog": 4,
};

export const SORT_ORDERS = ["none", "az", "za"];

export const PAGE_COPY = {
  [Tabs.Applications]: {
    title: "Application List",
    description: "Pre-loaded, ready-to-use marketing tools for faster campaigns.",
  },
  [Tabs.Favorites]: {
    title: "Favorites",
    description: "Your most-used applications for quick access.",
  },
  [Tabs.Recents]: {
    title: "Recently Used",
    description: "Applications you've launched recently.",
  },
  [Tabs["Screaming Frog"]]: {
    title: "Screaming Frog",
    description: "The Screaming Frog SEO Spider and Log File Analyser",
  },
};

export const BROWSER_MODAL_MESSAGES = {
  ZIP_NOT_FOUND: {
    line1: "We recommend downloading the browser update now",
    line2: "for best performance.",
  },
  EXTRACTION_FAILED: {
    line1: "The browser could not start.",
    line2: "Please download it again.",
  },
  HASH_MISMATCH: {
    line1: "The browser files are corrupted.",
    line2: "Please download again.",
  },
};

export const DEFAULT_BROWSER_MODAL_KEY = "ZIP_NOT_FOUND";

export const listItemButtonSx = {
  borderRadius: "8px",
  py: 0.1,
  px: 1,
  borderLeft: "4px solid transparent",
  "&.Mui-selected": {
    backgroundColor: "#252731",
    color: "white",
    borderLeft: "4px solid #1976d2",
  },
  "&.Mui-selected:hover": {
    backgroundColor: "#252731",
  },
  "&:hover": {
    backgroundColor: "#2C3145",
  },
  my: 0.25,
};

export const listItemTextSx = {
  "& .MuiTypography-root": {
    fontSize: 14,
    color: "white",
  },
};

export const listItemIconSx = { color: "white", minWidth: 32 };
