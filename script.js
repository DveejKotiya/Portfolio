const menuButton = document.querySelector(".menu-toggle");
const nav = document.querySelector("#nav");

menuButton.addEventListener("click", () => {
  const isOpen = nav.classList.toggle("open");
  menuButton.setAttribute("aria-expanded", String(isOpen));
});

nav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    nav.classList.remove("open");
    menuButton.setAttribute("aria-expanded", "false");
  });
});

document.querySelector("#year").textContent = new Date().getFullYear();


// GitHub profile statistics and language distribution
(async function loadGitHubDashboard() {
  const username = "DveejKotiya";
  const api = "https://api.github.com";
  const numberFormat = new Intl.NumberFormat("en-IN");

  function setText(id, value) {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
  }

  function showChartMessage(message) {
    const chart = document.getElementById("language-chart");
    if (chart) chart.innerHTML = `<p class="chart-loading">${message}</p>`;
  }

  async function fetchJson(url) {
    const response = await fetch(url, {
      headers: { Accept: "application/vnd.github+json" }
    });
    if (!response.ok) {
      throw new Error(`GitHub API returned ${response.status}`);
    }
    return response.json();
  }

  try {
    const [profile, repositories] = await Promise.all([
      fetchJson(`${api}/users/${username}`),
      fetchJson(`${api}/users/${username}/repos?per_page=100&type=owner&sort=updated`)
    ]);

    const ownedRepos = repositories.filter(repo => !repo.fork);
    const stars = ownedRepos.reduce((sum, repo) => sum + repo.stargazers_count, 0);
    const forks = ownedRepos.reduce((sum, repo) => sum + repo.forks_count, 0);

    setText("stat-repos", numberFormat.format(profile.public_repos));
    setText("stat-stars", numberFormat.format(stars));
    setText("stat-followers", numberFormat.format(profile.followers));
    setText("stat-forks", numberFormat.format(forks));

    const totals = {};
    // Limit concurrent requests to be gentle with GitHub's unauthenticated API.
    for (let i = 0; i < ownedRepos.length; i += 8) {
      const batch = ownedRepos.slice(i, i + 8);
      const results = await Promise.allSettled(
        batch.map(repo => fetchJson(repo.languages_url))
      );
      results.forEach(result => {
        if (result.status === "fulfilled") {
          Object.entries(result.value).forEach(([language, bytes]) => {
            totals[language] = (totals[language] || 0) + bytes;
          });
        }
      });
    }

    renderLanguageChart(totals);
  } catch (error) {
    console.error("Unable to load GitHub dashboard:", error);
    ["stat-repos", "stat-stars", "stat-followers", "stat-forks"].forEach(id => setText(id, "Unavailable"));
    showChartMessage("GitHub data could not be loaded right now. Please refresh the page in a moment.");
  }

  function renderLanguageChart(languageTotals) {
    const chart = document.getElementById("language-chart");
    if (!chart) return;

    const entries = Object.entries(languageTotals)
      .filter(([, bytes]) => bytes > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7);

    if (!entries.length) {
      showChartMessage("No public language data was found yet.");
      return;
    }

    const total = entries.reduce((sum, [, bytes]) => sum + bytes, 0);
    const palette = ["#ef4444", "#38bdf8", "#a78bfa", "#f59e0b", "#34d399", "#f472b6", "#94a3b8"];
    const rows = entries.map(([name, bytes], index) => {
      const percentage = (bytes / total) * 100;
      const width = Math.max(percentage, 1.5);
      return `
        <div class="language-row">
          <div class="language-label"><span class="language-dot" style="background:${palette[index]}"></span><span>${escapeHtml(name)}</span><strong>${percentage.toFixed(1)}%</strong></div>
          <div class="language-track"><span style="width:${width}%;background:${palette[index]}"></span></div>
        </div>`;
    }).join("");

    chart.innerHTML = `<div class="language-list">${rows}</div>`;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
  }
})();
