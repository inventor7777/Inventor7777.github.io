const storageKey = "inventor7777-theme";
const systemTheme = window.matchMedia("(prefers-color-scheme: light)");
let savedTheme;
try { savedTheme = localStorage.getItem(storageKey); } catch { /* Storage may be disabled. */ }
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
}
if (savedTheme !== "light" && savedTheme !== "dark") savedTheme = null;
applyTheme(savedTheme || (systemTheme.matches ? "light" : "dark"));
document.getElementById("theme-toggle").addEventListener("click", () => {
  savedTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(savedTheme);
  try { localStorage.setItem(storageKey, savedTheme); } catch { /* Keep the in-memory preference. */ }
});
systemTheme.addEventListener("change", (event) => {
  if (!savedTheme) applyTheme(event.matches ? "light" : "dark");
});

const starfield = document.createElement("div");
starfield.className = "starfield";
starfield.setAttribute("aria-hidden", "true");
const symbols = "{}[]()<>/;:=!&|#%*+-~?$_";
for (let i = 0; i < 32; i++) {
  const star = document.createElement("span");
  star.textContent = symbols[Math.floor(Math.random() * symbols.length)];
  const duration = 80 + Math.random() * 80;
  star.style.setProperty("--x", `${Math.random() * 100}%`);
  star.style.setProperty("--y", `${Math.random() * 100}%`);
  star.style.setProperty("--duration", `${duration}s`);
  star.style.setProperty("--delay", `${-Math.random() * duration}s`);
  starfield.append(star);
}
document.body.append(starfield);
