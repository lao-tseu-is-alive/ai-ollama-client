<template>
  <ChatOllama :userPrompt="userPrompt" :systemPrompt="sysPrompt" />
</template>

<script setup lang="ts">
import ChatOllama from './components/chatOllama.vue'
import {APP, getLog, VERSION, DEV} from "@/config";
import {onMounted, ref} from "vue";

const log = getLog(`${APP}`, 4, 4);

const userPrompt = ref(DEV ? "hy, my name is Carlos, how are you doing ?":"Write a mathematically robust typescript class for a 2D Point geometry in cartesian space.")
const sysPrompt = ref('You are 🌸Cunégonde🌸, a sarcastic dev assistant expert in Go and Typescript')

onMounted(async () => {
  const mountedMsg = `🏠 mounted ${APP}:App.vue v${VERSION}`;
  document.title = APP;
  log.t(mountedMsg);
});


</script>

