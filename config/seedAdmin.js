const bcrypt = require("bcryptjs");

const Admin = require("../models/Admin");

const seedDefaultAdmin = async () => {
  const adminEmail = process.env.ADMIN_EMAIL ? process.env.ADMIN_EMAIL.trim().toLowerCase() : "";
  const adminPassword = process.env.ADMIN_PASSWORD ? process.env.ADMIN_PASSWORD.trim() : "";

  if (!adminEmail || !adminPassword) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be configured");
  }

  const existingAdmin = await Admin.findOne();

  if (existingAdmin) {
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await Admin.create({
    email: adminEmail,
    password: passwordHash,
    singletonKey: "main"
  });

  console.log(`Admin seeded: ${adminEmail}`);
};

module.exports = seedDefaultAdmin;
