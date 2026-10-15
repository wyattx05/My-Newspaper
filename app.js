function updateEditionDate() {
  const now = new Date();
  const full = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" });
  const short = new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric", year: "numeric" });
  const time = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
  document.querySelector("#edition-date").textContent = full.format(now);
  document.querySelector("#full-date").textContent = full.format(now);
  document.querySelector("#edition-short-date").textContent = short.format(now);
  document.querySelector("#clock").textContent = time.format(now);
}

updateEditionDate();
setInterval(updateEditionDate, 30_000);
