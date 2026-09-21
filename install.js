(function () {
  "use strict";

  var installButton = document.getElementById("installBtn");
  var offlineStatus = document.getElementById("offlineStatus");
  var installPrompt = null;

  window.addEventListener("beforeinstallprompt", function (event) {
    event.preventDefault();
    installPrompt = event;
    installButton.hidden = false;
  });

  installButton.addEventListener("click", async function () {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    installButton.hidden = true;
  });

  window.addEventListener("appinstalled", function () {
    installPrompt = null;
    installButton.hidden = true;
  });

  if ("serviceWorker" in navigator && window.isSecureContext && location.protocol !== "file:") {
    navigator.serviceWorker.register("./sw.js", { scope: "./", updateViaCache: "none" })
      .then(function () { return navigator.serviceWorker.ready; })
      .then(function () {
        offlineStatus.textContent = "القائمة والصور جاهزة للاستخدام بدون اتصال على هذا الجهاز.";
      })
      .catch(function () {
        offlineStatus.textContent = "القائمة تعمل بالإنترنت. تعذر تجهيز النسخة بدون اتصال؛ أعد فتح الصفحة وأنت متصل.";
      });
  } else {
    offlineStatus.textContent = "افتح رابط الموقع في متصفح حديث لتثبيت القائمة وتجهيزها بدون اتصال.";
  }
})();
