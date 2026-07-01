const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const config = require("../src/shared/config");

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = path.resolve(__dirname, "..", "backups");
const output = path.join(backupDir, `${config.db.name}-${stamp}.sql`);

fs.mkdirSync(backupDir, { recursive: true });

const args = [
  "--host", config.db.host,
  "--port", String(config.db.port),
  "--username", config.db.user,
  "--dbname", config.db.name,
  "--format", "plain",
  "--no-owner",
  "--no-privileges",
  "--file", output,
];

const child = spawn("pg_dump", args, {
  env: { ...process.env, PGPASSWORD: config.db.password },
  stdio: ["ignore", "inherit", "inherit"],
});

child.on("error", (error) => {
  console.error("pg_dump ishga tushmadi. PostgreSQL bin papkasini PATH ga qo'shing.");
  console.error(error.message);
  process.exitCode = 1;
});

child.on("exit", (code) => {
  if (code === 0) console.log(`Backup yaratildi: ${output}`);
  else process.exitCode = code || 1;
});
