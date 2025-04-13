import { createClient } from "@sanity/client";
import { Character, ModelProviderName, Plugin, elizaLogger, stringToUuid } from "@elizaos/core";
import telegram from "@elizaos-plugins/client-telegram";
import solana from "@elizaos-plugins/plugin-solana";
import "dotenv/config";

export const sanityClient = createClient({
  projectId: process.env.SANITY_PROJECT_ID || "xyz789abc",
  dataset: process.env.SANITY_DATASET || "production",
  apiVersion: process.env.SANITY_API_VERSION || "2023-05-03",
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

export async function loadEnabledSanityCharacters(): Promise<Character[]> {
  try {
    const query = `*[_type == "character" && enabled == true] {
      _id,
      id,
      name,
      username,
      system,
      modelProvider,
      plugins,
      bio,
      lore,
      messageExamples[] {
        conversation[] {
          user,
          content { text, action }
        }
      },
      postExamples,
      topics,
      adjectives,
      style { all, chat, post },
      settings {
        secrets { dynamic[] { key, value } },
        voice { model },
        ragKnowledge
      },
      knowledge[]->{_id, id, agentId, path, type, shared, createdAt, content, metadata},
      templates { slackMessageHandlerTemplate, messageHandlerTemplate },
      profile
    }`;
    const sanityCharacters = await sanityClient.fetch(query);
    console.log("Raw Sanity response:", JSON.stringify(sanityCharacters, null, 2));

    const characters: Character[] = sanityCharacters.map((sanityChar: any) => {
      const mappedPlugins: Plugin[] = (sanityChar.plugins || []).map((pluginName: string): Plugin | undefined => {
        switch (pluginName) {
          case "telegram":
            return { name: "telegram", description: "Telegram client plugin", clients: (telegram as any).clients || [] };
          case "solana":
            return { name: "solana", description: "Solana plugin", actions: (solana as any).actions || [] };
          case "slack":
            return { name: "slack", description: "Slack client plugin", clients: [] };
          default:
            elizaLogger.warn(`Unknown plugin: ${pluginName}`);
            return undefined;
        }
      }).filter((plugin): plugin is Plugin => plugin !== undefined);

      const characterId = stringToUuid(sanityChar.id);

      const secrets = (sanityChar.settings?.secrets?.dynamic || []).reduce(
        (acc: { [key: string]: string }, item: { key: string; value: string }) => {
          acc[item.key] = item.value;
          return acc;
        },
        {}
      );

      const validModelProviders = ["OPENAI", "OLLAMA", "CUSTOM"];
      const modelProvider = validModelProviders.includes(sanityChar.modelProvider)
        ? sanityChar.modelProvider.toLowerCase()
        : ModelProviderName.OPENAI;

      const knowledgeItems = (sanityChar.knowledge || []).map((k: any) => {
        let text = "";
        if (k.content && Array.isArray(k.content)) {
          text = k.content
            .map((block: any) => {
              if (block._type === "block" && block.children) {
                return block.children
                  .map((child: any) => child.text || "")
                  .join("");
              }
              return "";
            })
            .filter(Boolean)
            .join("\n");
        }
        return {
          id: k.id || stringToUuid(`${k.shared ? "SHARED" : "PRIVATE"}-${k.path}`),
          agentId: k.agentId || characterId,
          content: {
            text: text || "(no text extracted)",
            metadata: {
              source: k.path || k.metadata?.source || "",
              type: k.type || "",
              isShared: k.shared || false,
              category: k.metadata?.category || "",
            },
          },
          embedding: k.embedding || {},
          createdAt: k.createdAt || Date.now(),
        };
      });

      const character: Character = {
        // _id: sanityChar._id,
        id: characterId,
        name: sanityChar.name,
        username: sanityChar.username,
        system: sanityChar.system,
        modelProvider: modelProvider as ModelProviderName,
        plugins: mappedPlugins,
        bio: sanityChar.bio || [],
        lore: sanityChar.lore || [],
        messageExamples: (sanityChar.messageExamples || []).map((ex: any) =>
          ex.conversation.map((msg: any) => ({
            user: msg.user,
            content: { text: msg.content.text, action: msg.content.action },
          }))
        ),
        postExamples: sanityChar.postExamples || [],
        topics: sanityChar.topics || [],
        adjectives: sanityChar.adjectives || [],
        style: {
          all: sanityChar.style?.all || [],
          chat: sanityChar.style?.chat || [],
          post: sanityChar.style?.post || [],
        },
        settings: {
          secrets,
          voice: sanityChar.settings?.voice ? { model: sanityChar.settings.voice.model } : undefined,
          ragKnowledge: sanityChar.settings?.ragKnowledge,
        },
        knowledge: knowledgeItems,
        templates: {
          slackMessageHandlerTemplate: sanityChar.templates?.slackMessageHandlerTemplate,
          messageHandlerTemplate: sanityChar.templates?.messageHandlerTemplate,
        },
        // profile: sanityChar.profile,
      };
      return character;
    });

    return characters;
  } catch (error) {
    console.error("Error in loadEnabledSanityCharacters:", error);
    elizaLogger.error("Failed to fetch characters from Sanity:", error);
    return [];
  }
}

export default {
  name: "sanity",
  description: "Sanity plugin for fetching character data",
  providers: [
    {
      name: "sanityCharacters",
      description: "Provides enabled characters from Sanity",
      handler: loadEnabledSanityCharacters,
    },
  ],
};