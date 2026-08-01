// scripts/update-projects.js
// Fetches the top starred, non-forked repos for GITHUB_USERNAME and writes
// a markdown table into README.md between the PROJECTS:START / PROJECTS:END markers.

const fs = require("fs");

const USERNAME = process.env.GITHUB_USERNAME;
const TOKEN = process.env.GH_TOKEN;
const MAX_REPOS = 6;
const README_PATH = "README.md";
const START_MARKER = "<!-- PROJECTS:START -->";
const END_MARKER = "<!-- PROJECTS:END -->";

if (!USERNAME) {
  console.error("Missing GITHUB_USERNAME env var.");
  process.exit(1);
}

const LANG_EMOJI = {
  JavaScript: "🟨",
  TypeScript: "🔷",
  Python: "🐍",
  Java: "☕",
  "C++": "➕",
  C: "🔧",
  HTML: "🌐",
  CSS: "🎨",
  Kotlin: "🅺",
  Dart: "🎯",
  Shell: "💻",
};

async function main() {
  const res = await fetch(
    `https://api.github.com/users/${USERNAME}/repos?per_page=100&sort=updated`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
      },
    }
  );

  if (!res.ok) {
    console.error(`GitHub API error: ${res.status} ${res.statusText}`);
    process.exit(1);
  }

  const repos = await res.json();

  const topRepos = repos
    .filter((r) => !r.fork && !r.private && !r.archived)
    .sort((a, b) => b.stargazers_count - a.stargazers_count || b.forks_count - a.forks_count)
    .slice(0, MAX_REPOS);

  if (topRepos.length === 0) {
    console.log("No public repos found, skipping README update.");
    return;
  }

  const rows = topRepos.map((r) => {
    const emoji = LANG_EMOJI[r.language] || "📦";
    const desc = (r.description || "No description provided.").replace(/\|/g, "-");
    const lang = r.language || "—";
    return `| ${emoji} [**${r.name}**](${r.html_url}) | ${desc} | ${lang} | ⭐ ${r.stargazers_count} |`;
  });

  const table = [
    "| Project | Description | Language | Stars |",
    "|:---|:---|:---:|:---:|",
    ...rows,
  ].join("\n");

  const timestamp = new Date().toISOString().split("T")[0];
  const section = `${START_MARKER}\n<div align="center">\n\n${table}\n\n<sub>🔄 Auto-updated from GitHub on ${timestamp}</sub>\n\n</div>\n${END_MARKER}`;

  const readme = fs.readFileSync(README_PATH, "utf8");
  const pattern = new RegExp(`${START_MARKER}[\\s\\S]*?${END_MARKER}`);

  if (!pattern.test(readme)) {
    console.error("Markers not found in README.md — nothing updated.");
    process.exit(1);
  }

  const updated = readme.replace(pattern, section);
  fs.writeFileSync(README_PATH, updated);
  console.log(`README.md updated with top ${topRepos.length} repos.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
