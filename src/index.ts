import getProjectRootDir from "./utils/getProjectRootDir";
import * as dotenv from "dotenv";

// When running in a Docker container, the environment variables are set in the Dockerfile
// If running locally, the environment variables are set in a .env file and must be loaded before importing any other modules
dotenv.config({ path: getProjectRootDir()+"/.env",  });

import Whatsapp from "./managers/Whatsapp";
import luna from "./luna";



async function main() {
  const whatsapp = new Whatsapp();
  await luna(whatsapp);
}

main();

// Exporting for testing purposes
export { default as generateResponse } from "./inteligence/generateResponse";
