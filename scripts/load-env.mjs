import { config } from "dotenv";
import { existsSync } from "fs";

if (!existsSync(".env")) {
  console.error("ERROR: .env missing in project root.");
  console.error("From your Mac: scp .env ubuntu@YOUR_EC2_IP:~/LMNT/.env");
  process.exit(1);
}

config({ path: ".env" });
config({ path: ".env.local", override: true });
