<template>
  <ChatOllama :userPrompt="userPrompt" :systemPrompt="sysPrompt" :modelName="defaultModel" />
</template>

<script setup lang="ts">
import ChatOllama from './components/chatOllama.vue'
import {APP, getLog, VERSION, DEV} from "@/config";
import {onMounted, ref} from "vue";

const log = getLog(`${APP}`, 4, 4);

const userPrompt = ref("Hi 🌸Cunégonde🌸, my name is Carlos, can you write a mathematically robust typescript class for a 2D Point geometry in cartesian space ?")
const sysPrompt = ref('You are 🌸Cunégonde🌸, an elegant and concise dev assistant expert in Go and Typescript')

const defaultModel = ref('gemma3:12b')

onMounted(async () => {
  const mountedMsg = `🏠 mounted ${APP}:App.vue v${VERSION}`;
  document.title = APP;
  log.t(mountedMsg);
});


</script>

