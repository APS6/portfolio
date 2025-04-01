import { getCollection } from "astro:content";

const input = document.querySelector("textarea");
const outputDiv = document.querySelector("#outputdiv");
const scrollParent = document.querySelector("#scrollParent");

const scrollToBottom = () => {
  scrollParent.scrollTop =
    scrollParent.scrollHeight - scrollParent.clientHeight;
};
const projects = await getCollection("projects");

const outputContent = {
  help: (userInput) => `
    <span class="text-[#7AA2F7]">guest@portfolio:~</span>
    <p class="inline">
      ${userInput} <br />
      <span class="bg-[#449DAB] px-1 py-[2px]">help</span>
      Here are the commands you can use:<br>
      <span class="font-bold text-[#AD8EE6]">help</span> - Shows this list
      of commands <br />
      <span class="font-bold text-[#AD8EE6]">projects</span> - Shows some
       of my work.<br />
       <span class="font-bold text-[#AD8EE6]">about</span> - A little bit
       about me.<br />
       <span class="font-bold text-[#AD8EE6]">connect</span> - Details for
       you to connect with me. <br />
       <span class="font-bold text-[#AD8EE6]">gui</span> - Switch to GUI.<br />
       <span class="font-bold text-[#AD8EE6]">clear</span> - Clears the terminal.
    </p>
`,
  projects: (userInput) => {
    return `
        <span class="text-[#7AA2F7]">guest@portfolio:~</span>
        <p class="inline">
          ${userInput} <br />
          <span class="bg-[#449DAB] px-1 py-[2px]">Projects</span> <br>
         ${projects.map((project) => `<span><a href="${project.data.url}" target="_blank"  class="text-[#449dab] underline underline-offset-4 font-bold">${project.data.name}</a> - ${project.data.description}</span>`).join("<br />")}
        </p>
      `;
  },
  about: (userInput) => `
    <span class="text-[#7AA2F7]">guest@portfolio:~</span>
    <p class="inline">
      ${userInput} <br />
      <span class="bg-[#449DAB] px-1 py-[2px]">About</span><br>
      Hey there! I’m Anirudha, a 15 year old programmer from India. <br
      /> I started programming at the age of 13 with web development. Over
      the years I have worked with multiple languages and frameworks. Some
      of my favorites are Astro, Svelte, Ruby on Rails and Phoenix LiveView
      (Elixir).
      <br />
      I have built a few things and I will continue building things and
      learning what I have to because that is why I like to code.
    </p>
`,
  connect: (userInput) => `
    <span class="text-[#7AA2F7]">guest@portfolio:~</span>
    <p class="inline">
      ${userInput} <br />
      <span class="bg-[#449DAB] px-1 py-[2px]">Connect</span><br>
            <a class="underline underline-offset-4" href="https://chat.anirudhasah.com"
                >chat.anirudha</a
            >
            <a class="underline underline-offset-4" href="mailto:me@anirudhasah.com"
                >me@anirudhasah.com</a
            >
            <div class="flex gap-4 pt-2">
                <a href="https://github.com/APS6" class="underline underline-offset-4">
                    Github
                </a>
                <a href="https://twitter.com/anirudhasah" class="underline underline-offset-4">
                    Twitter
                </a>
                <a href="https://discord.com/users/752376627937411103" class="underline underline-offset-4">
                    Discord
                </a>
            </div>
    </p>
`,
  empty: () => `
    <span class="text-[#7AA2F7]">guest@portfolio:~</span>`,
  invalid: (userInput) => `
    <span class="text-[#7AA2F7]">guest@portfolio:~</span>
    <p class="inline">
      ${userInput} <br />
      <span class="bg-[#f7768e] px-1 py-[2px]">ERROR</span>
      Invalid command <br>
      type 'help' to see the list of commands
    </p>
`,
};

const giveOutput = (type, userInput) => {
  const outputEl = document.createElement("div");
  outputEl.classList = "output";
  outputEl.innerHTML = outputContent[type](userInput);
  outputDiv.appendChild(outputEl);
};

const clearTerminal = () => {
  const outputs = outputDiv.querySelectorAll(".output");
  outputs.forEach((output) => {
    output.remove();
  });
};

const resizeTextarea = () => {
  input.style.height = "auto";
  input.style.height = `${input.scrollHeight + 24}px`;
};

input.addEventListener("keydown", (e) => {
  resizeTextarea();
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    const command = input.value.trim();
    input.value = "";
    input.style.height = "auto";
    switch (command.toLowerCase()) {
      case "help":
        giveOutput("help", command);
        break;
      case "projects":
        giveOutput("projects", command);
        break;
      case "about":
        giveOutput("about", command);
        break;
      case "connect":
        giveOutput("connect", command);
        break;
      case "clear":
        clearTerminal();
        break;
      case "":
        giveOutput("empty");
        break;
      case "gui":
        window.location.href = "https://www.anirudhasah.com";
        break;
      default:
        giveOutput("invalid", command);
        break;
    }
    scrollToBottom();
  }
});
