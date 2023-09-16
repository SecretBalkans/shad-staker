import { Client } from "example-client-ts";
import type { Env } from "example-client-ts/env";

export const useClient = (env: Env) => new Client(env);
