import { createApp } from 'vue';
import App from './components/Hero.vue';
import { createRouter, createWebHistory } from 'vue-router';
import CrtOverlay from './components/CrtOverlay.vue';
import TelemetryPanel from './components/TelemetryPanel.vue';
import GlitchText from './components/GlitchText.vue';

const routes = [
  { path: '/', component: App },
  { path: '/telemetry', component: TelemetryPanel },
  { path: '/glitch', component: GlitchText },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

const app = createApp(App);
app.use(router);
app.component('CrtOverlay', CrtOverlay);
app.component('TelemetryPanel', TelemetryPanel);
app.component('GlitchText', GlitchText);
app.mount('#app');