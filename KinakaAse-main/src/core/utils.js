import { Platform } from "react-native"
import ProfileImage from '../assets/profile.png'
import { ADDRESS } from "./api"

function log() {
	// Much better console.log function that formats/indents
	// objects for better reabability
	for (let i = 0; i < arguments.length; i++) {
		let arg = arguments[i]
		// Stringify and indent object
		if (typeof arg === 'object') {
			arg = JSON.stringify(arg, null, 2)
		}
		console.log(`[${Platform.OS}]`, arg)
	}
}

function thumbnail(url) {
	if (!url) {
		return ProfileImage
	}
	return {
		uri: 'https://' + ADDRESS + url
	}
}


function formatTime(date) {
	if (date === null) {
		return '-'
	}
	const now = new Date()
	const s = Math.abs(now - new Date(date)) / 1000
	// Seconds
	if (s < 60) {
		return 'now'
	}
	// Minutes
	if (s < 60 * 60) {
		const m = Math.floor(s / 60)
		return `${m}m ago`
	}
	// Hours
	if (s < 60 * 60 * 24) {
		const h = Math.floor(s / (60 * 60))
		return `${h}h ago`
	}
	// Days
	if (s < 60 * 60 * 24 * 7) {
		const d = Math.floor(s / (60 * 60 * 24))
		return `${d}d ago`
	}
	// Weeks
	if (s < 60 * 60 * 24 * 7 * 4) {
		const w = Math.floor(s / (60 * 60 * 24 * 7))
		return `${w}w ago`
	}
	// Years
	const y = Math.floor(s / (60 * 60 * 24 * 365))
	return `${y}y ago`
}

function formatTimeChat(isoString) {
	const date = new Date(isoString);

	let hours = date.getHours(); // Get hours in 24-hour format
	const minutes = date.getMinutes(); // Get minutes
	const ampm = hours >= 12 ? 'PM' : 'AM'; // Determine AM/PM

	hours = hours % 12; // Convert to 12-hour format
	hours = hours || 12; // Replace 0 with 12 for midnight

	const formattedMinutes = minutes.toString().padStart(2, '0'); // Pad single-digit minutes with a leading zero

	return `${hours}:${formattedMinutes} ${ampm}`;
}


function formatTimeDays(isoString) {
    // Parse ISO string into a Date object
    const dateObjectUTC = new Date(isoString);

    // Convert UTC to IST by adding 5 hours and 30 minutes
    const istOffset = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in milliseconds
    const dateObjectIST = new Date(dateObjectUTC.getTime() + istOffset);

    // Get the current date and time in IST
    const nowUTC = new Date();
    const nowIST = new Date(nowUTC.getTime() + istOffset);

    // Extract date components for comparison
    const dateIST = new Date(dateObjectIST.getUTCFullYear(), dateObjectIST.getUTCMonth(), dateObjectIST.getUTCDate());
    const todayIST = new Date(nowIST.getUTCFullYear(), nowIST.getUTCMonth(), nowIST.getUTCDate());

    // Calculate the difference in days
    const timeDifference = todayIST - dateIST;

    const oneDay = 24 * 60 * 60 * 1000;
    const daysDifference = Math.floor(timeDifference / oneDay);

    // Determine the output based on the date difference
    if (daysDifference === 0) {
        return "Today";
    } else if (daysDifference === 1) {
        return "Yesterday";
    } else if (daysDifference < 7) {
        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const result = dayNames[dateIST.getDay()];
        return result;
    }

    // If more than 7 days, format as "January 7, 2025"
    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    const day = dateIST.getDate();
    const month = monthNames[dateIST.getMonth()];
    const year = dateIST.getFullYear();

    const result = `${month} ${day}, ${year}`;
    return result;
}

export default { log, thumbnail, formatTime, formatTimeChat, formatTimeDays }