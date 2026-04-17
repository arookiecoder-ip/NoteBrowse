import "dotenv/config";
import { getPrisma } from "./src/lib/prisma";

async function main() {
  const prisma = await getPrisma();
  const res = await prisma.notebook.findMany({
    select: { slug: true, mode: true, passwordHash: true }
  });
  console.log(res);
}

main();
