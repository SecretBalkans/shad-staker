<template>
  <transition name="dropdown-fade">
    <div v-if="showDefault"
      class="top-20 right-8 shadow-std bg-white-1000 rounded absolute max-w-xs p-7 z-50 w-full box-border acc-dd">
      <span class="text-sm leading-normal text-gray-660 mb-3 block text-[13px]">Connected wallet</span>
      <div class="mb-3 flex items-center">
        <IgntProfileIcon :address="selectedAddress" />
        <div class="flex flex-col ml-3">
          <span class="text-[13px] font-bold">
            {{ accName }}
          </span>
          <span class="text-[13px] leading-normal text-gray-660 copy-address flex items-center" title="Copy address"
            @click="copy(selectedAddress)">
            {{ shortAddress }}
            <IgntCopyIcon class="ml-2 cursor-pointer hover:text-black" />
          </span>
        </div>
      </div>
      <div class="flex justify-between items-center cursor-pointer hover:text-gray-660" @click="$emit('disconnect')">
        <span> Disconnect wallet </span>
      </div>
      <hr class="divide-y my-3 -mx-7" />
      <div class="flex justify-between items-center cursor-pointer hover:text-gray-660" @click="switchToSettings">
        <span> Settings </span>
        <IgntChevronRightIcon class="text-sm" />
      </div>
      <hr class="divide-y my-3 -mx-7" />
      <a href="#" class="flex justify-between items-center mb-3 cursor-pointer hover:text-gray-660">
        <span> Support </span>
        <IgntExternalArrowIcon class="text-xs" />
      </a>
      <a href="#" class="flex justify-between items-center mb-3 cursor-pointer hover:text-gray-660">
        <span> Twitter </span>
        <IgntExternalArrowIcon class="text-xs" />
      </a>
      <a href="#" class="flex justify-between items-center mb-3 cursor-pointer hover:text-gray-660">
        <span> Telegram </span>
        <IgntExternalArrowIcon class="text-xs" />
      </a>
      <div style="text-align: center; margin-top: 2rem">
        <a href="#" class="text-sm leading-normal text-gray-660 terms-link mr-2 cursor-pointer">Privacy</a>•
        <a href="#" class="text-sm leading-normal text-gray-660 terms-link mr-2 ml-1 cursor-pointer">Terms of use</a>•
        <a href="#" class="text-sm leading-normal text-gray-660 terms-link ml-1 cursor-pointer">Cookies</a>
      </div>
    </div>
    <div v-else-if="showSettings"
      class="top-20 right-8 shadow-std bg-white-1000 rounded absolute max-w-xl p-7 z-50 w-full box-border acc-dd">
      <header class="flex items-center -mx-7 -mt-7 px-3 pt-3 pb-7">
        <div class="cursor-pointer" @click="switchToDefault">
          <svg width="22" height="20" viewBox="0 0 22 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20.5 10L1 10M1 10L9.53125 19M1 10L9.53125 1" stroke="black" stroke-width="2" stroke-linecap="round"
              stroke-linejoin="round" />
          </svg>
        </div>
        <div class="text-xl font-semibold text-center flex-1">Settings</div>
        <!-- tabs -->
      </header>
      <div>
        <IgntTabs :tabHeaderClasses="[
          'text-xl',
          'font-semibold',
          'p-0',
          'm-0',
          'mb-2.5',
          'flex-1',
        ]" :tabLinkClasses="['pr-4']" :inactiveLinkClasses="['text-gray-400']" :activeLinkClasses="['text-black']">
          <div class="" tabTitle="Secret">
            <div>
              Rpc url: <input v-model="secretRpc" class="border-2" type="text" />
            </div>
            <div>
              Api url: <input v-model="secretApi" class="border-2" type="text" />
            </div>
          </div>
          <div class="" tabTitle="Osmosis">
            <div>
              Rpc url: <input v-model="osmosisRpc" class="border-2" type="text" />
            </div>
            <div>
              Api url: <input v-model="osmosisApi" class="border-2" type="text" />
            </div>
          </div>
        </IgntTabs>
        <div>
          <button @click="saveToLocalStorage()" class="mt-3 rounded pr-2 pl-2 bg-red-200">Save settings</button>
          <button @click="reset()" class="ml-3 mt-3 rounded pr-2 pl-2 bg-gray-200">Reset</button>
        </div>
      </div>
      <!--
      <div class="flex justify-between items-center mb-3">
        <span> Chain </span>
        <span> {{ chainId }} </span>
      </div>
      <hr class="divide-y -mx-7 my-3" />

      <div class="flex justify-between items-center mb-3">
        <span> Cosmos SDK API </span>
        <span> {{ apiConnected ? "connected" : "disconnected" }} </span>
      </div>
      <hr class="divide-y -mx-7 my-3" />

      <div class="flex justify-between items-center mb-3">
        <span> Tendermint RPC </span>
        <span> {{ rpcConnected ? "connected" : "disconnected" }} </span>
      </div>
      <hr class="divide-y -mx-7 my-3" />

      <div class="flex justify-between items-center">
        <span> WebSocket </span>
        <span> {{ wsConnected ? "connected" : "disconnected" }} </span>
      </div>-->
    </div>
  </transition>
