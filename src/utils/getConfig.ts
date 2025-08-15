export function getConfig(configKey: "BOT_NAME"){
  switch (configKey) {
    case "BOT_NAME":
      return process.env.BOT_NAME || "Luna";
  }
}
