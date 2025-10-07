<template>
  <ChatOllama :userPrompt="prompt" />
</template>

<script setup lang="ts">
import ChatOllama from './components/chatOllama.vue'
import {APP, getLog, VERSION} from "@/config";
import {onMounted, ref} from "vue";

const log = getLog(`${APP}`, 4, 4);

const prompt = ref("Write a mathematically robust typescript class for a 2D Point geometry in cartesian space.")


onMounted(async () => {
  const mountedMsg = `🏠 mounted ${APP}:App.vue v${VERSION}`;
  document.title = APP;
  log.t(mountedMsg);
});


</script>