</template>

<script setup lang="ts">
// import useCosmosBaseTendermintV1Beta1 from "@/composables/useCosmosBaseTendermintV1Beta1";
import { useConnectionStatus } from "@/def-composables/useConnectionStatus";
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { useClipboard } from "@/def-composables/useClipboard";
import { IgntChevronRightIcon, IgntTabs } from "@ignt/vue-library";
import { IgntExternalArrowIcon } from "@ignt/vue-library";
import { IgntProfileIcon } from "@ignt/vue-library";
import { IgntCopyIcon } from "@ignt/vue-library";
import { useWalletStore } from "@/stores/useWalletStore";
import { envOsmosis, envSecret } from "@/env";
import useCosmosBaseTendermintV1Beta1 from "@/composables/useCosmosBaseTendermintV1Beta1";
import { useClient } from "@/composables/useClient";
import { SECRET_RPC_KEY, SECRET_API_KEY, OSMOSIS_RPC_KEY, OSMOSIS_API_KEY } from "@/env"
import { Client } from "example-client-ts";
import { setupAuthExtension } from "@cosmjs/stargate";

enum UI_STATE {
  "DEFAULT" = 1,

  "SETTINGS" = 2,
}

interface State {
  currentUIState: UI_STATE;
}

const initialState: State = {
  currentUIState: UI_STATE.DEFAULT,
};

defineProps({
  accName: {
    type: String,
    required: true,
  },
});
const emit = defineEmits(["disconnect", "close"]);

// composables
const walletStore = useWalletStore();
const selectedAddress = walletStore.secretAddress;
const shortAddress = walletStore.shortSecretAddress;
let { copy } = useClipboard();
// computed
// const query = useCosmosBaseTendermintV1Beta1(walletStore.secretClient);
// const nodeInfo = query.ServiceGetNodeInfo({});
// const chainId = computed(
//   () => nodeInfo.data?.value?.default_node_info?.network ?? ""
// );
let showDefault = computed<boolean>(
  () => state.currentUIState === UI_STATE.DEFAULT
);
let showSettings = computed<boolean>(
  () => state.currentUIState === UI_STATE.SETTINGS
);

// state
let state: State = reactive(initialState);

// methods
let clickOutsideHandler = (evt: MouseEvent) => {
  let dropdownEl = document.querySelector(".acc-dd");
  let dropdownButtonEl = document.querySelector(".acc-dd-btn");
  if (
    !dropdownEl?.contains(evt.target as Node) &&
    !dropdownButtonEl?.contains(evt.target as Node)
  ) {
    emit("close");
    state.currentUIState = UI_STATE.DEFAULT;
  }
};
let switchToSettings = () => {
  state.currentUIState = UI_STATE.SETTINGS;
};
let switchToDefault = () => {
  state.currentUIState = UI_STATE.DEFAULT;
};

