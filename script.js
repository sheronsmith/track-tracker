// Main script for the page

import {
    EVENTS,
    parseTime,
    formatTime,
    personalRecords,
    racesInYear,
    predictTime,
    goalSplits,
    sortByDate
} from "./track.js";


const STORAGE_KEY = "trackTrackerRaces";

let races = [];
let currentEvent = "800m";
let chart = null;


// Some made up races so people can see how it looks
const sampleRaces = [
    { date: "2026-03-14", meet: "Season Opener", event: "400m", time: 54.8 },
    { date: "2026-03-14", meet: "Season Opener", event: "800m", time: 127.4 },
    { date: "2026-03-28", meet: "Wofford Invitational", event: "800m", time: 124.9 },
    { date: "2026-04-04", meet: "Furman Classic", event: "Mile", time: 292.3 },
    { date: "2026-04-11", meet: "Converse Twilight", event: "400m", time: 53.6 },
    { date: "2026-04-11", meet: "Converse Twilight", event: "800m", time: 122.1 },
    { date: "2026-04-25", meet: "Conference Championships", event: "800m", time: 119.8 },
    { date: "2026-04-25", meet: "Conference Championships", event: "Mile", time: 284.6 },
    { date: "2026-05-09", meet: "Last Chance Meet", event: "400m", time: 52.9 },
    { date: "2026-05-09", meet: "Last Chance Meet", event: "800m", time: 118.4 }
];


// ---------- saving / loading ----------

function loadRaces() {
    let saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
        try {
            return JSON.parse(saved);
        } catch (err) {
            console.log("Could not read saved races", err);
        }
    }

    return [];
}

function saveRaces() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(races));
}

function makeId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}


// ---------- drawing the page ----------

function showPRs() {
    let prs = personalRecords(races);
    let thisYear = new Date().getFullYear();
    let seasonPRs = personalRecords(racesInYear(races, thisYear));

    let html = "";

    for (let event in EVENTS) {
        let pr = prs[event];
        let season = seasonPRs[event];

        html += '<div class="col-md-4 mb-3">';
        html += '  <div class="card pr-card">';
        html += '    <div class="card-body">';
        html += '      <div class="text-muted small">' + event + '</div>';

        if (pr) {
            html += '      <div class="pr-time">' + formatTime(pr.time) + '</div>';
            html += '      <div class="text-muted small">' + escapeHtml(pr.meet) + ' - ' + pr.date + '</div>';
        } else {
            html += '      <div class="pr-time">--</div>';
            html += '      <div class="text-muted small">No races yet</div>';
        }

        if (season) {
            html += '      <div class="season-best">Season best: ' + formatTime(season.time) + '</div>';
        }

        html += '    </div>';
        html += '  </div>';
        html += '</div>';
    }

    document.getElementById("prCards").innerHTML = html;
}


function showRaceLog() {
    let prs = personalRecords(races);
    let sorted = sortByDate(races).reverse();   // newest first
    let html = "";

    for (let race of sorted) {
        let isPR = prs[race.event] === race;

        html += "<tr>";
        html += "<td>" + race.date + "</td>";
        html += "<td>" + escapeHtml(race.meet) + "</td>";
        html += "<td>" + race.event + "</td>";
        html += "<td><b>" + formatTime(race.time) + "</b>" + (isPR ? '<span class="pr-badge">PR</span>' : "") + "</td>";
        html += '<td><button class="btn btn-sm btn-outline-danger" data-id="' + race.id + '">Delete</button></td>';
        html += "</tr>";
    }

    document.getElementById("raceRows").innerHTML = html;
    document.getElementById("logEmpty").style.display = sorted.length ? "none" : "block";
}


function showChart() {
    let data = [];

    for (let race of sortByDate(races)) {
        if (race.event === currentEvent) {
            data.push(race);
        }
    }

    document.getElementById("chartEmpty").style.display = data.length ? "none" : "block";

    let labels = data.map(function (r) { return r.date; });
    let times = data.map(function (r) { return r.time; });

    if (chart) {
        chart.destroy();
    }

    let ctx = document.getElementById("progressChart");

    chart = new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [{
                label: currentEvent,
                data: times,
                borderColor: "#0d6efd",
                backgroundColor: "rgba(13, 110, 253, 0.1)",
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function (item) {
                            return formatTime(item.parsed.y) + " - " + data[item.dataIndex].meet;
                        }
                    }
                }
            },
            scales: {
                y: {
                    reverse: true,   // faster = higher on the chart
                    ticks: {
                        callback: function (value) {
                            return formatTime(value);
                        }
                    }
                }
            }
        }
    });
}


