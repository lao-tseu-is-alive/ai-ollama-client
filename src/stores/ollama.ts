import { defineStore } from 'pinia';
import  ollama from 'ollama/browser'; // Import the Ollama JS library

export const useOllamaStore = defineStore('ollama', {
    state: () => ({
        models: [] as string[],           // List of available models
        selectedModel: null as string | null, // Currently selected model
        prompt: '',                      // User-entered prompt
        response: null as string | null, // Generated response
        isLoading: false,                // Loading state
        error: null as string | null,    // Error messages
    }),
    actions: {
        // Fetch available models from Ollama
        async fetchModels() {
            this.isLoading = true;
            try {
                const response = await ollama.list(); // Use 'list' from ollama-js
                this.models = response.models.map((model: any) => model.name);
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
            try {
                const response = await ollama.generate({
                    model: this.selectedModel,
                    prompt: this.prompt,
                });
                this.response = response.response; // Extract the response text
            } catch (error) {
                this.error = 'Failed to generate response';
                console.error(error);
            } finally {
                this.isLoading = false;
            }
        },
    },
});
