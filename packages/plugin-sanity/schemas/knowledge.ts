// /home/cave/projects/bots/venv/elizaOS_env/elizaOS/packages/plugin-sanity/schemas/knowledge.ts
export default {
    name: "knowledge",
    title: "Knowledge",
    type: "document",
    fields: [
      {
        name: "title",
        title: "Title",
        type: "string",
        validation: (Rule) => Rule.required(),
        description: "Descriptive title (e.g., 'General Info')",
      },
      {
        name: "path",
        title: "Path",
        type: "string",
        validation: (Rule) => Rule.required(),
        description: "File path (e.g., 'characters/knowledge/shared/general-info.txt')",
      },
      {
        name: "type",
        title: "File Type",
        type: "string",
        options: { list: ["pdf", "md", "txt"] },
        validation: (Rule) => Rule.required(),
        description: "Type of file",
      },
      {
        name: "shared",
        title: "Shared",
        type: "boolean",
        initialValue: false,
        description: "Whether this knowledge is shared across agents",
      },
    ],
  };