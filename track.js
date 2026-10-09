// Helper functions for Track Tracker
// Kept separate from the page stuff so I can test them with node

export const EVENTS = {
    "400m": 400,
    "800m": 800,
    "Mile": 1609
};


// Turns "1:58.4" into seconds (118.4)
// Also works with just seconds like "52.3"
export function parseTime(text) {

    if (typeof text !== "string") {
        return null;
    }

    text = text.trim();

    // has to look like 52.3 or 1:58.4
    if (!/^(\d+:)?\d+(\.\d+)?$/.test(text)) {
        return null;
    }

    let parts = text.split(":");

    if (parts.length === 1) {
        return Number(parts[0]);
    }

    let minutes = Number(parts[0]);
    let seconds = Number(parts[1]);

    if (seconds >= 60) {
        return null;
    }

    return minutes * 60 + seconds;
}


// Turns seconds back into something readable like "1:58.40"
export function formatTime(seconds) {

    if (seconds === null || seconds === undefined || isNaN(seconds)) {
        return "--";
    }

    let minutes = Math.floor(seconds / 60);
    let secs = seconds - minutes * 60;

    if (minutes > 0) {
        // pad so 1:5.2 shows as 1:05.20
        let secText = secs.toFixed(2);
        if (secs < 10) {
            secText = "0" + secText;
        }
        return minutes + ":" + secText;
    }

    return secs.toFixed(2);
}


// Finds the fastest race for each event
export function personalRecords(races) {

    let best = {};

    for (let i = 0; i < races.length; i++) {
        let race = races[i];
        let current = best[race.event];

        if (!current || race.time < current.time) {
            best[race.event] = race;
        }
    }

    return best;
}


// Only the races from one year
export function racesInYear(races, year) {

    let result = [];

    for (let race of races) {
        let raceYear = new Date(race.date).getFullYear();
        if (raceYear === year) {
            result.push(race);
        }
    }

    return result;
}


// Riegel formula - runners use this to guess times in other events
// T2 = T1 * (D2 / D1) ^ 1.06
export function predictTime(knownSeconds, knownMeters, targetMeters) {

    if (!knownSeconds || !knownMeters || !targetMeters) {
        return null;
    }

    return knownSeconds * Math.pow(targetMeters / knownMeters, 1.06);
}


// Even splits for a goal time
// 800m in 2:00 -> 100m 15.0, 200m 30.0, 400m 60.0
export function goalSplits(goalSeconds, eventMeters) {

    if (!goalSeconds || !eventMeters) {
        return [];
    }

    let pacePerMeter = goalSeconds / eventMeters;
    let splits = [];

    for (let distance of [100, 200, 400]) {
        if (distance < eventMeters) {
            splits.push({
                meters: distance,
                seconds: pacePerMeter * distance
            });
        }
    }

    return splits;
}


// Oldest race first
export function sortByDate(races) {

    let copy = races.slice();

    copy.sort(function (a, b) {
        return new Date(a.date) - new Date(b.date);
    });

    return copy;
}
