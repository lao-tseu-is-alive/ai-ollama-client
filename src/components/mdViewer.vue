<style>
@import 'highlight.js/styles/github.css'; /* Example theme */
</style>

<template>
<div v-html="renderedMarkdown" class="markdown-content"></div>
</template>

<script setup lang="ts">
import MarkdownIt, {type Options} from "markdown-it";
import hljs from "highlight.js";
import {computed, onMounted} from "vue";
import {getLog} from "@/config.ts";

const log = getLog(`mdViewer.vue`, 3, 4);
const props = defineProps<{
  source: string,
  options?: Options,
}>()

// Initialize markdown-it with default options if none provided
const md = computed(() => {
  const defaultOptions: Options = {
    html: true, // Allow HTML in Markdown
    linkify: true, // Auto convert URLs to links
    typographer: true, // Enable smart typography
    highlight: function (str, lang) {
      log.l(`in highlight(${str}, ${lang})`)
    if (lang && hljs.getLanguage(lang)) {
      try {
        log.l("got the language:")
        return hljs.highlight(str, { language: lang }).value;
      } catch (error) {
        log.w(`hljs got error ${error}`, error)
      }
    }
    log.w(`missed the language:${lang}`, hljs.listLanguages())
    return ''; // use external default escaping
    }
  };
  return new MarkdownIt({ ...defaultOptions, ...(props.options || {}) });
});

// Compute the rendered HTML from the Markdown source
const renderedMarkdown = computed(() => {
  return md.value.render(props.source);
});

onMounted(() => {
  log.t("mounted")
  log.l("hljs.listLanguages():", hljs.listLanguages())

});
</script>
