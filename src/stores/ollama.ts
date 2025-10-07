// src/stores/ollama.ts
import { defineStore } from 'pinia';
import ollama from 'ollama';
import type { ModelResponse } from 'ollama';
import { getLog } from '@/config';

const log = getLog(`ollama.ts`, 4, 4);

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

const defaultSystemPrompt = 'You are a helpful assistant.';
const defaultKeepAlive = '1.5h';
const defaultNumCtx = 4096;
const defaultTemperature = 0.5;
export const useOllamaStore = defineStore('ollama', {
    state: () => ({
        models: [] as ModelResponse[],          // List of available models
        selectedModel: null as string | null,   // Currently selected model
        userPrompt: '' as string,
        response: '' as string,
        isLoading: false,
        error: null as string | null,
        // memory
        messages: [] as ChatMessage[],
    }),
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
        async sendChat(userText?: string) {
            if (!this.selectedModel) {
                this.error = 'Please select a model';
                return;
            }
            const text = (userText ?? this.userPrompt ?? '').trim();
            if (!text) {
                this.error = 'Please enter a prompt';
                return;
            }

            this.isLoading = true;
            this.error = null;
            try {
                // push user message into memory
                this.messages.push({ role: 'user', content: text });

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
                this.messages.push({ role: 'assistant', content: assistantAccum });
            } catch (error) {
                this.error = `Failed to generate response: ${error}`;
                console.error(error);
            } finally {
                this.isLoading = false;
            }
        },
    },
});
