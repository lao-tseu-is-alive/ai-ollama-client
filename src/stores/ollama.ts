// src/stores/ollama.ts
import { defineStore } from 'pinia';
import ollama from 'ollama';
import type { ModelResponse } from 'ollama';
import { getLog } from '@/config';
import {chunkText, cosineSim} from "@/stores/vectorHelpers.ts";

const log = getLog(`ollama.ts`, 4, 4);

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

const defaultSystemPrompt = 'You are a helpful assistant.';
const defaultKeepAlive = '1.5h';
const defaultNumCtx = 40960;
const defaultTemperature = 0.3;
export const useOllamaStore = defineStore('ollama', {
    state: () => ({
        models: [] as ModelResponse[],          // List of available models
        selectedModel: '' as string,   // Currently selected model
        userPrompt: '' as string,
        response: '' as string,
        isLoading: false,
        error: null as string | null,
        messages: [] as ChatMessage[], // that's our ephemeral memory
        ragEnabled: false,
        ragEmbeddingModel: 'nomic-embed-text', // choose one you have locally
        ragChunks: [] as string[],
        ragEmbeddings: [] as number[][],
        ragTopK: 4,
        maxContextChars: defaultNumCtx
    }),
    getters: {
       isReadyToStartChat():boolean {
           if (this.selectedModel.trim() == '') {
               this.error = 'Please select a model';
               return false;
           }
           const text = (this.userPrompt ?? '').trim();
           if (!text) {
               this.error = 'Please enter a prompt';
               return false;
           }

           this.isLoading = true;
           this.error = null;
           return true
       },
    },
    actions: {
        async fetchModels() {
            this.isLoading = true;
            this.error = null;
            try {
                const response = await ollama.list();
                this.models = response.models
                    .map((m: any) => m)
                    .filter((m: any) => (`${m.name}`.indexOf('embed') < 0 && !m.details.families?.includes('bert')))
                    .sort((a: any, b: any) => b.name.localeCompare(a.name))
                    .reverse();
                log.l(`ollama.list() returned ${this.models.length} models:`, this.models);
            } catch (error) {
                this.error = 'Failed to fetch models';
                console.error(error);
            } finally {
                this.isLoading = false;
            }
        },

        resetChat(systemPrompt?: string) {
            this.messages = [{ role: 'system', content: systemPrompt || defaultSystemPrompt }];
            this.response = '';
            ollama.abort();
        },

        async initChatLlm(modelName:string, systemPrompt?: string) {
            if (this.models.length < 1) {
              await this.fetchModels()
            }
            this.selectedModel = modelName
            this.messages = [{role: 'system', content: systemPrompt || defaultSystemPrompt}];
            this.response = '';
            const res = await ollama.chat({
                model: modelName,
                messages: this.messages,
                stream: false,
                keep_alive: defaultKeepAlive,
                options: {
                    num_ctx: defaultNumCtx,
                    temperature: defaultTemperature,
                },
            });
            this.messages.push(res.message as ChatMessage);
            log.l("initial res", res)
        },

        // Send one user turn with memory
        async sendChat() {
            if (this.isReadyToStartChat) {
                try {
                    // push user message into memory
                    this.messages.push({role: 'user', content: this.userPrompt});

                    // stream chat response
                    const stream = await ollama.chat({
                        model: this.selectedModel,
                        messages: this.messages,
                        stream: true,
                        keep_alive: defaultKeepAlive,
                        options: {
                            num_ctx: defaultNumCtx,
                            temperature: defaultTemperature,
                        },
                    });

                    let assistantAccum = '';
                    this.response = ''; // reset visible response
                    for await (const part of stream) {
                        const delta = part.message?.content ?? '';
                        assistantAccum += delta;
                        this.response += delta; // stream to UI
                    }

                    // push assistant message to memory
                    this.messages.push({role: 'assistant', content: assistantAccum});
                } catch (error) {
                    this.error = `Failed to generate response: ${error}`;
                    console.error(error);
                } finally {
                    this.isLoading = false;
                }
            } else {

            }
        },

        async embedTexts(texts: string[]): Promise<number[][]> {
            // Batch over Ollama embeddings
            // ollama-js embeddings API: ollama.embeddings({ model, prompt }) returns { embedding: number[] }
            const out: number[][] = [];
            for (const t of texts) {
                const res = await ollama.embeddings({ model: this.ragEmbeddingModel, prompt: t });
                out.push(res.embedding as unknown as number[]);
            }
            return out;
        },

        async buildRagIndexFromText(text: string) {
            this.isLoading = true; this.error = null;
            try {
                const chunks = chunkText(text);
                const embeddings = await this.embedTexts(chunks);
                this.ragChunks = chunks;
                this.ragEmbeddings = embeddings;
                this.ragEnabled = true;
                log.l(`RAG index built: ${chunks.length} chunks`);
            } catch (e) {
                this.error = `Failed to build RAG index: ${e}`;
                console.error(e);
            } finally {
                this.isLoading = false;
            }
        },

        async retrieveContext(query: string, k: number): Promise<string[]> {
            if (k <1) k = this.ragTopK;
            if (!this.ragEnabled || this.ragChunks.length === 0) return [];
            const qEmb = (await this.embedTexts([query]))[0];
            const scored = this.ragEmbeddings.map((emb, idx) => ({
                idx,
                score: cosineSim(qEmb, emb),
            }));
            scored.sort((a, b) => b.score - a.score);
            const top = scored.slice(0, k).map(s => this.ragChunks[s.idx]);
            log.l("topK : ", top)
            return top;
        },

        // Compose a system or user-primed context and call chat
        async sendChatWithRag() {
            if (this.isReadyToStartChat) {
                try {
                    let context = '';
                    if (this.ragEnabled) {
                        const topChunks = await this.retrieveContext(this.userPrompt, this.ragTopK);
                        // Join and clip to maxContextChars to keep token budget sane
                        context = topChunks.join('\n\n---\n\n').slice(0, this.maxContextChars);
                    }

                    // Inject context into a system message for best control
                    const systemBase = 'You are a helpful assistant.';
                    const systemWithContext = context
                        ? `${systemBase}\nUse ONLY the following context to answer. If the answer is not in the context, say you don’t know.\n\n[CONTEXT START]\n${context}\n[CONTEXT END]`
                        : systemBase;

                    // Ensure first system message is the contextual one
                    // Replace existing system message if present, else unshift
                    const msgs = [...this.messages];
                    const sysIdx = msgs.findIndex(m => m.role === 'system');
                    if (sysIdx >= 0) msgs[sysIdx] = {role: 'system', content: systemWithContext};
                    else msgs.unshift({role: 'system', content: systemWithContext});

                    msgs.push({role: 'user', content: this.userPrompt});

                    const stream = await ollama.chat({
                        model: this.selectedModel,
                        messages: msgs,
                        stream: true,
                        keep_alive: defaultKeepAlive,
                        options: {
                            num_ctx: defaultNumCtx,
                            temperature: defaultTemperature,
                        },
                    });

                    let assistantAccum = '';
                    this.response = '';
                    for await (const part of stream) {
                        const delta = part.message?.content ?? '';
                        assistantAccum += delta;
                        this.response += delta;
                    }

                    // Update memory with the final user + assistant
                    // Keep the simpler canonical system message in memory (avoid bloating with large context each turn)
                    if (sysIdx >= 0) this.messages[sysIdx] = {role: 'system', content: systemBase};
                    else this.messages.unshift({role: 'system', content: systemBase});
                    this.messages.push({role: 'user', content: this.userPrompt});
                    this.messages.push({role: 'assistant', content: assistantAccum});
                } catch (e) {
                    this.error = `Failed to chat with RAG: ${e}`;
                    console.error(e);
                } finally {
                    this.isLoading = false;
                }
            } else {
                // not ready
            }
        },
    },
});
