// /home/cave/projects/bots/venv/elizaOS_env/elizaOS/packages/plugin-sanity/schemas/character.ts
export default {
  name: "character",
  title: "Character",
  type: "document",
  fields: [
    {
      name: "id",
      title: "ID",
      type: "string",
      validation: (Rule) =>
        Rule.required().custom(async (value, context) => {
          const client = context.getClient({ apiVersion: "2023-05-03" }); // Use Studio’s client
          const query = `*[_type == "character" && id == $id && _id != $currentId]{_id}`;
          const params = { id: value, currentId: context.document._id || "" };
          const result = await client.fetch(query, params);
          return result.length === 0 || "ID must be unique";
        }),
      description: "Unique identifier (e.g., 'eliza', 'kaleem'). Must be unique.",
    },
    {
      name: "name",
      title: "Name",
      type: "string",
      validation: (Rule) =>
        Rule.required().custom(async (value, context) => {
          const client = context.getClient({ apiVersion: "2023-05-03" });
          const query = `*[_type == "character" && name == $name && _id != $currentId]{_id}`;
          const params = { name: value, currentId: context.document._id || "" };
          const result = await client.fetch(query, params);
          return result.length === 0 || "Name must be unique";
        }),
      description: "Display name (e.g., 'Eliza'). Must be unique.",
    },
    {
      name: "username",
      title: "Username",
      type: "string",
      validation: (Rule) =>
        Rule.custom(async (value, context) => {
          if (!value) return true; // Optional field, skip if empty
          const client = context.getClient({ apiVersion: "2023-05-03" });
          const query = `*[_type == "character" && username == $username && _id != $currentId]{_id}`;
          const params = { username: value, currentId: context.document._id || "" };
          const result = await client.fetch(query, params);
          return result.length === 0 || "Username must be unique";
        }),
      description: "Optional username (e.g., 'eliza'). Must be unique if provided.",
    },
    {
      name: "system",
      title: "System Prompt",
      type: "text",
      description: "Prompt defining the character’s behavior",
    },
    {
      name: "bio",
      title: "Biography",
      type: "array",
      of: [{ type: "string" }],
      description: "List of bio statements",
    },
    {
      name: "lore",
      title: "Background Lore",
      type: "array",
      of: [{ type: "string" }],
      description: "List of backstory snippets",
    },
    {
      name: "messageExamples",
      title: "Message Examples",
      type: "array",
      of: [
        {
          type: "object",
          fields: [
            {
              name: "conversation",
              title: "Conversation",
              type: "array",
              of: [
                {
                  type: "object",
                  fields: [
                    { name: "user", title: "User", type: "string" },
                    {
                      name: "content",
                      title: "Content",
                      type: "object",
                      fields: [
                        { name: "text", title: "Text", type: "string" },
                        { name: "action", title: "Action", type: "string", options: { isOptional: true } },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      description: "Example dialogues as conversation arrays",
    },
    {
      name: "postExamples",
      title: "Post Examples",
      type: "array",
      of: [{ type: "string" }],
      description: "Sample posts",
    },
    {
      name: "topics",
      title: "Known Topics",
      type: "array",
      of: [{ type: "string" }],
      description: "Topics of expertise",
    },
    {
      name: "style",
      title: "Style",
      type: "object",
      fields: [
        {
          name: "all",
          title: "All Contexts",
          type: "array",
          of: [{ type: "string" }],
        },
        {
          name: "chat",
          title: "Chat",
          type: "array",
          of: [{ type: "string" }],
        },
        {
          name: "post",
          title: "Post",
          type: "array",
          of: [{ type: "string" }],
        },
      ],
      description: "Style guidelines for different contexts",
    },
    {
      name: "adjectives",
      title: "Character Traits",
      type: "array",
      of: [{ type: "string" }],
      description: "Traits describing the character",
    },
    {
      name: "modelProvider",
      title: "Model Provider",
      type: "string",
      options: { list: ["OPENAI", "OLLAMA", "CUSTOM"] },
      description: "AI model provider (optional, defaults to OPENAI)",
    },
    {
      name: "plugins",
      title: "Plugins",
      type: "array",
      of: [{ type: "string" }],
      description: "List of plugin identifiers (e.g., 'telegram', 'solana')",
    },
    {
      name: "settings",
      title: "Settings",
      type: "object",
      fields: [
        {
          name: "secrets",
          title: "Secrets",
          type: "object",
          fields: [
            {
              name: "dynamic",
              title: "Dynamic Secrets",
              type: "array",
              of: [
                {
                  type: "object",
                  fields: [
                    { name: "key", title: "Key", type: "string" },
                    { name: "value", title: "Value", type: "string" },
                  ],
                },
              ],
            },
          ],
        },
        {
          name: "voice",
          title: "Voice",
          type: "object",
          fields: [
            { name: "model", title: "Voice Model", type: "string" },
          ],
        },
        {
          name: "ragKnowledge",
          title: "Enable RAG Knowledge",
          type: "boolean",
          description: "Enable Retrieval-Augmented Generation knowledge processing",
          initialValue: false, // Default to false to match existing behavior
        },
      ],
      description: "Optional runtime settings",
    },
    
    {
      name: "knowledge",
      title: "Knowledge",
      type: "array",
      of: [{ type: "reference", to: [{ type: "knowledge" }] }],
      description: "References to knowledge documents (shared or agent-specific)",
    },
    {
      name: "enabled",
      title: "Enabled",
      type: "boolean",
      initialValue: true,
      description: "Whether this character should be loaded",
    },
  ],
};