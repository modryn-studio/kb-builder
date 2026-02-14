export interface MockSection {
  id: string;
  title: string;
  content: string;
}

export interface MockChapter {
  id: string;
  title: string;
  sections: MockSection[];
}

export interface MockManual {
  id: string;
  name: string;
  tagline: string;
  description: string;
  color: string;
  initial: string;
  sections: number;
  sources: number;
  lastGenerated: string;
  readTime: string;
  topics: string[];
  chapters: MockChapter[];
}

export const MANUALS: MockManual[] = [
  {
    id: "figma",
    name: "Figma",
    tagline: "Interface Design & Prototyping",
    description:
      "Complete guide to interface design, prototyping, and collaboration in Figma.",
    color: "hsl(262 52% 47%)",
    initial: "Fg",
    sections: 24,
    sources: 156,
    lastGenerated: "Jan 14, 2025",
    readTime: "45 min",
    topics: [
      "Auto Layout",
      "Components",
      "Variables",
      "Dev Mode",
      "Prototyping",
    ],
    chapters: [],
  },
  {
    id: "vscode",
    name: "VS Code",
    tagline: "Code Editing & Development",
    description:
      "Deep dive into Visual Studio Code: extensions, debugging, keybindings, and workspace optimization.",
    color: "hsl(210 68% 45%)",
    initial: "VS",
    sections: 32,
    sources: 203,
    lastGenerated: "Jan 12, 2025",
    readTime: "55 min",
    topics: [
      "Extensions",
      "Debugging",
      "Git Integration",
      "Remote Dev",
      "Keybindings",
    ],
    chapters: [],
  },
  {
    id: "notion",
    name: "Notion",
    tagline: "Workspace & Knowledge Management",
    description:
      "Master Notion databases, templates, formulas, and workspace architecture for teams.",
    color: "hsl(0 0% 40%)",
    initial: "No",
    sections: 20,
    sources: 134,
    lastGenerated: "Jan 11, 2025",
    readTime: "38 min",
    topics: ["Databases", "Templates", "Formulas", "API", "Team Wikis"],
    chapters: [],
  },
  {
    id: "slack",
    name: "Slack",
    tagline: "Team Communication",
    description:
      "Advanced Slack workflows, automations, integrations, and channel management strategies.",
    color: "hsl(326 60% 45%)",
    initial: "Sl",
    sections: 18,
    sources: 98,
    lastGenerated: "Jan 10, 2025",
    readTime: "30 min",
    topics: [
      "Workflows",
      "Automations",
      "Integrations",
      "Channel Strategy",
      "Huddles",
    ],
    chapters: [],
  },
  {
    id: "linear",
    name: "Linear",
    tagline: "Issue Tracking & Project Management",
    description:
      "Streamline development workflows with Linear's keyboard-first project management.",
    color: "hsl(250 60% 55%)",
    initial: "Li",
    sections: 16,
    sources: 87,
    lastGenerated: "Jan 9, 2025",
    readTime: "28 min",
    topics: ["Cycles", "Projects", "Triage", "Integrations", "Views"],
    chapters: [],
  },
  {
    id: "arc",
    name: "Arc Browser",
    tagline: "Web Browsing Reimagined",
    description:
      "Master Arc's Spaces, Boosts, keyboard shortcuts, and productivity features.",
    color: "hsl(200 65% 48%)",
    initial: "Ar",
    sections: 14,
    sources: 72,
    lastGenerated: "Jan 8, 2025",
    readTime: "22 min",
    topics: ["Spaces", "Boosts", "Split View", "Command Bar", "Little Arc"],
    chapters: [],
  },
  {
    id: "obsidian",
    name: "Obsidian",
    tagline: "Personal Knowledge Management",
    description:
      "Build a second brain with Obsidian's linking, plugins, and knowledge graph.",
    color: "hsl(270 45% 50%)",
    initial: "Ob",
    sections: 22,
    sources: 145,
    lastGenerated: "Jan 7, 2025",
    readTime: "40 min",
    topics: ["Linking", "Graph View", "Plugins", "Templates", "Dataview"],
    chapters: [],
  },
  {
    id: "cursor",
    name: "Cursor",
    tagline: "AI-First Code Editor",
    description:
      "Leverage Cursor's AI capabilities for code generation, refactoring, and codebase understanding.",
    color: "hsl(160 50% 42%)",
    initial: "Cu",
    sections: 18,
    sources: 112,
    lastGenerated: "Jan 13, 2025",
    readTime: "32 min",
    topics: [
      "AI Chat",
      "Codebase Context",
      "Composer",
      "Rules",
      "Tab Completion",
    ],
    chapters: [],
  },
];

export function getManualById(id: string): MockManual | undefined {
  return MANUALS.find((m) => m.id === id);
}
