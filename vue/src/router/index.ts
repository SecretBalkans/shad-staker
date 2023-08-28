import { createRouter, createWebHistory } from "vue-router";

import DataView from "../views/DataView.vue";
import PortfolioView from "../views/PortfolioView.vue";
import SecretView from "../views/SecretView.vue"

const routerHistory = createWebHistory();
const routes = [
  { path: "/", component: PortfolioView },
  { path: "/data", component: DataView },
  { path: "/secret", component: SecretView },
];

const router = createRouter({
  history: routerHistory,
  routes,
});

export default router;
