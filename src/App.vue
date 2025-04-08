<template>
  <HelloOllama msg="AI-Ollama Client" />
</template>

<script setup lang="ts">
import HelloOllama from './components/HelloOllama.vue'
import {APP, getLog, VERSION} from "@/config";
import {onMounted} from "vue";

const log = getLog(`${APP} v${VERSION}`, 4, 4);

onMounted(async () => {
  const mountedMsg = `🏠 mounted ${APP}:App.vue`;
  document.title = APP;
  log.t(mountedMsg);
});


</script>

