import Whatsapp from "./managers/Whatsapp";
import database from "./utils/database";

const messages = new Map<string, string>([]);

export default function rapy(whatsapp: Whatsapp) {
  const db = database();
}
