import { createClient } from "@sanity/client";
import {
  Character,
  ModelProviderName,
  Plugin,
  elizaLogger,
  stringToUuid,
  type RAGKnowledgeItem,
  type UUID,
  type DirectoryItem,
} from "@elizaos/core";
import telegram from "@elizaos-plugins/client-telegram";
import solana from "@elizaos-plugins/plugin-solana";
import "dotenv/config";
import { join, resolve } from "path";

export const sanityClient = createClient({
  projectId: process.env.SANITY_PROJECT_ID || "xcfw1ftg",
  dataset: process.env.SANITY_DATASET || "production",
  apiVersion: process.env.SANITY_API_VERSION || "2023-05-03",
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

export interface SanityKnowledgeQuery {
  projectId?: string;
  dataset?: string;
  query?: string;
  agentId: UUID;
}

export async function loadSanityKnowledge(params: SanityKnowledgeQuery): Promise<RAGKnowledgeItem[]> {
  const { projectId, dataset, query, agentId } = params;
  try {
    const effectiveProjectId = projectId || process.env.SANITY_PROJECT_ID || "xyz789abc";
    const effectiveDataset = dataset || process.env.SANITY_DATASET || "production";
    const effectiveQuery = query || `*[_type == "knowledge" && agentId == "${agentId}"]`;

    const client = createClient({
      projectId: effectiveProjectId,
      dataset: effectiveDataset,
      apiVersion: process.env.SANITY_API_VERSION || "2023-05-03",
      useCdn: false,
      token: process.env.SANITY_API_TOKEN,
    });

    const knowledgeDocs = await client.fetch(effectiveQuery);
    if (knowledgeDocs.length === 0) {
      elizaLogger.warn(`No knowledge items found for agentId ${agentId}. Verify agentId matches character id.`);
    }

    const knowledgeItems: RAGKnowledgeItem[] = knowledgeDocs.map((doc: any) => {
      const text = doc.text || "";
      const metadata = doc.metadata || {};
      const id = doc.id || stringToUuid(`sanity-${doc._id}`);
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)) {
        elizaLogger.warn(`Invalid id "${id}" for knowledge document _id: ${doc._id}`);
      }
      return {
        id,
        agentId: doc.agentId || agentId,
        content: {
          text,
          metadata: {
            isMain: metadata.isMain || false,
            isChunk: metadata.isChunk || false,
            originalId: metadata.originalId || undefined,
            chunkIndex: metadata.chunkIndex || undefined,
            source: metadata.source || "sanity",
            type: metadata.type || "text",
            isShared: metadata.isShared || false,
            category: metadata.category || "",
            customFields: metadata.customFields || [],
          },
        },
        embedding: doc.embedding ? new Float32Array(doc.embedding) : undefined,
        createdAt: doc.createdAt ? new Date(doc.createdAt).getTime() : Date.now(),
      };
    });

    elizaLogger.info(`Loaded ${knowledgeItems.length} knowledge items for agent ${agentId} from Sanity`);
    return knowledgeItems;
  } catch (error) {
    elizaLogger.error(`Failed to load Sanity knowledge for agent ${agentId}:`, error);
    return [];
  }
}


export async function loadEnabledSanityCharacters(): Promise<Character[]> {
  const callId = stringToUuid(`sanity-load-${Date.now()}`);
  elizaLogger.debug(`[Sanity Load] Starting loadEnabledSanityCharacters, callId: ${callId}`);

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
      knowledge,
      templates { slackMessageHandlerTemplate, messageHandlerTemplate },
      profile
    }`;
    const sanityCharacters = await sanityClient.fetch(query);
   // Compute relative path
    // Compute and validate path
    const projectRoot = process.cwd();
    const knowledgeRoot = join(projectRoot, "characters", "knowledge");
    const relativePath = "degennn";
    const resolvedPath = resolve(knowledgeRoot, relativePath);

    elizaLogger.info(`[Sanity] Project root: ${projectRoot}`);
    elizaLogger.info(`[Sanity] Knowledge root: ${knowledgeRoot}`);
    elizaLogger.info(`[Sanity] Relative path: ${relativePath}`);
    elizaLogger.info(`[Sanity] Resolved path: ${resolvedPath}`);

   const hardcodedDirectoryItem = {
     directory: relativePath,
     shared: false,
   };

   const characters: Character[] = sanityCharacters.map((sanityChar: any) => {
    const mappedPlugins: Plugin[] = (sanityChar.plugins || [])
      .map((pluginName: string): Plugin | undefined => {
        switch (pluginName) {
          case "telegram":
            return {
              name: "telegram",
              description: "Telegram client plugin",
              clients: (telegram as any).clients || [],
            };
          case "solana":
            return {
              name: "solana",
              description: "Solana plugin",
              actions: (solana as any).actions || [],
            };
    
          default:
            elizaLogger.warn(`Unknown plugin: ${pluginName}`);
            return undefined;
        }
      })
      .filter((plugin): plugin is Plugin => plugin !== undefined);

      const characterId = stringToUuid(sanityChar.id || sanityChar.name);

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
        if (typeof k === "string") {
          return k;
        } else if (k.path) {
          return { path: k.path, shared: k.shared || false };
        }
        return k;
      });
        // Add the hardcoded DirectoryItem to knowledgeItems
        knowledgeItems.push(hardcodedDirectoryItem);

      const character: Character = {
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
          voice: sanityChar.settings?.voice
            ? { model: sanityChar.settings.voice.model }
            : undefined,
          ragKnowledge: sanityChar.settings?.ragKnowledge ?? true,
        },
        knowledge: knowledgeItems,
        templates: {
          slackMessageHandlerTemplate: sanityChar.templates?.slackMessageHandlerTemplate,
          messageHandlerTemplate: sanityChar.templates?.messageHandlerTemplate,
        },
      };
      return character;
    });

    elizaLogger.info(`[Sanity Load] Loaded ${characters.length} characters from Sanity`);
    return characters;
  } catch (error) {
    elizaLogger.error("[Sanity Load] Failed to fetch characters from Sanity:", error);
    return [];
  }
}

export default {
  name: "sanity",
  description: "Sanity plugin for fetching character data and knowledge",
  providers: [
    {
      name: "sanityCharacters",
      description: "Provides enabled characters from Sanity",
      handler: loadEnabledSanityCharacters,
    },
    {
      name: "sanityKnowledge",
      description: "Provides knowledge items from Sanity",
      handler: loadSanityKnowledge,
    },
  ],
};