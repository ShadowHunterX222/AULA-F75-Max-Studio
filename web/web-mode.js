(() => {
  "use strict";

  const banner = document.getElementById("webDriverBanner");
  const headline = document.getElementById("webDriverHeadline");
  const message = document.getElementById("webDriverMessage");
  const status = document.getElementById("webDriverStatus");
  const connectButton = document.getElementById("connectBtn");

  const secure = window.isSecureContext === true;
  const supported = "hid" in navigator;

  document.documentElement.dataset.driverMode = "web";

  if (!secure) {
    headline.textContent = "Secure connection required";
    message.textContent = "WebHID is only available on HTTPS (or localhost). Open this site over its HTTPS address, then reconnect the keyboard.";
    status.textContent = "HTTPS required";
    status.classList.add("is-warning");
    if (connectButton) connectButton.disabled = true;
  } else if (!supported) {
    headline.textContent = "WebHID is not available in this browser";
    message.textContent = "Use a current Chromium-based desktop browser such as Google Chrome or Microsoft Edge. Firefox and Safari do not currently provide this WebHID connection path.";
    status.textContent = "Unsupported browser";
    status.classList.add("is-warning");
    if (connectButton) connectButton.disabled = true;
  } else {
    headline.textContent = "Browser WebHID ready";
    message.textContent = "Connect with USB-C or the 2.4 GHz receiver. Your browser will ask you to grant access to the AULA device. The web version cannot capture global keystrokes or keep animations running after this tab is suspended.";
    status.textContent = "WebHID available";
    status.classList.add("is-ready");
  }

  document.addEventListener("visibilitychange", () => {
    if (!status) return;
    if (document.hidden && supported && secure) {
      status.textContent = "Tab in background";
      status.classList.remove("is-ready");
      status.classList.add("is-warning");
    } else if (supported && secure) {
      status.textContent = "WebHID available";
      status.classList.remove("is-warning");
      status.classList.add("is-ready");
    }
  });
})();
