import { useClient } from "@/composables/useClient";
import { computed, ref } from "vue";

const useAddressInstance = () => {
  const client = useClient();
  const address = ref("");
  const setAddress = async () => {
    if (client.signer) {
      const [{ address: rawAddress }] = await client.signer.getAccounts();
      address.value = rawAddress;
    } else {
      address.value = "";
    }
  };
  client.on("signer-changed", () => {
    setAddress();
  });
  window.addEventListener("keplr_keystorechange", () => {
    setAddress();
  });

  setAddress();

  const shortAddress = computed<string>(
    () => address.value.substring(0, 10) + "..." + address.value.slice(-4)
  );

  return {
    address,
    shortAddress,
  };
};

let addressInstance: ReturnType<typeof useAddressInstance>;

export const useAddress = () => {
  if (!addressInstance) {
    addressInstance = useAddressInstance();
  }
  return addressInstance;
};

const useAddressInstanceGeneric = (client: any) => {
  const address = ref("");
  const setAddress = async () => {
    if (client.signer) {
      const [{ address: rawAddress }] = await client.signer.getAccounts();
      address.value = rawAddress;
    } else {
      address.value = "";
    }
  };
  client.on("signer-changed", () => {
    setAddress();
  });

  setAddress();

  const shortAddress = computed<string>(
    () => address.value.substring(0, 10) + "..." + address.value.slice(-4)
  );

  return {
    address,
    shortAddress,
  };
};

let addressInstanceGeneric: ReturnType<typeof useAddressInstanceGeneric>;
let connectedClient: any

export const useAddressGeneric = (client: any) => {
  if (!addressInstanceGeneric || connectedClient != client) {
    addressInstanceGeneric = useAddressInstanceGeneric(client);
  }
  return addressInstanceGeneric;
};
