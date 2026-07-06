import { computeChart } from "./chart";
import { computePanchang } from "./panchang";
const b = { year: 1990, month: 8, day: 15, hour: 14, minute: 30, tzOffsetHours: 5.5, latitude: 28.6139, longitude: 77.209 };
const chart = computeChart(b);
const wd = new Date(Date.UTC(1990, 7, 15)).getUTCDay();
console.log(JSON.stringify(computePanchang(chart, wd), null, 2));
