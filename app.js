const CORS_PROXY = "https://proxy.cors.dev/";
const STORIES_PER_FEED = 4;
const MAX_STORIES = 28;

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

function firstText(parent, names) {
  for (const name of names) {
    const element = parent.getElementsByTagNameNS("*", name)[0];
    if (element?.textContent?.trim()) return element.textContent.trim();
  }
  return "";
}

function parseFeed(xmlText, feed) {
  const documentXml = new DOMParser().parseFromString(xmlText, "application/xml");
  if (documentXml.querySelector("parsererror")) throw new Error("Invalid feed format");

  const entries = [
    ...documentXml.getElementsByTagNameNS("*", "item"),
    ...documentXml.getElementsByTagNameNS("*", "entry"),
  ];

  return entries.slice(0, STORIES_PER_FEED).map((entry) => {
    const linkElement = [...entry.getElementsByTagNameNS("*", "link")]
      .find((link) => link.getAttribute("rel") === "alternate")
      ?? entry.getElementsByTagNameNS("*", "link")[0];
    const link = linkElement?.getAttribute("href") || linkElement?.textContent?.trim() || "";
    const rawDate = firstText(entry, ["pubDate", "published", "updated", "date"]);
    const parsedDate = rawDate ? new Date(rawDate) : null;
    const rawSummary = firstText(entry, ["description", "summary", "content", "encoded"]);
    const summary = new DOMParser().parseFromString(rawSummary, "text/html").body.textContent.trim();

    return {
      source: feed.name,
      title: firstText(entry, ["title"]) || "Untitled story",
      link: /^https?:\/\//i.test(link) ? link : "",
      summary,
      published: parsedDate && !Number.isNaN(parsedDate.valueOf()) ? parsedDate.toISOString() : "",
    };
  });
}

async function fetchFeed(feed) {
  const response = await fetch(`${CORS_PROXY}${feed.url}`, { credentials: "omit" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return parseFeed(await response.text(), feed);
}

function addText(parent, tag, className, value) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = value;
  parent.append(element);
  return element;
}

function renderStories(stories) {
  const container = document.querySelector("#stories");
  container.replaceChildren();

  stories.forEach((story, index) => {
    const article = document.createElement("article");
    article.className = `story${index === 0 ? " story-feature" : ""}`;

    const copy = document.createElement("div");
    copy.className = "story-copy";
    const meta = document.createElement("div");
    meta.className = "story-meta";
    addText(meta, "span", "outlet-mark", story.source.slice(0, 1));
    addText(meta, "span", "outlet-name", story.source);
    if (story.published) {
      const date = new Date(story.published);
      const time = addText(meta, "time", "", new Intl.DateTimeFormat(undefined, {
        month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
      }).format(date));
      time.dateTime = date.toISOString();
    }
    copy.append(meta);

    const headline = document.createElement("h2");
    if (story.link) {
      const link = document.createElement("a");
      link.href = story.link;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = story.title;
      headline.append(link);
    } else {
      headline.textContent = story.title;
    }
    copy.append(headline);
    if (story.summary) addText(copy, "p", "", story.summary.slice(0, 280));
    article.append(copy);
    container.append(article);
  });

  document.querySelector("#story-count").textContent = String(stories.length).padStart(2, "0");
}

async function loadEdition() {
  const status = document.querySelector("#feed-status");
  if (!Array.isArray(RSS_FEEDS) || RSS_FEEDS.length === 0) {
    status.hidden = true;
    document.querySelector("#story-count").textContent = "00";
    return;
  }

  const results = await Promise.allSettled(RSS_FEEDS.map(fetchFeed));
  const stories = results.flatMap((result) => result.status === "fulfilled" ? result.value : []);
  stories.sort((a, b) => new Date(b.published || 0) - new Date(a.published || 0));
  const edition = stories.slice(0, MAX_STORIES);
  renderStories(edition);

  const failed = results.filter((result) => result.status === "rejected").length;
  if (edition.length === 0) {
    status.textContent = "Your feeds couldn’t be reached. Refresh to try again.";
  } else if (failed > 0) {
    status.textContent = `Showing the latest stories. ${failed} feed${failed === 1 ? "" : "s"} couldn’t be reached.`;
  } else {
    status.hidden = true;
  }
}

updateEditionDate();
setInterval(updateEditionDate, 30_000);
loadEdition().catch(() => {
  document.querySelector("#feed-status").textContent = "Your feeds couldn’t be reached. Refresh to try again.";
});
