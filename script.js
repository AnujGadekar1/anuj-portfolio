// Path: script.js
// XP HOME PORTFOLIO – window manager, boot/login, apps, responsiveness

let zIndex = 100;
let shutdownInProgress = false;

document.addEventListener("DOMContentLoaded", () => {
  runBootSequence();
  updateClock();
  setInterval(updateClock, 1000);
  setupDrag();
  wireDesktopIcons();
  loadNotepadState();
  setupResponsiveMode();
  window.addEventListener("resize", setupResponsiveMode);
  initProjectCardClicks();
});

// ---------------- BOOT / LOGIN / SHUTDOWN ----------------

function runBootSequence() {
  const boot = document.getElementById("boot-sequence");
  const stages = boot.querySelectorAll(".boot-stage");
  const desktop = document.getElementById("desktop");

  let index = 0;
  function showStage(i) {
    stages.forEach((s, idx) => {
      s.style.display = idx === i ? "flex" : "none";
    });
  }

  showStage(0); // BIOS
  setTimeout(() => {
    showStage(1); // XP logo
    setTimeout(() => {
      showStage(2); // Login
      const user = document.getElementById("login-user");
      user.addEventListener("click", () => {
        boot.classList.add("boot-hide");
        setTimeout(() => {
          boot.style.display = "none";
          desktop.style.display = "block";
          openWindow("about-window");
          openWindow("projects-window");
        }, 400);
      });
    }, 2600);
  }, 1800);
}

function triggerShutdown() {
  if (shutdownInProgress) return;
  shutdownInProgress = true;

  const boot = document.getElementById("boot-sequence");
  const desktop = document.getElementById("desktop");

  desktop.style.display = "none";
  boot.style.display = "flex";
  const stages = boot.querySelectorAll(".boot-stage");

  stages.forEach((s) => (s.style.display = "none"));
  const xpStage = boot.querySelector('.boot-stage[data-stage="xp"]');
  xpStage.style.display = "flex";

  setTimeout(() => {
    // back to login
    const loginStage = boot.querySelector('.boot-stage[data-stage="login"]');
    stages.forEach((s) => (s.style.display = "none"));
    loginStage.style.display = "flex";
    shutdownInProgress = false;
  }, 2500);
}

// ---------------- CLOCK ----------------

function updateClock() {
  const now = new Date();
  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  const clockEl = document.getElementById("clock");
  if (clockEl) {
    clockEl.textContent = `${hours}:${minutes} ${ampm}`;
  }
}

// ---------------- WINDOW MANAGEMENT ----------------

function openWindow(id) {
  const win = document.getElementById(id);
  if (!win) return;

  if (win.style.display === "none" || !win.style.display) {
    win.style.display = "flex";

    if (!win.dataset.moved && !win.dataset.max) {
      // keep initial, but ensure in viewport
      const rect = win.getBoundingClientRect();
      if (rect.left < 0 || rect.top < 0) {
        win.style.top = "50px";
        win.style.left = "50px";
      }
    }

    createTaskbarItem(id);
  }
  bringToFront(id);
}

function closeWindow(id) {
  const win = document.getElementById(id);
  if (!win) return;
  win.style.display = "none";
  win.dataset.max = "false";

  const task = document.getElementById(`task-${id}`);
  if (task) task.remove();
}

function minimizeWindow(id) {
  const win = document.getElementById(id);
  if (!win) return;
  win.style.display = "none";
  const task = document.getElementById(`task-${id}`);
  if (task) task.classList.remove("active");
}

function maximizeWindow(id) {
  const win = document.getElementById(id);
  if (!win) return;

  const isMobile = window.innerWidth < 768;
  if (win.dataset.max === "true") {
    win.style.top = win.dataset.oldTop;
    win.style.left = win.dataset.oldLeft;
    win.style.width = win.dataset.oldWidth;
    win.style.height = win.dataset.oldHeight;
    win.dataset.max = "false";
  } else {
    win.dataset.oldTop = win.style.top;
    win.dataset.oldLeft = win.style.left;
    win.dataset.oldWidth = win.style.width;
    win.dataset.oldHeight = win.style.height;

    win.style.top = "0";
    win.style.left = "0";
    win.style.width = "100%";
    win.style.height = isMobile ? "calc(100vh - 30px)" : "calc(100vh - 30px)";
    win.dataset.max = "true";
  }
  bringToFront(id);
}

