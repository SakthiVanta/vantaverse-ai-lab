import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "./index";
import { adminUsers } from "./schema";
import { eq } from "drizzle-orm";

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_SEED_PASSWORD;

  if (!email || !password) {
    console.error(
      "Set ADMIN_EMAIL and ADMIN_SEED_PASSWORD in .env before seeding the admin user."
    );
    process.exit(1);
  }

  const existing = await db.query.adminUsers.findFirst({
    where: eq(adminUsers.email, email),
  });

  if (existing) {
    console.log(`Admin user already exists for ${email}`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await db.insert(adminUsers).values({ email, passwordHash, name: "Admin" });
  console.log(`Created admin user: ${email}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
