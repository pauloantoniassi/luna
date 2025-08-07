import "dotenv/config";
import Whatsapp from "./managers/Whatsapp";
import rapy from "./rapy";

async function main() {
  const whatsapp = new Whatsapp();
  await rapy(whatsapp);
}

main();
