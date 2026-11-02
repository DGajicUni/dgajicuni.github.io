(function () {
  "use strict";

  var navItems = [
    ["home", "Home", "index.html"],
    ["research", "Research", "research.html"],
    ["teaching", "Teaching", "teaching.html"],
    ["activities", "Activities", "activities.html"],
    ["team", "Team", "team.html"],
    ["vita", "Vita", "vita.html"]
  ];

  function escapeHTML(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function safeURL(value) {
    var url = String(value || "").trim();
    if (!url || /^(javascript|data|vbscript):/i.test(url)) return "";
    return escapeHTML(url);
  }

  function link(url, label, className) {
    var target = String(url || "");
    var href = safeURL(target);
    if (!href) return escapeHTML(label);
    var external = /^(https?:)?\/\//.test(url);
    return '<a class="' + escapeHTML(className || "") + '" href="' + href + '"' +
      (external ? ' target="_blank" rel="noopener noreferrer"' : "") + ">" + escapeHTML(label) + "</a>";
  }

  var data = window.SITE_CONTENT;
  var page = document.body.dataset.page || "home";
  var app = document.getElementById("app");
  var dialog;
  var lastFocus;

  function applyTheme() {
    Object.keys(data.theme || {}).forEach(function (key) {
      document.documentElement.style.setProperty("--" + key.replace(/[A-Z]/g, function (letter) {
        return "-" + letter.toLowerCase();
      }), data.theme[key]);
    });
  }

  function renderChrome() {
    var header = document.getElementById("site-header");
    header.className = "site-header";
    var previewSuffix = "";
    header.innerHTML = '<div class="brand-banner"><div class="brand-banner-inner"><div class="brand-cluster">' +
      '<a class="university-logo" href="' + safeURL(data.meta.universityUrl || "https://www.uni-leipzig.de/en") + '" target="_blank" rel="noopener noreferrer"><img src="' + safeURL(data.meta.universityLogo || "assets/leipzig-university.svg") + '" alt="Leipzig University"></a>' +
      '<a class="identity" href="index.html' + previewSuffix + '"><strong>' + escapeHTML(data.meta.name) + '</strong><span>' + escapeHTML(data.meta.role) + '</span></a></div>' +
      '<button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav">Menu</button></div></div>' +
      '<div class="nav-band"><nav class="site-nav" id="site-nav" aria-label="Primary">' + navItems.map(function (item) {
        return '<a href="' + item[2] + previewSuffix + '"' + (page === item[0] ? ' aria-current="page"' : "") + ">" + item[1] + "</a>";
      }).join("") + '</nav></div>';

    var toggle = header.querySelector(".nav-toggle");
    var nav = header.querySelector(".site-nav");
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });

    var footer = document.getElementById("site-footer");
    footer.className = "site-footer";
    footer.innerHTML = '<div class="footer-inner"><p>© ' + new Date().getFullYear() + " " + escapeHTML(data.meta.name) + "</p></div>";

    dialog = document.createElement("dialog");
    dialog.className = "detail-dialog";
    dialog.setAttribute("aria-labelledby", "dialog-title");
    dialog.innerHTML = '<div class="dialog-inner"><button class="dialog-close" type="button" aria-label="Close">×</button><div id="dialog-content"></div></div>';
    document.body.appendChild(dialog);
    dialog.querySelector(".dialog-close").addEventListener("click", closeDialog);
    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) closeDialog();
    });
    dialog.addEventListener("close", function () {
      if (lastFocus) lastFocus.focus();
    });
  }

  function openDialog(html, trigger) {
    lastFocus = trigger || document.activeElement;
    var content = dialog.querySelector("#dialog-content");
    if (window.MathJax && typeof window.MathJax.typesetClear === "function") {
      window.MathJax.typesetClear([content]);
    }
    content.innerHTML = html;
    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
      dialog.classList.add("dialog-fallback");
    }
    if (window.MathJax && typeof window.MathJax.typesetPromise === "function") {
      window.MathJax.typesetPromise([content]).catch(function (error) {
        console.warn("Could not typeset the mathematics in this abstract.", error);
      });
    }
    dialog.querySelector(".dialog-close").focus();
  }

  function closeDialog() {
    if (!dialog.open && !dialog.hasAttribute("open")) return;
    if (typeof dialog.close === "function") dialog.close();
    else {
      dialog.removeAttribute("open");
      dialog.classList.remove("dialog-fallback");
      if (lastFocus) lastFocus.focus();
    }
  }

  function formatDate(date) {
    if (!date) return "Date to be announced";
    var parsed = new Date(date + "T12:00:00Z");
    return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(parsed);
  }

  function talkLocation(value) {
    return String(value || "").replace(/\bITP\s*114\b/gi, "").replace(/^[\s·,;–—-]+|[\s·,;–—-]+$/g, "").trim();
  }

  function monthCalendarURL(value) {
    var url = String(value || "").trim();
    if (!url) return "";
    if (/([?&])mode=/i.test(url)) return url.replace(/([?&]mode=)[^&]*/i, "$1MONTH");
    return url + (url.indexOf("?") !== -1 ? "&" : "?") + "mode=MONTH";
  }

  function hero(label, title, lede, compact) {
    return '<section class="page-hero ' + (compact ? "compact" : "") + '"><div class="shell">' + (label ? '<p class="eyebrow">' + escapeHTML(label) + '</p>' : "") + '<h1>' + escapeHTML(title) + "</h1>" +
      (lede ? '<p class="lede">' + escapeHTML(lede) + "</p>" : "") + "</div></section>";
  }

  function authorNames(authors, linked) {
    return (authors || []).map(function (author) {
      return linked && author.url ? link(author.url, author.name) : escapeHTML(author.name);
    }).join(", ");
  }

  function inlineLinks(text, items) {
    var source = String(text || "");
    var cursor = 0;
    var output = "";
    while (cursor < source.length) {
      var match = null;
      (items || []).forEach(function (item) {
        if (!item.label) return;
        var index = source.indexOf(item.label, cursor);
        if (index !== -1 && (!match || index < match.index || (index === match.index && item.label.length > match.item.label.length))) {
          match = { index: index, item: item };
        }
      });
      if (!match) { output += escapeHTML(source.slice(cursor)); break; }
      output += escapeHTML(source.slice(cursor, match.index));
      output += link(match.item.url, match.item.label);
      cursor = match.index + match.item.label.length;
    }
    return output;
  }

  function renderHome() {
    var home = data.home;
    var notice = home.notice && home.notice.enabled !== false && (home.notice.text || home.notice.emailImage) ?
      '<div class="shell"><aside class="home-notice" aria-label="Temporary contact information"><p><strong>Temporary contact</strong><span>' + escapeHTML(home.notice.text || "") + (home.notice.emailImage ? '<img class="temporary-email-image" src="' + safeURL(home.notice.emailImage) + '" alt="Temporary contact email address">' : "") + '</span></p></aside></div>' : "";
    document.title = data.meta.name + " · " + data.meta.role;
    app.innerHTML = notice + '<div class="shell"><section class="home-hero"><div class="home-copy"><p class="lede home-intro">' + inlineLinks(home.intro, home.links) + '</p></div><figure class="portrait-wrap"><img class="portrait" src="' + safeURL(home.portrait) + '" alt="Portrait of ' + escapeHTML(data.meta.name) + '"><figcaption class="photo-credit">' + escapeHTML(home.photoCredit) + '</figcaption></figure></section></div>' +
      '<section class="section"><div class="shell home-grid"><div class="info-card"><p class="eyebrow">Contact</p><address class="address">' + home.address.map(escapeHTML).join("<br>") + '<br>Office ' + escapeHTML(home.office) + '</address><img class="email-image" src="' + safeURL(home.emailImage) + '" alt="Email address"></div>' +
      '<div class="info-card"><img class="entrance-image" src="' + safeURL(home.instituteImage) + '" alt="Entrance to the Institute for Theoretical Physics"><p class="small muted">' + escapeHTML(home.entranceNote) + "</p></div></div></section>";
  }

  function paperDialog(paper) {
    var links = [];
    if (paper.preprintPdf) links.push(link(paper.preprintPdf, "Download preprint PDF", "button"));
    if (paper.arxiv) links.push(link(paper.arxiv, "View on arXiv", "button"));
    if (paper.journalUrl) links.push(link(paper.journalUrl, "Open journal page", "button secondary"));
    var journalReference = paper.journal ? '<div class="dialog-journal"><strong>Journal reference</strong><span>' + escapeHTML(paper.journal) + '</span>' + (paper.doi ? '<small>DOI: ' + escapeHTML(paper.doi) + '</small>' : "") + '</div>' : "";
    return '<p class="dialog-kicker">Publication ' + escapeHTML(paper.number) + " · " + escapeHTML(paper.year) + '</p><h2 id="dialog-title">' + escapeHTML(paper.title) + '</h2><p class="dialog-byline">' + authorNames(paper.authors, true) + '</p>' + journalReference + '<p class="dialog-abstract">' + escapeHTML(paper.abstract || "Abstract not yet available.") + '</p><div class="dialog-links">' + links.join("") + "</div>";
  }

  function renderResearch() {
    var research = data.research;
    var papersByYear = {};
    research.papers.forEach(function (paper) {
      if (!papersByYear[paper.year]) papersByYear[paper.year] = [];
      papersByYear[paper.year].push(paper);
    });
    app.innerHTML = hero("", "Research", research.intro) +
      (research.showFunding !== false ? '<section class="section"><div class="shell"><div class="funding-card card"><div><p class="eyebrow">Research support</p><h2>ExBHGravRad</h2><p>' + escapeHTML(research.fundingText) + '</p><div class="button-row">' + link(research.fundingUrl, "About ERC Starting Grants", "button secondary") + '</div></div><img src="' + safeURL(research.fundingLogo) + '" alt="European Research Council"></div></div></section>' : "") +
      '<section class="section"><div class="shell"><div class="section-heading"><div><h2>Papers</h2></div></div>' +
      Object.keys(papersByYear).sort(function (a, b) { return b - a; }).map(function (year) {
        return '<h3 class="year-heading">' + year + '</h3><div class="paper-list">' + papersByYear[year].map(function (paper) {
          var index = research.papers.indexOf(paper);
          return '<button class="paper-card" type="button" data-paper="' + index + '"><span class="paper-number">#' + escapeHTML(paper.number) + '</span><span><h3>' + escapeHTML(paper.title) + '</h3><span class="paper-authors">' + authorNames(paper.authors, false) + '</span>' + (paper.journal ? '<span class="paper-reference">' + escapeHTML(paper.journal) + '</span>' : '<span class="paper-reference preprint">Preprint</span>') + '</span><span class="paper-action">Abstract ↗</span></button>';
        }).join("") + "</div>";
      }).join("") +
      ((research.reports || []).length ? '<h3 class="year-heading">Reports</h3><div class="paper-list">' + research.reports.map(function (report) { return '<article class="paper-card report-card"><span class="paper-number report-label">Oberwolfach Report</span><span><h3>' + link(report.url, report.title) + '</h3><span class="paper-authors">' + escapeHTML(report.description || "") + '</span></span></article>'; }).join("") + "</div>" : "") +
      "</div></section>";
    app.querySelectorAll("[data-paper]").forEach(function (button) {
      button.addEventListener("click", function () { openDialog(paperDialog(research.papers[Number(button.dataset.paper)]), button); });
    });
  }

  function renderTeaching() {
    var teaching = data.teaching;
    var years = {};
    teaching.courses.forEach(function (course) {
      if (!years[course.academicYear]) years[course.academicYear] = [];
      years[course.academicYear].push(course);
    });
    app.innerHTML = hero("", "Teaching", "") +
      '<section class="section"><div class="shell"><div class="section-heading"><div><h2>Lecture notes</h2></div></div><div class="note-grid">' + teaching.notes.map(function (note) {
        return '<article class="note-card card"><h3>' + escapeHTML(note.title) + '</h3>' + (note.detail ? '<p class="muted">' + escapeHTML(note.detail) + '</p>' : "") + link(note.file, "Open lecture notes", "button secondary") + "</article>";
      }).join("") + '</div></div></section><section class="section"><div class="shell"><div class="section-heading"><div><h2>Courses</h2></div></div><div class="course-years">' +
      Object.keys(years).map(function (year) { return '<section class="course-year"><h3>' + escapeHTML(year) + '</h3><div class="course-list">' + years[year].map(function (course) {
        return '<article class="course"><div><strong>' + escapeHTML(course.title) + '</strong><span>' + escapeHTML(course.term) + '</span></div><div class="course-links">' + (course.links || []).map(function (item) { return link(item.url, item.label, "button secondary"); }).join("") + "</div></article>";
      }).join("") + "</div></section>"; }).join("") + "</div></div></section>";
  }

  function renderActivities() {
    var activities = data.activities;
    var grouped = {};
    activities.invitedTalks.forEach(function (talk) {
      if (!grouped[talk.year]) grouped[talk.year] = [];
      grouped[talk.year].push(talk);
    });
    function feature(item) { return '<article class="feature-card card"><h3>' + (item.url ? link(item.url, item.title) : escapeHTML(item.title)) + '</h3><p>' + escapeHTML(item.description || "") + "</p></article>"; }
    app.innerHTML = hero("", "Activities", "") +
      '<section class="section"><div class="shell"><div class="section-heading"><div><h2>Seminars & workshops</h2></div></div><div class="feature-grid">' + activities.seminars.concat(activities.workshops).map(feature).join("") + '</div></div></section><section class="section"><div class="shell"><div class="section-heading"><div><h2>Invited talks</h2></div></div><div class="talk-archive-scroll" tabindex="0" role="region" aria-label="Scrollable invited talks archive"><div class="talk-groups">' +
      Object.keys(grouped).sort(function (a, b) { return b - a; }).map(function (year) { return '<section class="activity-year"><h3 class="year-heading">' + year + '</h3><div class="talk-list">' + grouped[year].map(function (talk) {
        var title = talk.url ? link(talk.url, talk.title) : escapeHTML(talk.title);
        return '<article class="activity-item"><h3>' + title + '</h3><p>' + escapeHTML([talk.place, talk.date].filter(Boolean).join(" · ")) + "</p></article>";
      }).join("") + "</div></section>"; }).join("") + "</div></div></div></section>";
  }

  function renderTeam() {
    var team = data.team;
    app.innerHTML = hero("", "Team", "") +
      '<section class="section"><div class="shell">' + team.groups.map(function (group) {
        var formerMembers = group.title.trim().toLowerCase() === "former members";
        return '<section class="people-section"><h2>' + escapeHTML(group.title) + '</h2><div class="people-grid">' + group.people.map(function (person) {
          var name = !formerMembers && person.url ? link(person.url, person.name) : escapeHTML(person.name);
          var note = person.note ? escapeHTML(person.note) : "";
          if (formerMembers && person.url) note += (note ? " · " : "") + link(person.url, "Thesis");
          return '<article class="person card"><h3>' + name + '</h3>' + (note ? '<p>' + note + "</p>" : "") + "</article>";
        }).join("") + "</div></section>";
      }).join("") + '</div></section><section class="section"><div class="shell"><h2>Open positions</h2><div class="info-card">' + (team.openings.url ? link(team.openings.url, team.openings.text) : escapeHTML(team.openings.text)) + "</div></div></section>";
  }

  function timeline(items) {
    return '<div class="timeline">' + items.map(function (item) {
      return '<article class="timeline-item"><div class="years">' + escapeHTML(item.years) + '</div><div class="timeline-copy"><h3>' + escapeHTML(item.title) + '</h3><p>' + escapeHTML(item.institution) + (item.detail ? " · " + (item.url ? link(item.url, item.detail) : escapeHTML(item.detail)) : "") + "</p></div></article>";
    }).join("") + "</div>";
  }

  function renderVita() {
    var vita = data.vita;
    app.innerHTML = hero("", "Vita", "") +
      '<section class="section"><div class="shell"><h2>Positions</h2>' + timeline(vita.positions) + '</div></section><section class="section"><div class="shell"><h2>Education</h2>' + timeline(vita.education) + '</div></section><section class="section vita-download"><div class="shell"><div class="button-row">' + link(vita.cvFile, vita.cvLabel, "button") + "</div></div></section>";
  }

  function talkDialog(talk) {
    var location = talkLocation(talk.location);
    return '<p class="dialog-kicker">' + escapeHTML(formatDate(talk.date)) + '</p><h2 id="dialog-title">' + escapeHTML(talk.title) + '</h2><p class="dialog-byline"><strong>' + escapeHTML(talk.speaker) + '</strong>' + (talk.affiliation ? " · " + escapeHTML(talk.affiliation) : "") + (location ? " · " + escapeHTML(location) : "") + '</p><p class="dialog-abstract">' + escapeHTML(talk.abstract || "No abstract is currently available.") + "</p>";
  }

  function renderSeminar() {
    var seminar = data.seminar;
    var organisers = seminar.organisers.map(function (person) { return person.url ? link(person.url, person.name) : escapeHTML(person.name); }).join(", ");
    app.innerHTML = hero("", seminar.title || "General Relativity & PDE Seminar", "") +
      '<section class="section"><div class="shell"><div class="seminar-meta"><div class="info-card"><strong>When</strong>' + escapeHTML(seminar.time) + '</div><div class="info-card"><strong>Where</strong>' + escapeHTML(seminar.location) + '</div><div class="info-card"><strong>Organisers</strong>' + organisers + '</div></div>' + (seminar.mailingList ? '<div class="mailing-callout card"><div><h2>Mailing list</h2><p>Receive announcements about upcoming speakers and talks.</p></div>' + link(seminar.mailingList, "Subscribe to mailing list", "button") + '</div>' : "") + '</div></section>' +
      '<section class="section"><div class="shell"><div class="section-heading"><div><h2>Schedule</h2></div></div><div class="calendar-frame"><iframe src="' + safeURL(monthCalendarURL(seminar.calendarEmbed)) + '" title="Leipzig General Relativity and PDE Seminar calendar" loading="lazy"></iframe><div class="calendar-fallback">' + link(seminar.calendarIcs, "Subscribe to the calendar") + '</div></div></div></section>' +
      '<section class="section"><div class="shell"><div class="section-heading"><div><h2>Recent & upcoming talks</h2></div></div><div class="paper-list">' + seminar.talks.map(function (talk, index) {
        var location = talkLocation(talk.location);
        var inner = '<span class="talk-date">' + escapeHTML(formatDate(talk.date)) + '</span><span><h3>' + escapeHTML(talk.title) + '</h3><p><strong>' + escapeHTML(talk.speaker) + '</strong>' + (talk.affiliation ? " · " + escapeHTML(talk.affiliation) : "") + (location ? " · " + escapeHTML(location) : "") + '</p></span><span class="abstract-label">' + (talk.abstract ? "Abstract ↗" : "Details") + "</span>";
        return talk.abstract ? '<button type="button" class="talk-card" data-talk="' + index + '">' + inner + "</button>" : '<article class="talk-card">' + inner + "</article>";
      }).join("") + '</div></div></section><section class="section"><div class="shell"><details><summary><strong>Talk archive, 2022–2024</strong></summary><ol class="archive-list">' + seminar.archive.map(function (item) { return "<li>" + escapeHTML(item) + "</li>"; }).join("") + "</ol></details></div></section>";
    app.querySelectorAll("[data-talk]").forEach(function (button) {
      button.addEventListener("click", function () { openDialog(talkDialog(seminar.talks[Number(button.dataset.talk)]), button); });
    });
  }

  applyTheme();
  renderChrome();
  ({ home: renderHome, research: renderResearch, teaching: renderTeaching, activities: renderActivities, team: renderTeam, vita: renderVita, seminar: renderSeminar }[page] || renderHome)();
})();
