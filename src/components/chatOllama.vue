<style scoped>
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
  color: #1a1a1a;
  background-color: #f9f9f9;
  border-radius: 10px;
}

.form-group {
  margin-bottom: 20px;
}

.container h2 {
  font-size: 1.2rem;
}

label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.select,
.textarea {
  width: 95%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 16px;
}

.button {
  background-color: #4caf50;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

.button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.loading {
  color: #888;
  font-style: italic;
  margin-bottom: 10px;
}

.error {
  color: red;
  margin-bottom: 10px;
}

.response {
  margin-top: 20px;
  padding: 10px;
  background-color: #f9f9f9;
  border-radius: 4px;
  text-align: unset;
}

.raw-response {
  background-color: #1a1a1a;
  color: #f9f9f9;
  padding: 10px;
  max-width: 90dvh;
  border-radius: 4px;
  margin-block-start: 1em;
  margin-block-end: 1em;
  margin-inline-start: 0;
  margin-inline-end: 0;
  unicode-bidi: isolate;
}
.raw-response pre {
  /* Reset <pre> defaults to match <p> */
  font-family: monospace;
  white-space: normal; /* Disable whitespace preservation */
  margin: 1em ; /* Match typical <p> margin */
  padding: 0; /* Remove any default padding */
}
</style>
<template>
  <div class="container">
    <div v-if="isLoading" class="loading">Streaming response...</div>
    <div v-if="error" class="error">{{ error }}</div>
    <!-- Model Selection -->
    <div class="form-group">
      <label for="model">Select Model:</label>
      <select id="model" v-model="selectedModel" class="select">
        <option value="" disabled>Select a model</option>
        <option v-for="model in models" :key="model.name" :value="model.name">
          {{ model.name }} - {{ formatBytes(model.size) }}, {{ model.details.families }}
        </option>
      </select>
    </div>

    <!-- Prompt Input -->
    <div class="form-group">
      <label for="prompt">Prompt:</label>
      <textarea
          id="prompt"
          v-model="prompt"
          rows="2"
          cols="60"
          class="textarea"
          placeholder="Enter your prompt here"
      ></textarea>
    </div>

    <!-- Generate Button -->
    <button @click="generate" :disabled="isLoading" class="button">
      {{ isLoading ? 'Streaming...' : 'Generate' }}
    </button>

    <!-- Response Display -->
    <div class="response">
      <h2>Response:</h2>
      <md-viewer :source="response"
                 :options="customOptions"
      />
    </div>
    <!-- Raw Response Button -->
    <div class="raw-response-button"><button @click="showRawResponse = !showRawResponse">Show Raw Response</button></div>
    <div v-if="showRawResponse" class="raw-response">
      <h2>Raw Response:</h2>
      <pre>{{ response }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import {ref, computed, onMounted, watch} from 'vue';
import {useOllamaStore} from '../stores/ollama';
import MdViewer from "@/components/mdViewer.vue";
// Access the Pinia store
const store = useOllamaStore();

import {getLog} from "@/config.ts";

const log = getLog(`chatOllama.vue`, 4, 4);

const showRawResponse = ref(false)

const props = defineProps<{ userPrompt: string }>()
// Optional custom markdown-it options
const customOptions = {
  breaks: true, // Convert newlines to <br>
  xhtmlOut: false, // Use XHTML-compliant output
};

// formatBytes converts a number of bytes into a human-readable format with appropriate units (B, KB, MB, GB, etc.):
function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// vue watch for userPrompt changes
watch(
    () => props.userPrompt,
    (newPrompt) => {
      prompt.value = newPrompt;
    }
)

// Reactive state bound to the store using computed properties
const models = computed(() => store.models);
const selectedModel = computed({
  get: () => store.selectedModel,
  set: (value) => (store.selectedModel = value),
});
const prompt = computed({
  get: () => store.prompt,
  set: (value) => (store.prompt = value),
});
const response = computed(() => store.response || "...");
const isLoading = computed(() => store.isLoading);
const error = computed(() => store.error);

// Method to trigger response generation
const generate = () => {
  store.generateResponse();
};

// Fetch models when the component mounts
onMounted(() => {
  log.t("mounted")
  store.fetchModels();
  prompt.value = props.userPrompt

});

</script>
