<style scoped>
.chat-layout {
  display: grid;
  grid-template-rows: auto 1fr auto;
  height: 100%;
  max-height: 100dvh;
  background: #f7f7f9;
}

.chat-transcript {
  overflow-y: auto;
  padding: 16px;
}

.chat-row {
  display: flex;
  margin-bottom: 10px;
}

.chat-row.user {
  justify-content: flex-end;
}

.chat-row.assistant {
  justify-content: flex-start;
}

.bubble {
  max-width: min(760px, 90%);
  padding: 10px 12px;
  border-radius: 12px;
  white-space: pre-wrap;
  word-break: break-word;
  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.04);
  border: 1px solid #e5e7eb;
  background: #fff;
}

.bubble.user {
  background: #e8f0ff;
  border-color: #d0e1ff;
}

.bubble.assistant {
  background: #0fc9e1;
}

.bubble-user-text {
  margin: 0;
  font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
  background: #e8f0ff;
}

.status-line {
  color: #6b7280;
  font-style: italic;
  padding: 6px 0;
}

.error-banner {
  color: #b91c1c;
  background: #fee2e2;
  border: 1px solid #fecaca;
  padding: 8px 10px;
  border-radius: 8px;
  margin: 8px 0;
}

.raw-panel {
  background: #0f172a;
  color: #e5e7eb;
  padding: 8px 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  border-top: 1px solid #1f2937;
  max-height: 25dvh;
  overflow: auto;
}

.raw-pre {
  margin: 0;
  white-space: pre-wrap;
}

.composer {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  align-items: end;
  padding: 12px 16px;
  background: #fff;
  border-top: 1px solid #e5e7eb;
}

.composer-input {
  width: 100%;
  resize: none;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
}

.btn {
  border: none;
  padding: 10px 14px;
  background: #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
}

.btn.primary {
  background: #2563eb;
  color: #fff;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>

<template>
  <article>
  <details>
    <summary>Model selection</summary>
    <fieldset class="grid">
      <select id="model" v-model="selectedModel" aria-label="Select your favorite model...">
        <option selected disabled value="">Select your favorite model</option>
        <option v-for="m in models" :key="m.name" :value="m.name">
          {{ m.name }} - {{ formatBytes(m.size) }}, {{ m.details.families }}
        </option>
      </select>
      <button @click="reset" :disabled="isLoading">New Chat</button>
      <button @click="toggleRaw">{{ showRawResponse ? 'Hide' : 'Show' }} Raw</button>
    </fieldset>
  </details>
  </article>
  <div class="chat-layout">
    <!-- Transcript -->
    <div class="chat-transcript" ref="transcriptRef">
      <div
          v-for="(msg, idx) in messages"
          :key="idx"
          class="chat-row"
          :class="msg.role"
      >
        <div class="bubble" :class="msg.role">
          <!-- Render markdown for assistant, plain for user -->
          <template v-if="msg.role === 'assistant'">
            <md-viewer :source="msg.content" :options="mdOptions"/>
          </template>
          <template v-if="msg.role != 'assistant'">
            <pre class="bubble-user-text">{{ msg.content }}</pre>
          </template>
        </div>
      </div>

      <div v-if="error" class="error-banner">{{ error }}</div>
      <div v-if="isLoading" class="status-line">Streaming response…</div>
    </div>

    <!-- Raw (optional) -->
    <div v-if="showRawResponse" class="raw-panel">
      <h4>Raw</h4>
      <pre class="raw-pre">{{ response }}</pre>
    </div>

    <!-- Composer -->
    <div class="composer">
      <textarea
          v-model="prompt"
          rows="2"
          class="composer-input"
          placeholder="Type your message..."
          @keydown.enter.exact.prevent="send"
      ></textarea>
      <button @click="send" :disabled="isLoading || !prompt.trim()">
        {{ isLoading ? 'Sending…' : 'Send' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import {computed, onMounted, watch, ref, nextTick} from 'vue';
import {useOllamaStore} from '@/stores/ollama';
import MdViewer from '@/components/mdViewer.vue';
import {getLog} from '@/config';

const log = getLog('chatOllama.vue', 4, 4);
const store = useOllamaStore();
const props = defineProps<{ userPrompt: string, systemPrompt: string }>()

const models = computed(() => store.models);
const selectedModel = computed({
  get: () => store.selectedModel,
  set: (v) => (store.selectedModel = v),
});
const prompt = computed({
  get: () => store.userPrompt,
  set: (v) => (store.userPrompt = v),
});
const response = computed(() => store.response || ''); // optional raw
const isLoading = computed(() => store.isLoading);
const error = computed(() => store.error);
const messages = computed(() => store.messages);

const mdOptions = {breaks: true, xhtmlOut: false};

const transcriptRef = ref<HTMLElement | null>(null);
const showRawResponse = ref(false);

function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 B';
  const k = 1024, dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

const send = async () => {
  if (!prompt.value.trim()) return;
  await store.sendChat(); // or sendChatWithRag() if you want
  // Auto-scroll to bottom after response streams in
  await nextTick();
  scrollToBottom();
};

const reset = () => store.resetChat();
const toggleRaw = () => (showRawResponse.value = !showRawResponse.value);

function scrollToBottom() {
  const el = transcriptRef.value;
  if (!el) return;
  el.scrollTop = el.scrollHeight;
}

onMounted(async () => {
  log.t("mounted")
  await store.fetchModels();
  await nextTick(scrollToBottom);
  prompt.value = props.userPrompt
});

// keep transcript pinned to bottom as messages update
watch(messages, () => nextTick(scrollToBottom), {deep: true});
</script>

