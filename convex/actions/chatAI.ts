"use node";
import { action } from "../_generated/server";
export const processMessage = action({
  args: {},
  handler: async () => {
    return { response: "OK - chatAI funciona" };
  },
});
