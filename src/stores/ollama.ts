import { defineStore } from 'pinia';
import  ollama from 'ollama'; // Import the Ollama JS library
import type { ModelResponse } from "ollama";
import {getLog} from "@/config.ts";

const log = getLog(`ollama.ts`, 4, 4);


export const useOllamaStore = defineStore('ollama', {
    state: () => ({
        models: [] as ModelResponse[],           // List of available models
        selectedModel: null as string | null, // Currently selected model
        prompt: null as string | null,                      // User-entered prompt
        response: null as string | null, // Generated response
        isLoading: false,                // Loading state
        error: null as string | null,    // Error messages
    }),
    actions: {
        // Fetch available models from Ollama
        async fetchModels() {
            this.isLoading = true;
            this.error = null;
            try {
                const response = await ollama.list(); // Use 'list' from ollama-js
                // filter models used for embeddings
                this.models = response.models
                    .map((model: any) => model)
                    .filter((model: any) => (`${model.name}`.indexOf("embed")<0 && !model.details.families.includes('bert')))
                    .sort((a: any, b: any) => b.name.localeCompare(a.name)).reverse();
                log.l(`ollama.list() returned ${this.models.length} models:`, this.models)
            } catch (error) {
                this.error = 'Failed to fetch models';
                console.error(error);
            } finally {
                this.isLoading = false;
            }
        },
        // Generate a response based on the selected model and prompt
        async generateResponse() {
            if (!this.selectedModel || !this.prompt) {
                this.error = 'Please select a model and enter a prompt';
                return;
            }
            this.isLoading = true;
            this.error = null;
            try {
                const modelOptions = await ollama.show({model: this.selectedModel})
                log.l(`ollama.show(${this.selectedModel}) returned:`,  modelOptions)
                // https://github.com/ollama/ollama-js?tab=readme-ov-file#generate
                // https://github.com/ollama/ollama/blob/main/docs/api.md#parameters
                const response = await ollama.generate({
                    model: this.selectedModel,
                    prompt: this.prompt,
                    stream: true,
                    keep_alive: "15m",  // how long the model will stay loaded in memory following the request default 5 minutes
                    //https://github.com/ollama/ollama/blob/main/docs/api.md#generate-request-with-options
                    //https://github.com/ollama/ollama/blob/main/docs/modelfile.md
                    options: {
                        num_ctx: 4096,
                        temperature: 0.5
                    }
                });
                this.response = "" // reset the previous answer if any and take care of original null value
                // Extract the response text
                for await (const part of response) {
                    this.response = this.response + part.response;
                }
            } catch (error) {
                this.error = `Failed to generate response error: ${error}`;
                console.error(error);
            } finally {
                this.isLoading = false;
            }
        },
    },
});
