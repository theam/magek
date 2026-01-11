import { DefaultTheme } from "typedoc";

/**
 * Custom theme for Magek documentation that reorganizes the navigation structure:
 * 1. Promotes documents to root level (removes Documents/Documentation wrapper)
 * 2. Groups documents by topic (Getting Started, Architecture, etc.)
 * 3. Wraps API documentation under "Code Documentation" group
 */
export class MagekTheme extends DefaultTheme {
  buildNavigation(project) {
    const nav = super.buildNavigation(project);
    return reorganizeNavigation(nav);
  }
}

/**
 * Document grouping configuration
 * Each group defines which documents belong to it based on their titles
 */
const documentGroups = {
  "Getting Started": ["Installation", "Coding Tutorial"],
  Architecture: [
    "Event-Driven Architecture",
    "Commands",
    "Events",
    "Event Handlers",
    "Entities",
    "Read Models",
    "Notifications",
    "Queries",
  ],
  Features: ["Event Stream API", "Scheduled Actions", "Logging", "Error Handling"],
  Security: ["Security Overview", "Authentication", "Authorization"],
  "Advanced Topics": {
    // Direct children
    items: [
      "Custom Templates",
      "Data Migrations",
      "Environment Configuration",
      "Framework Packages",
      "Instrumentation",
      "Register",
      "Sensors",
      "Testing",
      "Touch Entities",
    ],
    // Nested sub-groups
    subgroups: {
      Health: ["Sensor Health"],
    },
  },
};

// Documents that should appear at root level (not grouped)
const rootDocuments = ["Introduction", "GraphQL API", "Magek CLI", "Contributing"];

// API item types that should be wrapped under "Code Documentation"
const apiGroups = [
  "Classes",
  "Interfaces",
  "Type Aliases",
  "Functions",
  "Variables",
  "Enumerations",
  "Namespaces",
];

/**
 * Reorganizes the navigation tree to achieve the desired structure
 */
function reorganizeNavigation(nav) {
  // Extract documents from Documents > Documentation
  const docsContainer = nav.find((item) => item.text === "Documents");
  const documentation = docsContainer?.children?.find((item) => item.text === "Documentation");
  const allDocs = documentation?.children || [];

  // Create a map for quick document lookup
  const docMap = new Map();
  allDocs.forEach((doc) => docMap.set(doc.text, doc));

  // Build the new navigation structure
  const result = [];

  // Add Introduction first (at root level)
  if (docMap.has("Introduction")) {
    result.push(docMap.get("Introduction"));
    docMap.delete("Introduction");
  }

  // Add grouped documents
  for (const [groupName, groupConfig] of Object.entries(documentGroups)) {
    if (groupName === "Advanced Topics") {
      // Handle Advanced Topics with sub-groups
      const advancedGroup = buildAdvancedTopicsGroup(groupConfig, docMap);
      if (advancedGroup.children?.length) {
        result.push(advancedGroup);
      }
    } else {
      // Handle simple groups
      const group = buildSimpleGroup(groupName, groupConfig, docMap);
      if (group.children?.length) {
        result.push(group);
      }
    }
  }

  // Add remaining root-level documents (GraphQL API, Magek CLI, FAQ, Contributing)
  for (const docName of rootDocuments) {
    if (docName !== "Introduction" && docMap.has(docName)) {
      result.push(docMap.get(docName));
      docMap.delete(docName);
    }
  }

  // Add any remaining ungrouped documents
  for (const [, doc] of docMap) {
    result.push(doc);
  }

  // Wrap API items under "Code Documentation"
  const codeDocChildren = [];
  for (const apiGroup of apiGroups) {
    const apiItem = nav.find((item) => item.text === apiGroup);
    if (apiItem) {
      codeDocChildren.push(apiItem);
    }
  }

  if (codeDocChildren.length > 0) {
    result.push({
      text: "Code Documentation",
      children: codeDocChildren,
    });
  }

  return result;
}

/**
 * Builds a simple document group
 */
function buildSimpleGroup(groupName, docNames, docMap) {
  const children = [];

  for (const docName of docNames) {
    if (docMap.has(docName)) {
      children.push(docMap.get(docName));
      docMap.delete(docName);
    }
  }

  return {
    text: groupName,
    children,
  };
}

/**
 * Builds the Advanced Topics group with nested sub-groups
 */
function buildAdvancedTopicsGroup(config, docMap) {
  const children = [];

  // Add direct children
  for (const docName of config.items) {
    if (docMap.has(docName)) {
      children.push(docMap.get(docName));
      docMap.delete(docName);
    }
  }

  // Add sub-groups
  for (const [subgroupName, subgroupDocs] of Object.entries(config.subgroups)) {
    const subgroupChildren = [];
    for (const docName of subgroupDocs) {
      if (docMap.has(docName)) {
        subgroupChildren.push(docMap.get(docName));
        docMap.delete(docName);
      }
    }

    if (subgroupChildren.length > 0) {
      children.push({
        text: subgroupName,
        children: subgroupChildren,
      });
    }
  }

  return {
    text: "Advanced Topics",
    children,
  };
}

/**
 * TypeDoc plugin load function - registers the custom theme
 */
export function load(app) {
  app.renderer.defineTheme("magek", MagekTheme);
}
