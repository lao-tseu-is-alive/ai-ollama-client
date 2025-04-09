<template>
  <ChatOllama :userPrompt="prompt" />
</template>

<script setup lang="ts">
import ChatOllama from './components/chatOllama.vue'
import {APP, getLog, VERSION} from "@/config";
import {onMounted, ref} from "vue";

const log = getLog(`${APP}`, 4, 4);

const prompt = ref("Write a typescript class for a 2D Point geometry class. Output in markdown for github(GMF), with code sections in typescript.")


onMounted(async () => {
  const mountedMsg = `🏠 mounted ${APP}:App.vue v${VERSION}`;
  document.title = APP;
  log.t(mountedMsg);
});


</script>