function bringToFront(id) {
  const win = document.getElementById(id);
  if (!win) return;
  zIndex += 1;
  win.style.zIndex = zIndex;

  document.querySelectorAll(".task-item").forEach((t) => t.classList.remove("active"));
  const task = document.getElementById(`task-${id}`);
  if (task) task.classList.add("active");
}

function createTaskbarItem(id) {
  if (document.getElementById(`task-${id}`)) return;

  const win = document.getElementById(id);
  const titleText = win.querySelector(".title-bar-text").textContent.trim();
  const iconSrc = win.querySelector(".title-icon")?.src || "";

  const taskbar = document.getElementById("taskbar-items");
  const item = document.createElement("button");
  item.type = "button";
  item.className = "task-item active";
  item.id = `task-${id}`;
  item.innerHTML = `<img src="${iconSrc}" alt="" /> <span>${titleText}</span>`;

  item.onclick = () => {
    if (win.style.display === "none") {
      openWindow(id);
    } else if (parseInt(win.style.zIndex || "0", 10) < zIndex) {
      bringToFront(id);
    } else {
      minimizeWindow(id);
    }
  };

  taskbar.appendChild(item);
}

// ---------------- DRAGGING (Desktop only, Pointer-based) ----------------

function setupDrag() {
  const windows = document.querySelectorAll(".window");

  windows.forEach((win) => {
    const bar = win.querySelector(".title-bar");
    if (!bar) return;

    bar.addEventListener("pointerdown", (e) => {
      if (window.innerWidth < 768) return; // disable drag on mobile

      if (e.target.tagName === "BUTTON" || e.target.closest("button")) return;

      bringToFront(win.id);
      win.dataset.moved = "true";

      const rect = win.getBoundingClientRect();
      const desktopRect = document.getElementById("desktop").getBoundingClientRect();

      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;

      function onMove(ev) {
        let newLeft = ev.clientX - offsetX;
        let newTop = ev.clientY - offsetY;

        const maxLeft = desktopRect.right - rect.width;
        const maxTop = desktopRect.bottom - rect.height;

        newLeft = Math.min(Math.max(newLeft, desktopRect.left), maxLeft);
        newTop = Math.min(Math.max(newTop, desktopRect.top), maxTop);

        win.style.left = `${newLeft}px`;
        win.style.top = `${newTop}px`;
      }

      function onUp() {
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
      }

      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
    });
  });
}

// ---------------- START MENU ----------------

function toggleStartMenu() {
  const menu = document.getElementById("start-menu");
  if (!menu) return;

  const isOpen = menu.style.display === "block";
  if (isOpen) {
    menu.style.display = "none";
  } else {
    menu.style.display = "block";
    menu.style.zIndex = zIndex + 1000;
  }
}

document.addEventListener("click", (e) => {
  const menu = document.getElementById("start-menu");
  const startBtn = document.querySelector(".start-btn");
  if (!menu || !startBtn) return;

  const clickInsideMenu = menu.contains(e.target);
  const clickOnStart = startBtn.contains(e.target);

  if (!clickInsideMenu && !clickOnStart) {
    menu.style.display = "none";
  }
});
// Make project cards clickable (all windows)
function initProjectCardClicks() {
  const cards = document.querySelectorAll(".project-card-xl");
  cards.forEach((card) => {
    const link = card.dataset.link;
    if (!link) return;

    card.style.cursor = "pointer";

    card.addEventListener("click", () => {
      window.open(link, "_blank");
    });
  });
}

// run once when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  initProjectCardClicks();
});

// ---------------- CONTACT FORM ----------------

function handleContact(e) {
  e.preventDefault();
  alert("Thanks for reaching out! This XP email client is a visual shell – you can contact me at: anuj_work11@gmail.com");
}