function showSplits() {
    let goal = parseTime(document.getElementById("goalTime").value);
    let event = document.getElementById("goalEvent").value;
    let list = document.getElementById("splitList");

    if (!goal) {
        list.innerHTML = '<li class="list-group-item text-muted">Enter a goal time to see splits</li>';
        return;
    }

    let splits = goalSplits(goal, EVENTS[event]);
    let html = "";

    for (let split of splits) {
        html += '<li class="list-group-item"><span>' + split.meters + 'm</span><b>' + formatTime(split.seconds) + '</b></li>';
    }

    list.innerHTML = html;
}


function showPredictions() {
    let from = document.getElementById("predictFrom").value;
    let list = document.getElementById("predictList");
    let prs = personalRecords(races);
    let pr = prs[from];

    if (!pr) {
        list.innerHTML = '<li class="list-group-item text-muted">Add a ' + from + ' race first</li>';
        return;
    }

    let html = "";

    for (let event in EVENTS) {
        if (event === from) {
            continue;
        }

        let predicted = predictTime(pr.time, EVENTS[from], EVENTS[event]);
        html += '<li class="list-group-item"><span>' + event + '</span><b>' + formatTime(predicted) + '</b></li>';
    }

    list.innerHTML = html;
}


function refresh() {
    showPRs();
    showRaceLog();
    showChart();
    showSplits();
    showPredictions();
}


// so people can't put html tags in the meet name
function escapeHtml(text) {
    let div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}


// ---------- button clicks and form stuff ----------

document.getElementById("raceForm").addEventListener("submit", function (e) {
    e.preventDefault();

    let timeText = document.getElementById("timeInput").value;
    let time = parseTime(timeText);
    let errorBox = document.getElementById("formError");

    if (time === null) {
        errorBox.textContent = "That time doesn't look right. Try 52.3 or 1:58.4";
        return;
    }

    errorBox.textContent = "";

    races.push({
        id: makeId(),
        date: document.getElementById("dateInput").value,
        meet: document.getElementById("meetInput").value.trim(),
        event: document.getElementById("eventInput").value,
        time: time
    });

    saveRaces();

    document.getElementById("meetInput").value = "";
    document.getElementById("timeInput").value = "";

    refresh();
});


document.getElementById("raceRows").addEventListener("click", function (e) {
    let id = e.target.getAttribute("data-id");

    if (!id) {
        return;
    }

    races = races.filter(function (r) { return r.id !== id; });
    saveRaces();
    refresh();
});


document.getElementById("chartTabs").addEventListener("click", function (e) {
    let btn = e.target.closest("button");

    if (!btn) {
        return;
    }

    currentEvent = btn.getAttribute("data-event");

    let buttons = document.querySelectorAll("#chartTabs button");
    for (let b of buttons) {
        b.classList.remove("active");
    }
    btn.classList.add("active");

    showChart();
});


document.getElementById("loadSampleBtn").addEventListener("click", function () {
    races = [];

    for (let r of sampleRaces) {
        races.push({
            id: makeId(),
            date: r.date,
            meet: r.meet,
            event: r.event,
            time: r.time
        });
    }

    saveRaces();
    refresh();
});


document.getElementById("clearBtn").addEventListener("click", function () {
    if (confirm("Delete every race?")) {
        races = [];
        saveRaces();
        refresh();
    }
});


document.getElementById("goalTime").addEventListener("input", showSplits);
document.getElementById("goalEvent").addEventListener("change", showSplits);
document.getElementById("predictFrom").addEventListener("change", showPredictions);


// ---------- start up ----------

races = loadRaces();

// add ?demo to the url to see it with example data
if (window.location.search.includes("demo") && races.length === 0) {
    for (let r of sampleRaces) {
        races.push({ id: makeId(), date: r.date, meet: r.meet, event: r.event, time: r.time });
    }
    document.getElementById("goalTime").value = "1:55";
}

// default the date to today
document.getElementById("dateInput").value = new Date().toISOString().slice(0, 10);

refresh();
