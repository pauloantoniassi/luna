import "dotenv/config";
import Whatsapp from "./managers/Whatsapp";
import luna from "./luna";

async function main() {
  const whatsapp = new Whatsapp();
  await luna(whatsapp);
}

main();
