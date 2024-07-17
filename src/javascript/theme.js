const toggle = document.querySelector("#theme-toggle");
const lightIcon = document.querySelector("#light-icon");
const darkIcon = document.querySelector("#dark-icon");
const lightFace = document.querySelector("#lightface");
const darkFace = document.querySelector("#darkface");

const setTheme = (theme) => {
  if (theme === "light") {
    document.documentElement.classList.remove("dark");
    darkIcon.classList.add("hidden");
    darkFace.classList.add("hidden");
    lightIcon.classList.remove("hidden");
    lightFace.classList.remove("hidden");
    preference = "light";
    window.localStorage.setItem("theme", preference);
  } else {
    document.documentElement.classList.add("dark");
    darkIcon.classList.remove("hidden");
    lightIcon.classList.add("hidden");
    darkFace.classList.remove("hidden");
    lightFace.classList.add("hidden");
    preference = "dark";
    window.localStorage.setItem("theme", preference);
  }
};

let preference = window.localStorage.getItem("theme")
  ? window.localStorage.getItem("theme")
  : "light";

if (preference) {
  setTheme(preference);
}

toggle.addEventListener("click", () => {
  if (preference === "dark") {
    setTheme("light");
  } else {
    setTheme("dark");
  }
});
