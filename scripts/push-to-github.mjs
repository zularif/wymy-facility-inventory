import { execSync } from "child_process";

const token = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
if (!token) { console.error("Missing GITHUB_PERSONAL_ACCESS_TOKEN"); process.exit(1); }

const remote = `https://${token}@github.com/zularif/wymy-facility-inventory.git`;

function run(cmd, opts = {}) {
  console.log("$", cmd.replace(token, "***"));
  return execSync(cmd, { stdio: "inherit", ...opts });
}

try {
  run(`git config user.email "replit@wymy.com"`);
  run(`git config user.name "WYMY Inventory"`);

  try { run(`git remote remove github`); } catch {}
  run(`git remote add github "${remote}"`);

  const branch = execSync("git branch --show-current").toString().trim() || "main";
  console.log("Branch:", branch);

  run(`git push github ${branch}:main --force`);
  console.log("\n✅ Successfully pushed to GitHub!");
} catch (e) {
  console.error("Push failed:", e.message);
  process.exit(1);
}
