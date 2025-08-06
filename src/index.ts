import Whatsapp from "./managers/Whatsapp";

async function main() {
  const whatsapp = new Whatsapp();
  await whatsapp.init();
}

main();
