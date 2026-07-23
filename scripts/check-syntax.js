const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const roots = ["src", "db/migrations", "scripts"];
const files = [];

const collect = (entry) => {
  const absolute = path.resolve(entry);
  for (const item of fs.readdirSync(absolute, { withFileTypes: true })) {
    const child = path.join(absolute, item.name);
    if (item.isDirectory()) collect(child);
    else if (item.isFile() && item.name.endsWith(".js")) files.push(child);
  }
};

roots.forEach(collect);
for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status || 1);
}

console.log(`Syntax OK: ${files.length} ta JavaScript fayl tekshirildi`);