// ---------------- DESKTOP ICONS ----------------

// ---------------- DESKTOP ICONS ----------------

function wireDesktopIcons() {
  const isTouch =
    "ontouchstart" in window || navigator.maxTouchPoints > 0;

  document.querySelectorAll(".icon").forEach((icon) => {
    const winId = icon.dataset.window;
    const external = icon.dataset.external;
    const message = icon.dataset.alert;

    const openAction = () => {
      if (winId) {
        openWindow(winId);
      } else if (external) {
        window.open(external, "_blank");
      } else if (message) {
        alert(message);
      }
    };

    // visual select on any device
    icon.addEventListener("click", () => {
      icon.classList.add("icon-selected");
      setTimeout(() => icon.classList.remove("icon-selected"), 150);

      // on touch/mobile: single tap opens the window
      if (isTouch) {
        openAction();
      }
    });

    // on desktop: keep classic double-click behaviour
    if (!isTouch) {
      icon.addEventListener("dblclick", openAction);
    }
  });
}


// ---------------- NOTEPAD (Session persistence) ----------------

function loadNotepadState() {
  const area = document.getElementById("notepad-textarea");
  if (!area) return;
  const content = sessionStorage.getItem("anuj_notepad") || "";
  area.value = content;
  area.addEventListener("input", () => {
    sessionStorage.setItem("anuj_notepad", area.value);
  });
}

// ---------------- CMD APP ----------------

function handleCmdKey(e) {
  if (e.key === "Enter") {
    const input = e.target;
    const value = input.value.trim();
    const output = document.getElementById("cmd-output");
    if (!output) return;

    output.innerHTML += `C:\\>${value}<br />`;

    switch (value.toLowerCase()) {
      case "help":
        output.innerHTML += "commands: about, projects, clear, whoami<br /><br />";
        break;
      case "about":
        openWindow("about-window");
        output.innerHTML += "Opened About Me window.<br /><br />";
        break;
      case "projects":
        openWindow("projects-window");
        output.innerHTML += "Opened Projects window.<br /><br />";
        break;
      case "whoami":
        output.innerHTML += "Anuj - Full-Stack Engineer, ShXlabs founder.<br /><br />";
        break;
      case "clear":
        output.innerHTML = "Microsoft Windows XP [Version 5.1.2600]<br /><br />";
        break;
      default:
        output.innerHTML += `'${value}' is not recognized as an internal or external command.<br /><br />`;
    }

    output.scrollTop = output.scrollHeight;
    input.value = "";
  }
}

// ---------------- PHOTOS APP ----------------

function setPhoto(src) {
  const preview = document.querySelector("#photos-window .photo-preview img");
  if (!preview) return;
  preview.src = src;
}

// ---------------- RESPONSIVENESS ----------------
// ---------------- RESPONSIVENESS ----------------

function setupResponsiveMode() {
  const isMobile = window.innerWidth < 768;
  document.body.classList.toggle("mobile-mode", isMobile);

  const windows = document.querySelectorAll(".window");

  if (isMobile) {
    // Make each open window full-width & stacked,
    // but remember original position for when we go back to desktop.
    windows.forEach((win) => {
      if (!win.dataset.mobilePrevTop) {
        win.dataset.mobilePrevTop = win.style.top || "";
        win.dataset.mobilePrevLeft = win.style.left || "";
        win.dataset.mobilePrevWidth = win.style.width || "";
        win.dataset.mobilePrevHeight = win.style.height || "";
      }

      if (win.style.display !== "none") {
        win.style.top = "0";
        win.style.left = "0";
        win.style.width = "100%";
        // let CSS control height in mobile mode so content can scroll
        win.style.height = "";
      }
    });
  } else {
    // Restore original window geometry when going back to larger screens
    windows.forEach((win) => {
      if (win.dataset.mobilePrevTop !== undefined) {
        win.style.top = win.dataset.mobilePrevTop;
        win.style.left = win.dataset.mobilePrevLeft;
        win.style.width = win.dataset.mobilePrevWidth;
        win.style.height = win.dataset.mobilePrevHeight;
      }
    });
  }
}


