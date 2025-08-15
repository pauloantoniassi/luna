import {getConfig} from "../utils/getConfig";
import {appLogger} from "../utils/logger";

export function getPrompt(template: string, variables: Record<string, string> = {}): string {

  const completeVariables = {
    timestamp: new Date().toISOString(),
    bot_name: getConfig("BOT_NAME"),
    ...variables,
  }

  let processedPrompt = template;
  for (const [key, value] of Object.entries(completeVariables)) {
    const placeholder = `{{${key}}}`;
    processedPrompt = processedPrompt.replace(new RegExp(placeholder, "g"), value);
  }

  const missingPlaceholders = processedPrompt.match(/{{\s*[\w]+\s*}}/g);
  if (missingPlaceholders) {
    appLogger.warn(`Warning: The following placeholders were not replaced in the prompt template: ${missingPlaceholders.join(", ")}`);
  }


  return processedPrompt;
}