// let secretClient = ref(walletStore.secretClient)
// let osmosisClient = ref(walletStore.osmoClient)

// const { apiConnected: secretApiConnected, rpcConnected: secretRpcConnected } = useConnectionStatus(secretClient)
// const { apiConnected: osmosisApiConnected, rpcConnected: osmosisRpcConnected } = useConnectionStatus(osmosisClient);
// const secretApiConnected = computed(() => useConnectionStatus(secretClient).apiConnected)
// const secretRpcConnected = computed(() => useConnectionStatus(secretClient).rpcConnected)
// const osmosisApiConnected = computed(() => useConnectionStatus(osmosisClient).apiConnected)
// const osmosisRpcConnected = computed(() => useConnectionStatus(osmosisClient).rpcConnected)

const apiCheck = async () => {
  // let newEnvSecret = envSecret
  // newEnvSecret.rpcURL = secretRpc
  // newEnvSecret.apiURL = secretApi

  // let newEnvOsmosis = envOsmosis
  // newEnvOsmosis.rpcURL = osmosisRpc
  // newEnvOsmosis.apiURL = osmosisApi

  const method = "GET"
  const headers = { "accept": "application/json" }
  const secretUrl = secretApi.value + "/cosmos/base/tendermint/v1beta1/node_info"
  const osmosisUrl = osmosisApi.value + "/cosmos/base/tendermint/v1beta1/node_info"

  const fetchSecretResult = await fetch(secretUrl, {
    method,
    headers,
  }).then((response) => {
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return true
  })
    .catch((error) => {
      console.error("Fetch error:", error);
      return false
    });

  const fetchOsmosisResult = await fetch(osmosisUrl, {
    method,
    headers,
  }).then((response) => {
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return true
  })
    .catch((error) => {
      console.error("Fetch error:", error);
      return false
    });

  return fetchSecretResult && fetchOsmosisResult
}
const rpcCheck = async () => {
  try {
    await fetch(secretRpc);
    await fetch(osmosisRpc)
    return true
  } catch (e) {
    console.error(e);
    return false
  };
}

const saveToLocalStorage = async () => {
  const isRpcGood = await rpcCheck()
  console.log("Checked rpc: ", isRpcGood)
  const isApiGood = await apiCheck()
  console.log("Checked api: ", isApiGood)

  if (isRpcGood && isApiGood) {
    console.log("Saving to the storage...")

    localStorage.setItem(SECRET_RPC_KEY, JSON.stringify(secretRpc));
    localStorage.setItem(SECRET_API_KEY, JSON.stringify(secretApi));
    localStorage.setItem(OSMOSIS_RPC_KEY, JSON.stringify(osmosisRpc));
    localStorage.setItem(OSMOSIS_API_KEY, JSON.stringify(osmosisApi));

    document.location.reload()
  } else {
    alert("Wrong rpc or api url")
  }
}
const reset = () => {
  localStorage.removeItem(SECRET_RPC_KEY)
  localStorage.removeItem(SECRET_API_KEY)
  localStorage.removeItem(OSMOSIS_RPC_KEY)
  localStorage.removeItem(OSMOSIS_API_KEY)

  document.location.reload()
}

let secretRpc = ref(envSecret.rpcURL)
let secretApi = ref(envSecret.apiURL)
let osmosisRpc = ref(envOsmosis.rpcURL)
let osmosisApi = ref(envOsmosis.apiURL)

// lh
onMounted(() => {
  document.addEventListener("click", clickOutsideHandler);
});
onBeforeUnmount(() => {
  document.removeEventListener("click", clickOutsideHandler);
});

</script>
