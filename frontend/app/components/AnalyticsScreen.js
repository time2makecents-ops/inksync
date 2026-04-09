"use client";

import { useRouter } from "next/navigation";
import { navigateBackWithinApp } from "../../lib/navigation";
import { useEffect, useMemo, useState } from "react";

const ANALYTICS_DATA = {
  Today: {
    kpis: [
      { label: "Sessions", value: "7", accent: "#69a9ff" },
      { label: "Avg Score", value: "9.2M", accent: "#42d392" },
      { label: "Top Issue", value: "Control", accent: "#f5a524" },
    ],
    trends: [
      { label: "Shot Accuracy", value: "72%", change: "+4% vs yesterday" },
      { label: "Control Errors", value: "9", change: "late-ball drains" },
      { label: "Strategy Mistakes", value: "3", change: "mostly rushed mode starts" },
    ],
    axis: [
      { label: "Game 1", detail: "Game 1 detail" },
      { label: "Game 3", detail: "Game 3 detail" },
      { label: "Game 5", detail: "Game 5 detail" },
      { label: "Game 7", detail: "Game 7 detail" },
    ],
    blueLine: { left: 18, top: 68, width: 186, rotate: -22 },
    greenLine: { left: 22, top: 52, width: 178, rotate: -4 },
    markers: [
      {
        id: "today-1",
        left: 38,
        top: 72,
        title: "Game 1",
        summary: "Started on Godzilla. Control lapses showed up immediately on Ball 1.",
      },
      {
        id: "today-2",
        left: 126,
        top: 52,
        title: "Game 4",
        summary: "Best mid-session recovery. Shot misses dropped after settling in.",
      },
      {
        id: "today-3",
        left: 210,
        top: 36,
        title: "Game 7",
        summary: "Latest game on Iron Maiden. Main issue was late right-orbit control.",
      },
    ],
    detailViews: {
      "Game 1 detail": {
        title: "Game 1",
        subtitle: "Ball-by-ball control trend",
        axis: ["Ball 1", "Ball 2", "Ball 3", "End"],
        blueLine: { left: 18, top: 62, width: 182, rotate: -20 },
        greenLine: { left: 18, top: 48, width: 178, rotate: 10 },
      },
      "Game 3 detail": {
        title: "Game 3",
        subtitle: "Scoring pace against mistake rate",
        axis: ["Start", "Mid", "Mode", "Finish"],
        blueLine: { left: 18, top: 58, width: 184, rotate: -10 },
        greenLine: { left: 18, top: 44, width: 180, rotate: -2 },
      },
      "Game 5 detail": {
        title: "Game 5",
        subtitle: "Middle stretch confidence check",
        axis: ["Ball 1", "Ball 2", "Ball 3", "Ball 4"],
        blueLine: { left: 20, top: 60, width: 178, rotate: -14 },
        greenLine: { left: 24, top: 46, width: 170, rotate: 5 },
      },
      "Game 7 detail": {
        title: "Game 7",
        subtitle: "Latest measured trend",
        axis: ["Ball 1", "Ball 2", "Ball 3", "End"],
        blueLine: { left: 22, top: 56, width: 170, rotate: -6 },
        greenLine: { left: 24, top: 42, width: 166, rotate: 2 },
      },
    },
  },
  Week: {
    kpis: [
      { label: "Sessions", value: "6", accent: "#69a9ff" },
      { label: "Avg Score", value: "8.1M", accent: "#42d392" },
      { label: "Top Issue", value: "Shot Miss", accent: "#f5a524" },
    ],
    trends: [
      { label: "Shot Accuracy", value: "68%", change: "+6% this week" },
      { label: "Control Errors", value: "12", change: "-3 this week" },
      { label: "Strategy Mistakes", value: "5", change: "steady" },
    ],
    axis: [
      { label: "Mar 23", detail: "Mar 23 detail" },
      { label: "Mar 25", detail: "Mar 25 detail" },
      { label: "Mar 27", detail: "Mar 27 detail" },
      { label: "Mar 29", detail: "Mar 29 detail" },
    ],
    blueLine: { left: 18, top: 60, width: 170, rotate: -15 },
    greenLine: { left: 26, top: 44, width: 162, rotate: 9 },
    markers: [
      {
        id: "week-1",
        left: 52,
        top: 56,
        title: "Mar 24",
        summary: "Shot Miss and control lapse after right orbit.",
      },
      {
        id: "week-2",
        left: 126,
        top: 34,
        title: "Mar 27",
        summary: "Ignored multiplier setup and missed left ramp twice.",
      },
      {
        id: "week-3",
        left: 198,
        top: 28,
        title: "Mar 29",
        summary: "One missed trap and one early multiball decision.",
      },
    ],
    detailViews: {
      "Mar 23 detail": {
        title: "Mar 23",
        subtitle: "Session breakdown for the first tracked day",
        axis: ["Start", "Mid", "Late", "End"],
        blueLine: { left: 18, top: 68, width: 176, rotate: -12 },
        greenLine: { left: 22, top: 54, width: 170, rotate: 6 },
      },
      "Mar 25 detail": {
        title: "Mar 25",
        subtitle: "Control trend across the session",
        axis: ["Ball 1", "Ball 2", "Ball 3", "Finish"],
        blueLine: { left: 18, top: 62, width: 182, rotate: -18 },
        greenLine: { left: 18, top: 50, width: 176, rotate: 8 },
      },
      "Mar 27 detail": {
        title: "Mar 27",
        subtitle: "Sharpest improvement day this week",
        axis: ["Open", "Mode", "Recovery", "End"],
        blueLine: { left: 18, top: 56, width: 186, rotate: -8 },
        greenLine: { left: 18, top: 40, width: 182, rotate: 2 },
      },
      "Mar 29 detail": {
        title: "Mar 29",
        subtitle: "Latest session detail",
        axis: ["Warmup", "Game 1", "Game 2", "Now"],
        blueLine: { left: 20, top: 60, width: 180, rotate: -14 },
        greenLine: { left: 22, top: 42, width: 174, rotate: 10 },
      },
    },
  },
  Month: {
    kpis: [
      { label: "Sessions", value: "18", accent: "#69a9ff" },
      { label: "Avg Score", value: "7.6M", accent: "#42d392" },
      { label: "Top Issue", value: "Control", accent: "#f5a524" },
    ],
    trends: [
      { label: "Shot Accuracy", value: "64%", change: "+9% this month" },
      { label: "Control Errors", value: "54", change: "-11 this month" },
      { label: "Strategy Mistakes", value: "19", change: "down from last month" },
    ],
    axis: [
      { label: "Week 1", detail: "Week 1 detail" },
      { label: "Week 2", detail: "Week 2 detail" },
      { label: "Week 3", detail: "Week 3 detail" },
      { label: "Week 4", detail: "Week 4 detail" },
    ],
    blueLine: { left: 18, top: 66, width: 182, rotate: -20 },
    greenLine: { left: 20, top: 54, width: 178, rotate: -4 },
    markers: [
      {
        id: "month-1",
        left: 42,
        top: 63,
        title: "Week 1",
        summary: "Heavy shot-miss cluster on Iron Maiden.",
      },
      {
        id: "month-2",
        left: 120,
        top: 48,
        title: "Week 3",
        summary: "Control mistakes dropped, strategy mistakes stayed flat.",
      },
      {
        id: "month-3",
        left: 210,
        top: 30,
        title: "Week 4",
        summary: "Best scoring stretch, but control errors remain top issue.",
      },
    ],
    detailViews: {
      "Week 1 detail": {
        title: "Week 1",
        subtitle: "Early month session mix",
        axis: ["Mon", "Wed", "Fri", "Sun"],
        blueLine: { left: 18, top: 70, width: 176, rotate: -16 },
        greenLine: { left: 22, top: 58, width: 170, rotate: 0 },
      },
      "Week 2 detail": {
        title: "Week 2",
        subtitle: "Recovery week after heavy shot misses",
        axis: ["Mon", "Wed", "Fri", "Sun"],
        blueLine: { left: 18, top: 64, width: 180, rotate: -10 },
        greenLine: { left: 20, top: 52, width: 176, rotate: 6 },
      },
      "Week 3 detail": {
        title: "Week 3",
        subtitle: "Largest control improvement stretch",
        axis: ["Mon", "Wed", "Fri", "Sun"],
        blueLine: { left: 18, top: 58, width: 186, rotate: -8 },
        greenLine: { left: 18, top: 44, width: 182, rotate: 4 },
      },
      "Week 4 detail": {
        title: "Week 4",
        subtitle: "Strongest scoring week so far",
        axis: ["Mon", "Wed", "Fri", "Sun"],
        blueLine: { left: 18, top: 54, width: 188, rotate: -4 },
        greenLine: { left: 18, top: 40, width: 184, rotate: 3 },
      },
    },
  },
  Lifetime: {
    kpis: [
      { label: "Sessions", value: "54", accent: "#69a9ff" },
      { label: "Avg Score", value: "6.9M", accent: "#42d392" },
      { label: "Top Issue", value: "Strategy", accent: "#f5a524" },
    ],
    trends: [
      { label: "Shot Accuracy", value: "59%", change: "overall average" },
      { label: "Control Errors", value: "214", change: "career total tracked" },
      { label: "Strategy Mistakes", value: "87", change: "career total tracked" },
    ],
    axis: [
      { label: "Start", detail: "Start detail" },
      { label: "Month 3", detail: "Month 3 detail" },
      { label: "Month 6", detail: "Month 6 detail" },
      { label: "Today", detail: "Today detail" },
    ],
    blueLine: { left: 16, top: 70, width: 192, rotate: -22 },
    greenLine: { left: 16, top: 58, width: 188, rotate: -12 },
    markers: [
      {
        id: "life-1",
        left: 34,
        top: 70,
        title: "Start",
        summary: "Frequent drains after uncontrolled feeds.",
      },
      {
        id: "life-2",
        left: 112,
        top: 54,
        title: "Month 3",
        summary: "Shot consistency improved; strategy mistakes became more visible.",
      },
      {
        id: "life-3",
        left: 208,
        top: 32,
        title: "Today",
        summary: "Best accuracy so far, with strategy now the main coaching focus.",
      },
    ],
    detailViews: {
      "Start detail": {
        title: "Start",
        subtitle: "Earliest tracked performance trend",
        axis: ["Start", "Ball 1", "Ball 2", "Finish"],
        blueLine: { left: 18, top: 76, width: 170, rotate: -18 },
        greenLine: { left: 22, top: 64, width: 166, rotate: -6 },
      },
      "Month 3 detail": {
        title: "Month 3",
        subtitle: "Midpoint improvement snapshot",
        axis: ["Open", "Mid", "Late", "End"],
        blueLine: { left: 18, top: 64, width: 180, rotate: -12 },
        greenLine: { left: 18, top: 52, width: 176, rotate: 3 },
      },
      "Month 6 detail": {
        title: "Month 6",
        subtitle: "Long-run consistency check",
        axis: ["Week 1", "Week 2", "Week 3", "Week 4"],
        blueLine: { left: 18, top: 58, width: 186, rotate: -6 },
        greenLine: { left: 18, top: 46, width: 182, rotate: 5 },
      },
      "Today detail": {
        title: "Today",
        subtitle: "Latest overall checkpoint",
        axis: ["Warmup", "Game 1", "Game 2", "Now"],
        blueLine: { left: 18, top: 54, width: 188, rotate: -4 },
        greenLine: { left: 18, top: 40, width: 184, rotate: 4 },
      },
    },
  },
};

const TODAY_GAMES = [
  {
    id: "game-1",
    label: "Game 1",
    machine: "Godzilla",
    balls: [
      {
        key: "ball-1",
        label: "Ball 1",
        subtitle: "Shaky control start with two building shot misses.",
        axis: ["Launch", "Trap", "Mid", "Drain"],
        blueLine: { left: 18, top: 70, width: 178, rotate: -20 },
        greenLine: { left: 18, top: 54, width: 172, rotate: -6 },
      },
      {
        key: "ball-2",
        label: "Ball 2",
        subtitle: "Recovered pace after a cleaner feed from the pops.",
        axis: ["Start", "Control", "Mode", "End"],
        blueLine: { left: 18, top: 62, width: 180, rotate: -12 },
        greenLine: { left: 18, top: 46, width: 176, rotate: 4 },
      },
      {
        key: "ball-3",
        label: "Ball 3",
        subtitle: "Best scoring ball, but one missed trap ended the run.",
        axis: ["Open", "Flow", "Stack", "Finish"],
        blueLine: { left: 18, top: 56, width: 184, rotate: -8 },
        greenLine: { left: 18, top: 40, width: 178, rotate: 8 },
      },
    ],
    end: {
      label: "End",
      subtitle: "Game 1 summary: control was the main blocker and cost the best scoring chances.",
      axis: ["Ball 1", "Ball 2", "Ball 3", "Total"],
      blueLine: { left: 18, top: 60, width: 184, rotate: -10 },
      greenLine: { left: 18, top: 44, width: 178, rotate: 6 },
    },
  },
  {
    id: "game-2",
    label: "Game 2",
    machine: "Jurassic Park",
    balls: [
      {
        key: "ball-1",
        label: "Ball 1",
        subtitle: "Missed truck shot twice before settling in.",
        axis: ["Launch", "Truck", "Control", "Drain"],
        blueLine: { left: 18, top: 68, width: 176, rotate: -18 },
        greenLine: { left: 18, top: 52, width: 170, rotate: -2 },
      },
      {
        key: "ball-2",
        label: "Ball 2",
        subtitle: "Cleaner truck control and better feed management.",
        axis: ["Start", "Loop", "Truck", "End"],
        blueLine: { left: 18, top: 60, width: 180, rotate: -10 },
        greenLine: { left: 18, top: 46, width: 174, rotate: 2 },
      },
      {
        key: "ball-3",
        label: "Ball 3",
        subtitle: "Strongest strategy ball, but one failed live catch ended it.",
        axis: ["Open", "Build", "Recover", "Finish"],
        blueLine: { left: 18, top: 54, width: 182, rotate: -6 },
        greenLine: { left: 18, top: 40, width: 176, rotate: 5 },
      },
      {
        key: "ball-4",
        label: "Ball 4",
        subtitle: "Extra ball kept the session alive and added one clean truck sequence.",
        axis: ["Extra", "Setup", "Truck", "End"],
        blueLine: { left: 18, top: 58, width: 184, rotate: -8 },
        greenLine: { left: 18, top: 42, width: 178, rotate: 3 },
      },
    ],
    end: {
      label: "End",
      subtitle: "Game 2 summary: truck shot timing improved, but live-catch control is still leaking value.",
      axis: ["Ball 1", "Ball 2", "Ball 3", "Ball 4"],
      blueLine: { left: 18, top: 58, width: 186, rotate: -8 },
      greenLine: { left: 18, top: 42, width: 180, rotate: 4 },
    },
  },
  {
    id: "game-3",
    label: "Game 3",
    machine: "Twilight Zone",
    balls: [
      {
        key: "ball-1",
        label: "Ball 1",
        subtitle: "Powerball feed control was shaky off the plunge.",
        axis: ["Plunge", "Feed", "Loop", "Drain"],
        blueLine: { left: 18, top: 66, width: 180, rotate: -14 },
        greenLine: { left: 18, top: 50, width: 174, rotate: -2 },
      },
      {
        key: "ball-2",
        label: "Ball 2",
        subtitle: "Best shot rhythm of the session so far.",
        axis: ["Start", "Lane", "Mode", "End"],
        blueLine: { left: 18, top: 56, width: 184, rotate: -6 },
        greenLine: { left: 18, top: 40, width: 178, rotate: 6 },
      },
      {
        key: "ball-3",
        label: "Ball 3",
        subtitle: "Rushed trap setup cut off a strong scoring build.",
        axis: ["Open", "Flow", "Stack", "Finish"],
        blueLine: { left: 18, top: 60, width: 182, rotate: -8 },
        greenLine: { left: 18, top: 44, width: 176, rotate: 2 },
      },
    ],
    end: {
      label: "End",
      subtitle: "Game 3 summary: shot quality was strong, but rushed control decisions still cost finishes.",
      axis: ["Ball 1", "Ball 2", "Ball 3", "Total"],
      blueLine: { left: 18, top: 58, width: 184, rotate: -8 },
      greenLine: { left: 18, top: 40, width: 178, rotate: 5 },
    },
  },
  {
    id: "game-4",
    label: "Game 4",
    machine: "Deadpool",
    balls: [
      {
        key: "ball-1",
        label: "Ball 1",
        subtitle: "Early katana misses, then a clean recovery.",
        axis: ["Start", "Katana", "Recover", "Drain"],
        blueLine: { left: 18, top: 70, width: 176, rotate: -18 },
        greenLine: { left: 18, top: 54, width: 170, rotate: -4 },
      },
      {
        key: "ball-2",
        label: "Ball 2",
        subtitle: "Best ball on Deadpool with clean left orbit control.",
        axis: ["Open", "Orbit", "Mode", "End"],
        blueLine: { left: 18, top: 54, width: 184, rotate: -4 },
        greenLine: { left: 18, top: 38, width: 178, rotate: 7 },
      },
      {
        key: "ball-3",
        label: "Ball 3",
        subtitle: "Control dropped late and forced a rushed finish.",
        axis: ["Start", "Mid", "Late", "Finish"],
        blueLine: { left: 18, top: 60, width: 182, rotate: -10 },
        greenLine: { left: 18, top: 44, width: 176, rotate: 2 },
      },
    ],
    end: {
      label: "End",
      subtitle: "Game 4 summary: recovery was strong in the middle, but late-ball control still slipped.",
      axis: ["Ball 1", "Ball 2", "Ball 3", "Total"],
      blueLine: { left: 18, top: 58, width: 184, rotate: -9 },
      greenLine: { left: 18, top: 42, width: 178, rotate: 4 },
    },
  },
  {
    id: "game-5",
    label: "Game 5",
    machine: "Foo Fighters",
    balls: [
      {
        key: "ball-1",
        label: "Ball 1",
        subtitle: "Upper-flipper control was late on the first feed.",
        axis: ["Launch", "Feed", "Upper", "Drain"],
        blueLine: { left: 18, top: 72, width: 176, rotate: -18 },
        greenLine: { left: 18, top: 56, width: 170, rotate: -5 },
      },
      {
        key: "ball-2",
        label: "Ball 2",
        subtitle: "Cleaner handoff into upper-flipper shots.",
        axis: ["Start", "Transfer", "Shot", "End"],
        blueLine: { left: 18, top: 60, width: 182, rotate: -10 },
        greenLine: { left: 18, top: 44, width: 176, rotate: 3 },
      },
      {
        key: "ball-3",
        label: "Ball 3",
        subtitle: "Good pace until one rushed orbit feed ended the ball.",
        axis: ["Open", "Orbit", "Build", "Finish"],
        blueLine: { left: 18, top: 56, width: 184, rotate: -6 },
        greenLine: { left: 18, top: 40, width: 178, rotate: 6 },
      },
      {
        key: "ball-4",
        label: "Ball 4",
        subtitle: "Extra ball turned into a short but clean upper-flipper run.",
        axis: ["Extra", "Build", "Shot", "End"],
        blueLine: { left: 18, top: 58, width: 186, rotate: -7 },
        greenLine: { left: 18, top: 42, width: 180, rotate: 4 },
      },
    ],
    end: {
      label: "End",
      subtitle: "Game 5 summary: upper-flipper control improved, with one late feed still costing position.",
      axis: ["Ball 1", "Ball 2", "Ball 3", "Ball 4"],
      blueLine: { left: 18, top: 58, width: 186, rotate: -8 },
      greenLine: { left: 18, top: 40, width: 180, rotate: 5 },
    },
  },
  {
    id: "game-6",
    label: "Game 6",
    machine: "Jurassic Park",
    balls: [
      {
        key: "ball-1",
        label: "Ball 1",
        subtitle: "Truck shot was late again on the opening ball.",
        axis: ["Launch", "Truck", "Control", "Drain"],
        blueLine: { left: 18, top: 70, width: 178, rotate: -18 },
        greenLine: { left: 18, top: 54, width: 172, rotate: -4 },
      },
      {
        key: "ball-2",
        label: "Ball 2",
        subtitle: "Best truck-to-control sequence of the session.",
        axis: ["Start", "Truck", "Recover", "End"],
        blueLine: { left: 18, top: 56, width: 184, rotate: -6 },
        greenLine: { left: 18, top: 40, width: 178, rotate: 6 },
      },
      {
        key: "ball-3",
        label: "Ball 3",
        subtitle: "One failed live catch erased a strong setup.",
        axis: ["Open", "Catch", "Mode", "Finish"],
        blueLine: { left: 18, top: 60, width: 182, rotate: -8 },
        greenLine: { left: 18, top: 44, width: 176, rotate: 2 },
      },
      {
        key: "ball-4",
        label: "Ball 4",
        subtitle: "Final extra ball was short but cleaner than Ball 1.",
        axis: ["Extra", "Truck", "Save", "End"],
        blueLine: { left: 18, top: 62, width: 184, rotate: -9 },
        greenLine: { left: 18, top: 46, width: 178, rotate: 2 },
      },
      {
        key: "ball-5",
        label: "Ball 5",
        subtitle: "Last extra ball kept the truck shot controlled but brief.",
        axis: ["Extra", "Setup", "Truck", "Drain"],
        blueLine: { left: 18, top: 64, width: 182, rotate: -10 },
        greenLine: { left: 18, top: 48, width: 176, rotate: 1 },
      },
    ],
    end: {
      label: "End",
      subtitle: "Game 6 summary: extra balls extended the game, but live-catch misses remained the key issue.",
      axis: ["B1", "B2", "B3", "B4-5"],
      blueLine: { left: 18, top: 58, width: 186, rotate: -8 },
      greenLine: { left: 18, top: 42, width: 180, rotate: 4 },
    },
  },
  {
    id: "game-7",
    label: "Game 7",
    machine: "Iron Maiden",
    balls: [
      {
        key: "ball-1",
        label: "Ball 1",
        subtitle: "Missed left ramp twice before settling the feed.",
        axis: ["Launch", "Ramp", "Orbit", "Drain"],
        blueLine: { left: 18, top: 72, width: 178, rotate: -20 },
        greenLine: { left: 18, top: 56, width: 172, rotate: -6 },
      },
      {
        key: "ball-2",
        label: "Ball 2",
        subtitle: "Strongest rhythm on the machine, with one missed orbit late.",
        axis: ["Open", "Ramp", "Control", "End"],
        blueLine: { left: 18, top: 56, width: 184, rotate: -6 },
        greenLine: { left: 18, top: 40, width: 178, rotate: 6 },
      },
      {
        key: "ball-3",
        label: "Ball 3",
        subtitle: "Late right-orbit control slipped and ended the game.",
        axis: ["Start", "Orbit", "Trap", "Finish"],
        blueLine: { left: 18, top: 62, width: 182, rotate: -10 },
        greenLine: { left: 18, top: 46, width: 176, rotate: 2 },
      },
    ],
    end: {
      label: "End",
      subtitle: "Game 7 summary: best scoring pace on Iron Maiden, but right-orbit control still ended the run early.",
      axis: ["Ball 1", "Ball 2", "Ball 3", "Total"],
      blueLine: { left: 18, top: 58, width: 186, rotate: -8 },
      greenLine: { left: 18, top: 42, width: 180, rotate: 4 },
    },
  },
];

const TODAY_NOW_DETAIL = {
  title: "Now",
  machine: "Iron Maiden",
  subtitle: "Current live snapshot across the active session.",
  axis: ["-15m", "-10m", "-5m", "Now"],
  blueLine: { left: 18, top: 62, width: 184, rotate: -8 },
  greenLine: { left: 18, top: 46, width: 178, rotate: 4 },
};

const WEEK_DATES = [
  { label: "Mar 23", detail: "Mar 23 detail" },
  { label: "Mar 24", detail: "Mar 24 detail" },
  { label: "Mar 25", detail: "Mar 25 detail" },
  { label: "Mar 26", detail: "Mar 26 detail" },
  { label: "Mar 27", detail: "Mar 27 detail" },
  { label: "Mar 28", detail: "Mar 28 detail" },
  { label: "Mar 29", detail: "Mar 29 detail" },
];

const MONTH_WEEK_DATES = {
  "Week 1 detail": [
    { label: "Mar 3", detail: "Mar 3 detail" },
    { label: "Mar 4", detail: "Mar 4 detail" },
    { label: "Mar 5", detail: "Mar 5 detail" },
    { label: "Mar 6", detail: "Mar 6 detail" },
    { label: "Mar 7", detail: "Mar 7 detail" },
    { label: "Mar 8", detail: "Mar 8 detail" },
    { label: "Mar 9", detail: "Mar 9 detail" },
  ],
  "Week 2 detail": [
    { label: "Mar 10", detail: "Mar 10 detail" },
    { label: "Mar 11", detail: "Mar 11 detail" },
    { label: "Mar 12", detail: "Mar 12 detail" },
    { label: "Mar 13", detail: "Mar 13 detail" },
    { label: "Mar 14", detail: "Mar 14 detail" },
    { label: "Mar 15", detail: "Mar 15 detail" },
    { label: "Mar 16", detail: "Mar 16 detail" },
  ],
  "Week 3 detail": [
    { label: "Mar 17", detail: "Mar 17 detail" },
    { label: "Mar 18", detail: "Mar 18 detail" },
    { label: "Mar 19", detail: "Mar 19 detail" },
    { label: "Mar 20", detail: "Mar 20 detail" },
    { label: "Mar 21", detail: "Mar 21 detail" },
    { label: "Mar 22", detail: "Mar 22 detail" },
    { label: "Mar 23", detail: "Mar 23 detail" },
  ],
  "Week 4 detail": [
    { label: "Mar 24", detail: "Mar 24 detail" },
    { label: "Mar 25", detail: "Mar 25 detail" },
    { label: "Mar 26", detail: "Mar 26 detail" },
    { label: "Mar 27", detail: "Mar 27 detail" },
    { label: "Mar 28", detail: "Mar 28 detail" },
    { label: "Mar 29", detail: "Mar 29 detail" },
    { label: "Mar 30", detail: "Mar 30 detail" },
  ],
};

const MONTH_DAY_DRILLDOWNS = {
  "Week 1 detail": {
    "Mar 3 detail": { title: "Mar 3", sessions: [TODAY_GAMES[0], TODAY_GAMES[1]] },
    "Mar 4 detail": { title: "Mar 4", sessions: [] },
    "Mar 5 detail": { title: "Mar 5", sessions: [TODAY_GAMES[2]] },
    "Mar 6 detail": { title: "Mar 6", sessions: [] },
    "Mar 7 detail": { title: "Mar 7", sessions: [TODAY_GAMES[3], TODAY_GAMES[4]] },
    "Mar 8 detail": { title: "Mar 8", sessions: [] },
    "Mar 9 detail": { title: "Mar 9", sessions: [TODAY_GAMES[5]] },
  },
  "Week 2 detail": {
    "Mar 10 detail": { title: "Mar 10", sessions: [TODAY_GAMES[1]] },
    "Mar 11 detail": { title: "Mar 11", sessions: [] },
    "Mar 12 detail": { title: "Mar 12", sessions: [TODAY_GAMES[2], TODAY_GAMES[3]] },
    "Mar 13 detail": { title: "Mar 13", sessions: [] },
    "Mar 14 detail": { title: "Mar 14", sessions: [TODAY_GAMES[4]] },
    "Mar 15 detail": { title: "Mar 15", sessions: [] },
    "Mar 16 detail": { title: "Mar 16", sessions: [TODAY_GAMES[5], TODAY_GAMES[6]] },
  },
  "Week 3 detail": {
    "Mar 17 detail": { title: "Mar 17", sessions: [TODAY_GAMES[0], TODAY_GAMES[2]] },
    "Mar 18 detail": { title: "Mar 18", sessions: [] },
    "Mar 19 detail": { title: "Mar 19", sessions: [TODAY_GAMES[3]] },
    "Mar 20 detail": { title: "Mar 20", sessions: [] },
    "Mar 21 detail": { title: "Mar 21", sessions: [TODAY_GAMES[4], TODAY_GAMES[5]] },
    "Mar 22 detail": { title: "Mar 22", sessions: [] },
    "Mar 23 detail": { title: "Mar 23", sessions: [TODAY_GAMES[6]] },
  },
  "Week 4 detail": {
    "Mar 24 detail": { title: "Mar 24", sessions: [TODAY_GAMES[0], TODAY_GAMES[1]] },
    "Mar 25 detail": { title: "Mar 25", sessions: [] },
    "Mar 26 detail": { title: "Mar 26", sessions: [TODAY_GAMES[2], TODAY_GAMES[3]] },
    "Mar 27 detail": { title: "Mar 27", sessions: [] },
    "Mar 28 detail": { title: "Mar 28", sessions: [TODAY_GAMES[4], TODAY_GAMES[5]] },
    "Mar 29 detail": { title: "Mar 29", sessions: TODAY_GAMES },
    "Mar 30 detail": { title: "Mar 30", sessions: [] },
  },
};


const PERIOD_DRILLDOWNS = {
  Week: {
    "Mar 23 detail": {
      sessions: [
        {
          id: "mar23-s1",
          label: "Game 1",
          machine: "Iron Maiden",
          balls: [
            { key: "ball-1", label: "Ball 1", subtitle: "Left ramp misses set the tone early.", axis: ["Launch", "Ramp", "Orbit", "Drain"], blueLine: { left: 18, top: 70, width: 178, rotate: -18 }, greenLine: { left: 18, top: 54, width: 172, rotate: -5 } },
            { key: "ball-2", label: "Ball 2", subtitle: "Control settled and the orbit feed improved.", axis: ["Start", "Control", "Flow", "End"], blueLine: { left: 18, top: 60, width: 182, rotate: -10 }, greenLine: { left: 18, top: 44, width: 176, rotate: 4 } },
            { key: "ball-3", label: "Ball 3", subtitle: "Best shot string until a missed trap ended the ball.", axis: ["Open", "Stack", "Trap", "Finish"], blueLine: { left: 18, top: 56, width: 184, rotate: -6 }, greenLine: { left: 18, top: 40, width: 178, rotate: 6 } },
          ],
          end: { label: "End", subtitle: "Game 1 summary: left ramp control improved by Ball 2 but still limited scoring.", axis: ["Ball 1", "Ball 2", "Ball 3", "Total"], blueLine: { left: 18, top: 58, width: 186, rotate: -8 }, greenLine: { left: 18, top: 42, width: 180, rotate: 4 } },
        },
        {
          id: "mar23-s2",
          label: "Game 2",
          machine: "Godzilla",
          balls: [
            { key: "ball-1", label: "Ball 1", subtitle: "Building shot timing was late off the first cradle.", axis: ["Launch", "Build", "Trap", "Drain"], blueLine: { left: 18, top: 68, width: 178, rotate: -16 }, greenLine: { left: 18, top: 52, width: 172, rotate: -2 } },
            { key: "ball-2", label: "Ball 2", subtitle: "Cleaner building shot sequence and fewer rushed feeds.", axis: ["Start", "Build", "Recover", "End"], blueLine: { left: 18, top: 58, width: 182, rotate: -8 }, greenLine: { left: 18, top: 42, width: 176, rotate: 4 } },
            { key: "ball-3", label: "Ball 3", subtitle: "One pop bumper drain cut off the best scoring pace.", axis: ["Open", "Mode", "Pop", "Finish"], blueLine: { left: 18, top: 62, width: 180, rotate: -10 }, greenLine: { left: 18, top: 46, width: 174, rotate: 2 } },
          ],
          end: { label: "End", subtitle: "Game 2 summary: building shot timing improved, but pop exits still caused drains.", axis: ["Ball 1", "Ball 2", "Ball 3", "Total"], blueLine: { left: 18, top: 60, width: 184, rotate: -9 }, greenLine: { left: 18, top: 44, width: 178, rotate: 3 } },
        },
      ],
    },
    "Mar 25 detail": {
      sessions: [
        {
          id: "mar25-s1",
          label: "Game 1",
          machine: "Jurassic Park",
          balls: [
            { key: "ball-1", label: "Ball 1", subtitle: "Truck shot misses put control under pressure early.", axis: ["Launch", "Truck", "Control", "Drain"], blueLine: { left: 18, top: 70, width: 176, rotate: -18 }, greenLine: { left: 18, top: 54, width: 170, rotate: -4 } },
            { key: "ball-2", label: "Ball 2", subtitle: "Better truck control and cleaner return catches.", axis: ["Start", "Truck", "Catch", "End"], blueLine: { left: 18, top: 58, width: 182, rotate: -8 }, greenLine: { left: 18, top: 42, width: 176, rotate: 4 } },
            { key: "ball-3", label: "Ball 3", subtitle: "One failed live catch erased a strong truck sequence.", axis: ["Open", "Truck", "Catch", "Finish"], blueLine: { left: 18, top: 62, width: 180, rotate: -10 }, greenLine: { left: 18, top: 46, width: 174, rotate: 2 } },
            { key: "ball-4", label: "Ball 4", subtitle: "Extra ball stayed cleaner but shorter than Ball 2.", axis: ["Extra", "Setup", "Truck", "End"], blueLine: { left: 18, top: 60, width: 182, rotate: -9 }, greenLine: { left: 18, top: 44, width: 176, rotate: 3 } },
          ],
          end: { label: "End", subtitle: "Game 1 summary: truck control trended up, while live catches remained the main leak.", axis: ["B1", "B2", "B3", "B4"], blueLine: { left: 18, top: 58, width: 184, rotate: -8 }, greenLine: { left: 18, top: 42, width: 178, rotate: 4 } },
        },
      ],
    },
    "Mar 27 detail": {
      sessions: [
        {
          id: "mar27-s1",
          label: "Game 1",
          machine: "Twilight Zone",
          balls: [
            { key: "ball-1", label: "Ball 1", subtitle: "Powerball follow-up was shaky off the plunge.", axis: ["Plunge", "Feed", "Loop", "Drain"], blueLine: { left: 18, top: 68, width: 178, rotate: -16 }, greenLine: { left: 18, top: 52, width: 172, rotate: -3 } },
            { key: "ball-2", label: "Ball 2", subtitle: "Best control stretch of the week with cleaner traps.", axis: ["Start", "Trap", "Mode", "End"], blueLine: { left: 18, top: 54, width: 184, rotate: -4 }, greenLine: { left: 18, top: 38, width: 178, rotate: 7 } },
            { key: "ball-3", label: "Ball 3", subtitle: "One rushed mode start cost the finish.", axis: ["Open", "Mode", "Recover", "Finish"], blueLine: { left: 18, top: 58, width: 182, rotate: -8 }, greenLine: { left: 18, top: 42, width: 176, rotate: 4 } },
          ],
          end: { label: "End", subtitle: "Game 1 summary: best shot rhythm of the week, but rushed decisions still cut off scoring.", axis: ["Ball 1", "Ball 2", "Ball 3", "Total"], blueLine: { left: 18, top: 56, width: 186, rotate: -6 }, greenLine: { left: 18, top: 40, width: 180, rotate: 5 } },
        },
        {
          id: "mar27-s2",
          label: "Game 2",
          machine: "Deadpool",
          balls: [
            { key: "ball-1", label: "Ball 1", subtitle: "Katana control improved after the first miss.", axis: ["Start", "Katana", "Recover", "Drain"], blueLine: { left: 18, top: 66, width: 176, rotate: -14 }, greenLine: { left: 18, top: 50, width: 170, rotate: -2 } },
            { key: "ball-2", label: "Ball 2", subtitle: "Best orbit carry of the day on Deadpool.", axis: ["Open", "Orbit", "Mode", "End"], blueLine: { left: 18, top: 54, width: 182, rotate: -5 }, greenLine: { left: 18, top: 38, width: 176, rotate: 6 } },
            { key: "ball-3", label: "Ball 3", subtitle: "Late-ball control slipped but stayed better than the opener.", axis: ["Start", "Mid", "Late", "Finish"], blueLine: { left: 18, top: 60, width: 180, rotate: -8 }, greenLine: { left: 18, top: 44, width: 174, rotate: 3 } },
          ],
          end: { label: "End", subtitle: "Game 2 summary: stronger orbit flow, with fewer late-ball errors than earlier sessions.", axis: ["Ball 1", "Ball 2", "Ball 3", "Total"], blueLine: { left: 18, top: 58, width: 184, rotate: -7 }, greenLine: { left: 18, top: 42, width: 178, rotate: 4 } },
        },
      ],
    },
    "Mar 29 detail": {
      sessions: TODAY_GAMES,
    },
  },
  Lifetime: {
    "Start detail": {
      sessions: [TODAY_GAMES[0], TODAY_GAMES[1]],
    },
    "Month 3 detail": {
      sessions: [TODAY_GAMES[2], TODAY_GAMES[3]],
    },
    "Month 6 detail": {
      sessions: [TODAY_GAMES[4], TODAY_GAMES[5]],
    },
    "Today detail": {
      sessions: TODAY_GAMES,
    },
  },
  Month: {
    "Week 1 detail": {
      sessions: [
        {
          id: "week1-s1",
          label: "Game 1",
          machine: "Iron Maiden",
          balls: [
            { key: "ball-1", label: "Ball 1", subtitle: "Left ramp misses dominated the first week opener.", axis: ["Launch", "Ramp", "Orbit", "Drain"], blueLine: { left: 18, top: 72, width: 176, rotate: -18 }, greenLine: { left: 18, top: 56, width: 170, rotate: -5 } },
            { key: "ball-2", label: "Ball 2", subtitle: "Recovery came after cleaner right orbit control.", axis: ["Start", "Orbit", "Control", "End"], blueLine: { left: 18, top: 60, width: 182, rotate: -10 }, greenLine: { left: 18, top: 44, width: 176, rotate: 3 } },
            { key: "ball-3", label: "Ball 3", subtitle: "Improvement stayed visible, but the finish was still rushed.", axis: ["Open", "Ramp", "Trap", "Finish"], blueLine: { left: 18, top: 58, width: 184, rotate: -8 }, greenLine: { left: 18, top: 42, width: 178, rotate: 4 } },
          ],
          end: { label: "End", subtitle: "Week 1 Game 1 summary: heavy shot misses early, then moderate control recovery.", axis: ["Ball 1", "Ball 2", "Ball 3", "Total"], blueLine: { left: 18, top: 60, width: 184, rotate: -9 }, greenLine: { left: 18, top: 44, width: 178, rotate: 3 } },
        },
        {
          id: "week1-s2",
          label: "Game 2",
          machine: "Godzilla",
          balls: [
            { key: "ball-1", label: "Ball 1", subtitle: "Building shot timing was still late during Week 1.", axis: ["Launch", "Build", "Trap", "Drain"], blueLine: { left: 18, top: 70, width: 176, rotate: -16 }, greenLine: { left: 18, top: 54, width: 170, rotate: -2 } },
            { key: "ball-2", label: "Ball 2", subtitle: "Control improved after the first missed feed.", axis: ["Start", "Build", "Recover", "End"], blueLine: { left: 18, top: 60, width: 182, rotate: -9 }, greenLine: { left: 18, top: 44, width: 176, rotate: 4 } },
            { key: "ball-3", label: "Ball 3", subtitle: "One pop exit drain kept the score below pace.", axis: ["Open", "Mode", "Pop", "Finish"], blueLine: { left: 18, top: 62, width: 180, rotate: -10 }, greenLine: { left: 18, top: 46, width: 174, rotate: 2 } },
          ],
          end: { label: "End", subtitle: "Week 1 Game 2 summary: building shot timing improved slightly, but pop exits were still costly.", axis: ["Ball 1", "Ball 2", "Ball 3", "Total"], blueLine: { left: 18, top: 60, width: 184, rotate: -9 }, greenLine: { left: 18, top: 44, width: 178, rotate: 3 } },
        },
      ],
    },
    "Week 2 detail": {
      sessions: [
        {
          id: "week2-s1",
          label: "Game 1",
          machine: "Jurassic Park",
          balls: [
            { key: "ball-1", label: "Ball 1", subtitle: "Truck misses stayed frequent, but feeds were calmer.", axis: ["Launch", "Truck", "Control", "Drain"], blueLine: { left: 18, top: 68, width: 176, rotate: -16 }, greenLine: { left: 18, top: 52, width: 170, rotate: -2 } },
            { key: "ball-2", label: "Ball 2", subtitle: "Better truck catch and cleaner return lane control.", axis: ["Start", "Truck", "Catch", "End"], blueLine: { left: 18, top: 58, width: 182, rotate: -8 }, greenLine: { left: 18, top: 42, width: 176, rotate: 4 } },
            { key: "ball-3", label: "Ball 3", subtitle: "One live-catch miss stopped the best ball of the week.", axis: ["Open", "Truck", "Catch", "Finish"], blueLine: { left: 18, top: 60, width: 180, rotate: -9 }, greenLine: { left: 18, top: 44, width: 174, rotate: 3 } },
          ],
          end: { label: "End", subtitle: "Week 2 Game 1 summary: truck shot rhythm improved, but live catches still limited finishes.", axis: ["Ball 1", "Ball 2", "Ball 3", "Total"], blueLine: { left: 18, top: 58, width: 184, rotate: -8 }, greenLine: { left: 18, top: 42, width: 178, rotate: 4 } },
        },
      ],
    },
    "Week 3 detail": {
      sessions: [
        {
          id: "week3-s1",
          label: "Game 1",
          machine: "Twilight Zone",
          balls: [
            { key: "ball-1", label: "Ball 1", subtitle: "Powerball feeds were steadier than earlier in the month.", axis: ["Plunge", "Feed", "Loop", "Drain"], blueLine: { left: 18, top: 64, width: 180, rotate: -12 }, greenLine: { left: 18, top: 48, width: 174, rotate: -1 } },
            { key: "ball-2", label: "Ball 2", subtitle: "Strongest trap control of the month so far.", axis: ["Start", "Trap", "Mode", "End"], blueLine: { left: 18, top: 52, width: 184, rotate: -4 }, greenLine: { left: 18, top: 36, width: 178, rotate: 7 } },
            { key: "ball-3", label: "Ball 3", subtitle: "One rushed mode start remained the main issue.", axis: ["Open", "Mode", "Recover", "Finish"], blueLine: { left: 18, top: 56, width: 182, rotate: -6 }, greenLine: { left: 18, top: 40, width: 176, rotate: 5 } },
          ],
          end: { label: "End", subtitle: "Week 3 Game 1 summary: control improved the most here, with strategy now showing up more clearly.", axis: ["Ball 1", "Ball 2", "Ball 3", "Total"], blueLine: { left: 18, top: 56, width: 186, rotate: -6 }, greenLine: { left: 18, top: 40, width: 180, rotate: 5 } },
        },
        {
          id: "week3-s2",
          label: "Game 2",
          machine: "Deadpool",
          balls: [
            { key: "ball-1", label: "Ball 1", subtitle: "Katana misses dropped compared with Week 1.", axis: ["Start", "Katana", "Recover", "Drain"], blueLine: { left: 18, top: 64, width: 176, rotate: -12 }, greenLine: { left: 18, top: 48, width: 170, rotate: 0 } },
            { key: "ball-2", label: "Ball 2", subtitle: "Best orbit carry and recoveries on Deadpool this month.", axis: ["Open", "Orbit", "Mode", "End"], blueLine: { left: 18, top: 52, width: 182, rotate: -4 }, greenLine: { left: 18, top: 36, width: 176, rotate: 6 } },
            { key: "ball-3", label: "Ball 3", subtitle: "Late control drifted but stayed above Week 1 level.", axis: ["Start", "Mid", "Late", "Finish"], blueLine: { left: 18, top: 58, width: 180, rotate: -7 }, greenLine: { left: 18, top: 42, width: 174, rotate: 4 } },
          ],
          end: { label: "End", subtitle: "Week 3 Game 2 summary: better orbit confidence and fewer recovery mistakes than earlier weeks.", axis: ["Ball 1", "Ball 2", "Ball 3", "Total"], blueLine: { left: 18, top: 56, width: 184, rotate: -6 }, greenLine: { left: 18, top: 40, width: 178, rotate: 5 } },
        },
      ],
    },
    "Week 4 detail": {
      sessions: TODAY_GAMES,
    },
  },
};

const MACHINE_BREAKDOWN = [
  { name: "Iron Maiden", sessions: 8, focus: "Left ramp misses", lastPlayed: "2026-03-28T19:42:00" },
  { name: "Godzilla", sessions: 6, focus: "Building shot timing", lastPlayed: "2026-03-27T21:08:00" },
  { name: "Jurassic Park", sessions: 4, focus: "Truck shot control", lastPlayed: "2026-03-26T18:31:00" },
  { name: "Twilight Zone", sessions: 5, focus: "Powerball follow-up", lastPlayed: "2026-03-24T20:14:00" },
  { name: "Deadpool", sessions: 3, focus: "Katana shot control", lastPlayed: "2026-03-23T19:05:00" },
  { name: "Foo Fighters", sessions: 2, focus: "Upper flipper consistency", lastPlayed: "2026-03-20T17:46:00" },
];

const TREND_OPTIONS = ["Today", "Week", "Month", "Lifetime"];

const NAV_ITEMS = [
  { label: "Account", href: "/account" },
  { label: "Analytics", href: "/analytics" },
  { label: "PinMap", href: "/pinmap" },
  { label: "Home", href: "/" },
  { label: "Classroom", href: "/classroom" },
];


export default function AnalyticsScreen() {
  const router = useRouter();

  function handleBack() {
    navigateBackWithinApp(router, "/");
  }

  const [trendView, setTrendView] = useState("Today");
  const [activeMarkerId, setActiveMarkerId] = useState("today-1");
  const [activeDetailKey, setActiveDetailKey] = useState("Game 1 detail");
  const [activeTodayGameId, setActiveTodayGameId] = useState(TODAY_GAMES[0].id);
  const [activeTodayBallKey, setActiveTodayBallKey] = useState(TODAY_GAMES[0].balls[0].key);
  const [showTodayNow, setShowTodayNow] = useState(false);
  const [activePeriodSessionId, setActivePeriodSessionId] = useState(PERIOD_DRILLDOWNS.Week["Mar 23 detail"].sessions[0].id);
  const [activePeriodBallKey, setActivePeriodBallKey] = useState(PERIOD_DRILLDOWNS.Week["Mar 23 detail"].sessions[0].balls[0].key);
  const [activeMonthWeekKey, setActiveMonthWeekKey] = useState(null);
  const [activeMonthDayKey, setActiveMonthDayKey] = useState(null);


  const trendData = ANALYTICS_DATA[trendView];
  const activeMarker = trendData.markers.find((marker) => marker.id === activeMarkerId) ?? trendData.markers[0];
  const detailKeys = Object.keys(trendData.detailViews);
  const activeDetail = trendData.detailViews[activeDetailKey] ?? trendData.detailViews[detailKeys[0]];
  const activeTodayGame = TODAY_GAMES.find((game) => game.id === activeTodayGameId) ?? TODAY_GAMES[0];
  const activeTodayBall =
    activeTodayGame.balls.find((ball) => ball.key === activeTodayBallKey) ?? activeTodayGame.balls[0];
  const periodDetails = PERIOD_DRILLDOWNS[trendView];
  const activeMonthDates = activeMonthWeekKey ? MONTH_WEEK_DATES[activeMonthWeekKey] ?? [] : [];
  const activeMonthDay = activeMonthWeekKey && activeMonthDayKey
    ? MONTH_DAY_DRILLDOWNS[activeMonthWeekKey]?.[activeMonthDayKey]
    : null;
  const weekDateOptions = WEEK_DATES.map((item) => ({
    ...item,
    hasSessions: (PERIOD_DRILLDOWNS.Week?.[item.detail]?.sessions?.length ?? 0) > 0,
  }));
  const monthDateOptions = activeMonthDates.map((item) => ({
    ...item,
    hasSessions: (MONTH_DAY_DRILLDOWNS[activeMonthWeekKey]?.[item.detail]?.sessions?.length ?? 0) > 0,
  }));
  const activePeriodSessions =
    trendView === "Month" && activeMonthDay
      ? activeMonthDay.sessions
      : periodDetails?.[activeDetailKey]?.sessions ?? [];
  const activePeriodSession =
    activePeriodSessions.find((session) => session.id === activePeriodSessionId) ?? activePeriodSessions[0];
  const activePeriodBall =
    activePeriodSession?.balls.find((ball) => ball.key === activePeriodBallKey) ?? activePeriodSession?.balls[0];
  const activePeriodTitle =
    trendView === "Month" && activeMonthDay ? activeMonthDay.title : activeDetail.title;
  const activePeriodDetail = activePeriodSession
    ? activePeriodBallKey === "end"
      ? {
          title: `${activePeriodTitle} | ${activePeriodSession.machine}`,
          subtitle: activePeriodSession.end.subtitle,
          axis: activePeriodSession.end.axis,
          blueLine: activePeriodSession.end.blueLine,
          greenLine: activePeriodSession.end.greenLine,
        }
      : {
          title: `${activePeriodTitle} | ${activePeriodSession.machine}`,
          subtitle: activePeriodBall.subtitle,
          axis: activePeriodBall.axis,
          blueLine: activePeriodBall.blueLine,
          greenLine: activePeriodBall.greenLine,
        }
    : activeDetail;
  const activeTodayDetail = showTodayNow
    ? TODAY_NOW_DETAIL
    : activeTodayBallKey === "end"
      ? {
          title: `${activeTodayGame.label} | ${activeTodayGame.machine}`,
          machine: activeTodayGame.machine,
          subtitle: activeTodayGame.end.subtitle,
          axis: activeTodayGame.end.axis,
          blueLine: activeTodayGame.end.blueLine,
          greenLine: activeTodayGame.end.greenLine,
        }
      : {
          title: `${activeTodayGame.label} | ${activeTodayGame.machine}`,
          machine: activeTodayGame.machine,
          subtitle: activeTodayBall.subtitle,
          axis: activeTodayBall.axis,
          blueLine: activeTodayBall.blueLine,
          greenLine: activeTodayBall.greenLine,
        };

  const currentMachineName = showTodayNow
    ? "Current Session"
    : trendView === "Today"
      ? activeTodayGame.machine
      : activePeriodSession?.machine ?? "Current Machine";



  const currentMachineStats = useMemo(() => {
    const base = MACHINE_BREAKDOWN.find((machine) => machine.name === currentMachineName) ?? MACHINE_BREAKDOWN[0];
    return {
      ...base,
      avgScore:
        base.name === "Iron Maiden" ? "8.4M" :
        base.name === "Godzilla" ? "9.1M" :
        base.name === "Jurassic Park" ? "7.3M" :
        base.name === "Twilight Zone" ? "8.8M" :
        base.name === "Deadpool" ? "6.9M" : "7.1M",
      bestScore:
        base.name === "Iron Maiden" ? "16.2M" :
        base.name === "Godzilla" ? "18.7M" :
        base.name === "Jurassic Park" ? "13.4M" :
        base.name === "Twilight Zone" ? "15.1M" :
        base.name === "Deadpool" ? "11.9M" : "10.8M",
      topIssue: base.focus,
      topLocation:
        base.name === "Godzilla" || base.name === "Jurassic Park" || base.name === "Iron Maiden"
          ? "Blairally"
          : "Local rotation",
    };
  }, [currentMachineName]);


  function handleTrendChange(option) {
    const nextData = ANALYTICS_DATA[option];
    const firstDetailKey = Object.keys(nextData.detailViews)[0];

    setTrendView(option);
    setActiveDetailKey(firstDetailKey);
    setActiveMarkerId(nextData.markers[0].id);

    if (option === "Today") {
      setShowTodayNow(false);
      setActiveTodayGameId(TODAY_GAMES[0].id);
      setActiveTodayBallKey(TODAY_GAMES[0].balls[0].key);
      setActiveMonthWeekKey(null);
      setActiveMonthDayKey(null);
      return;
    }

    if (option === "Week") {
      const firstSession = PERIOD_DRILLDOWNS.Week[firstDetailKey].sessions[0];
      setActivePeriodSessionId(firstSession.id);
      setActivePeriodBallKey(firstSession.balls[0].key);
      setActiveMonthWeekKey(null);
      setActiveMonthDayKey(null);
      return;
    }

    if (option === "Month") {
      setActiveMonthWeekKey(null);
      setActiveMonthDayKey(null);
      return;
    }

    if (option === "Lifetime") {
      setActiveMonthWeekKey(null);
      setActiveMonthDayKey(null);
      const firstSession = PERIOD_DRILLDOWNS.Lifetime[firstDetailKey].sessions[0];
      setActivePeriodSessionId(firstSession.id);
      setActivePeriodBallKey(firstSession.balls[0].key);
    }
  }

  function handlePeriodDetailChange(detailKey) {
    if (trendView === "Month") {
      const firstDay = (MONTH_WEEK_DATES[detailKey] ?? []).find(
        (item) => (MONTH_DAY_DRILLDOWNS[detailKey]?.[item.detail]?.sessions?.length ?? 0) > 0
      );
      const firstSession = firstDay ? MONTH_DAY_DRILLDOWNS[detailKey][firstDay.detail].sessions[0] : null;
      setActiveMonthWeekKey(detailKey);
      setActiveMonthDayKey(firstDay?.detail ?? null);
      setActiveDetailKey(detailKey);
      if (firstSession) {
        setActivePeriodSessionId(firstSession.id);
        setActivePeriodBallKey(firstSession.balls[0].key);
      }
      return;
    }

    setActiveDetailKey(detailKey);
    const nextSessions = PERIOD_DRILLDOWNS[trendView]?.[detailKey]?.sessions ?? [];
    const nextSession = nextSessions[0];
    if (nextSession) {
      setActivePeriodSessionId(nextSession.id);
      setActivePeriodBallKey(nextSession.balls[0].key);
    }
  }

  function handleMonthDayChange(detailKey) {
    const nextSessions = MONTH_DAY_DRILLDOWNS[activeMonthWeekKey]?.[detailKey]?.sessions ?? [];
    const nextSession = nextSessions[0];
    setActiveMonthDayKey(detailKey);
    if (nextSession) {
      setActivePeriodSessionId(nextSession.id);
      setActivePeriodBallKey(nextSession.balls[0].key);
    }
  }

  function handleMonthBack() {
    setActiveMonthWeekKey(null);
    setActiveMonthDayKey(null);
  }

  function handlePeriodSessionChange(sessionId) {
    const nextSession = activePeriodSessions.find((session) => session.id === sessionId) ?? activePeriodSessions[0];
    if (nextSession) {
      setActivePeriodSessionId(nextSession.id);
      setActivePeriodBallKey(nextSession.balls[0].key);
    }
  }

  function handleTodayGameChange(gameId) {
    const nextGame = TODAY_GAMES.find((game) => game.id === gameId) ?? TODAY_GAMES[0];
    setShowTodayNow(false);
    setActiveTodayGameId(nextGame.id);
    setActiveTodayBallKey(nextGame.balls[0].key);
  }

  return (
    <div className="screen">
      <div className="phoneShell">
        <header className="topBar">
          <button type="button" className="navArrow" aria-label="Back" onClick={handleBack}>
            &#8249;
          </button>
          <h1>Analytics</h1>
          <div className="spacer" />
        </header>


        <main className="content">
          <section className="heroCard">
            <div className="heroTitle">Performance Snapshot</div>
            <div className="heroSubtitle">Recent session trends and coaching signals</div>
          </section>

          <section className="kpiGrid" aria-label="Analytics overview">
            {trendData.kpis.map((card) => (
              <div key={card.label} className="kpiCard">
                <div className="kpiValue" style={{ color: card.accent }}>
                  {card.value}
                </div>
                <div className="kpiLabel">{card.label}</div>
              </div>
            ))}
          </section>

          <section className="sectionCard">
            <h2>Trends</h2>
            <div className="trendTabs" role="tablist" aria-label="Trend range">
              {TREND_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="tab"
                  aria-selected={trendView === option}
                  className={`trendTab ${trendView === option ? "trendTabActive" : ""}`}
                  onClick={() => handleTrendChange(option)}
                >
                  {option}
                </button>
              ))}
            </div>
            <div className="trendChart" aria-label={`${trendView} trend chart`}>
              <div
                className="chartLine chartLineBlue"
                style={{
                  left: trendData.blueLine.left,
                  top: trendData.blueLine.top,
                  width: trendData.blueLine.width,
                  transform: `rotate(${trendData.blueLine.rotate}deg)`,
                }}
              />
              <div
                className="chartLine chartLineGreen"
                style={{
                  left: trendData.greenLine.left,
                  top: trendData.greenLine.top,
                  width: trendData.greenLine.width,
                  transform: `rotate(${trendData.greenLine.rotate}deg)`,
                }}
              />
              {trendData.markers.map((marker) => (
                <button
                  key={marker.id}
                  type="button"
                  className={`chartDot ${activeMarkerId === marker.id ? "chartDotActive" : ""}`}
                  style={{ left: marker.left, top: marker.top }}
                  onClick={() => setActiveMarkerId(marker.id)}
                  aria-label={`${marker.title}: ${marker.summary}`}
                  title={marker.summary}
                />
              ))}
            </div>
            {trendView === "Today" ? (
              <>
                <div className="todayControls">
                  <div className="todayGameScroller" role="tablist" aria-label="Games played today">
                    {TODAY_GAMES.map((game) => (
                      <button
                        key={game.id}
                        type="button"
                        role="tab"
                        aria-selected={!showTodayNow && activeTodayGameId === game.id}
                        className={`todayGameButton ${!showTodayNow && activeTodayGameId === game.id ? "todayGameButtonActive" : ""}`}
                        onClick={() => handleTodayGameChange(game.id)}
                      >
                        {game.label}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    className={`todayNowButton ${showTodayNow ? "todayNowButtonActive" : ""}`}
                    onClick={() => setShowTodayNow(true)}
                  >
                    Now
                  </button>
                </div>
                <div className="detailChartCard">
                  <div className="detailChartHeader detailChartHeaderStacked">
                    <div>
                      <div className="markerTitle">{activeTodayDetail.title}</div>
                      <div className="markerSubtext">{activeTodayDetail.subtitle}</div>
                    </div>
                  </div>
                  <div className="detailChart" aria-label={`${activeTodayDetail.title} detailed trend`}>
                    <div className="chartLine chartLineBlue" style={{ left: activeTodayDetail.blueLine.left, top: activeTodayDetail.blueLine.top, width: activeTodayDetail.blueLine.width, transform: `rotate(${activeTodayDetail.blueLine.rotate}deg)` }} />
                    <div className="chartLine chartLineGreen" style={{ left: activeTodayDetail.greenLine.left, top: activeTodayDetail.greenLine.top, width: activeTodayDetail.greenLine.width, transform: `rotate(${activeTodayDetail.greenLine.rotate}deg)` }} />
                  </div>
                  <div className="detailAxis" aria-hidden="true">
                    {activeTodayDetail.axis.map((label) => (
                      <span key={label}>{label}</span>
                    ))}
                  </div>
                </div>
                {!showTodayNow ? (
                  <div className="todayBallScroller" role="tablist" aria-label={`${activeTodayGame.label} balls`}>
                    {activeTodayGame.balls.map((ball) => (
                      <button
                        key={ball.key}
                        type="button"
                        role="tab"
                        aria-selected={activeTodayBallKey === ball.key}
                        className={`todayBallButton ${activeTodayBallKey === ball.key ? "todayBallButtonActive" : ""}`}
                        onClick={() => setActiveTodayBallKey(ball.key)}
                      >
                        {ball.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      role="tab"
                      aria-selected={activeTodayBallKey === "end"}
                      className={`todayBallButton ${activeTodayBallKey === "end" ? "todayBallButtonActive" : ""}`}
                      onClick={() => setActiveTodayBallKey("end")}
                    >
                      End
                    </button>
                  </div>
                ) : null}
                <div className="markerCallout">
                  <div className="markerTitle">{activeMarker.title}</div>
                  <div className="markerText">{activeMarker.summary}</div>
                </div>
              </>
            ) : trendView === "Week" ? (
              <>
                <div className="chartAxis" role="tablist" aria-label="Detailed date range">
                  {weekDateOptions.map((item) => (
                    <button
                      key={item.detail}
                      type="button"
                      role="tab"
                      aria-selected={activeDetailKey === item.detail}
                      className={`axisButton ${activeDetailKey === item.detail ? "axisButtonActive" : ""} ${item.hasSessions ? "" : "axisButtonDisabled"}`}
                      onClick={() => handlePeriodDetailChange(item.detail)}
                      disabled={!item.hasSessions}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <div className="todayBallScroller" role="tablist" aria-label={`${activeDetail.title} games`}>
                  {activePeriodSessions.map((session) => (
                    <button
                      key={session.id}
                      type="button"
                      role="tab"
                      aria-selected={activePeriodSession?.id === session.id}
                      className={`todayBallButton ${activePeriodSession?.id === session.id ? "todayBallButtonActive" : ""}`}
                      onClick={() => handlePeriodSessionChange(session.id)}
                    >
                      {session.label}
                    </button>
                  ))}
                </div>
                <div className="detailChartCard">
                  <div className="detailChartHeader detailChartHeaderStacked">
                    <div>
                      <div className="markerTitle">{activePeriodDetail.title}</div>
                      <div className="markerSubtext">{activePeriodDetail.subtitle}</div>
                    </div>
                  </div>
                  <div className="detailChart" aria-label={`${activePeriodDetail.title} detailed trend`}>
                    <div className="chartLine chartLineBlue" style={{ left: activePeriodDetail.blueLine.left, top: activePeriodDetail.blueLine.top, width: activePeriodDetail.blueLine.width, transform: `rotate(${activePeriodDetail.blueLine.rotate}deg)` }} />
                    <div className="chartLine chartLineGreen" style={{ left: activePeriodDetail.greenLine.left, top: activePeriodDetail.greenLine.top, width: activePeriodDetail.greenLine.width, transform: `rotate(${activePeriodDetail.greenLine.rotate}deg)` }} />
                  </div>
                  <div className="detailAxis" aria-hidden="true">
                    {activePeriodDetail.axis.map((label) => (
                      <span key={label}>{label}</span>
                    ))}
                  </div>
                </div>
                <div className="todayBallScroller" role="tablist" aria-label={`${activeDetail.title} balls`}>
                  {(activePeriodSession?.balls ?? []).map((ball) => (
                    <button
                      key={ball.key}
                      type="button"
                      role="tab"
                      aria-selected={activePeriodBallKey === ball.key}
                      className={`todayBallButton ${activePeriodBallKey === ball.key ? "todayBallButtonActive" : ""}`}
                      onClick={() => setActivePeriodBallKey(ball.key)}
                    >
                      {ball.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activePeriodBallKey === "end"}
                    className={`todayBallButton ${activePeriodBallKey === "end" ? "todayBallButtonActive" : ""}`}
                    onClick={() => setActivePeriodBallKey("end")}
                  >
                    End
                  </button>
                </div>
                <div className="markerCallout">
                  <div className="markerTitle">{activeMarker.title}</div>
                  <div className="markerText">{activeMarker.summary}</div>
                </div>
              </>
            ) : trendView === "Month" ? (
              <>
                {activeMonthWeekKey ? (
                  <div className="chartAxis monthDateAxis" role="tablist" aria-label="Weekday dates">
                    {monthDateOptions.map((item) => (
                      <button
                        key={item.detail}
                        type="button"
                        role="tab"
                        aria-selected={activeMonthDayKey === item.detail}
                        className={`axisButton ${activeMonthDayKey === item.detail ? "axisButtonActive" : ""} ${item.hasSessions ? "" : "axisButtonDisabled"}`}
                        onClick={() => handleMonthDayChange(item.detail)}
                        disabled={!item.hasSessions}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="chartAxis" role="tablist" aria-label="Month weeks">
                    {trendData.axis.map((item) => (
                      <button
                        key={item.detail}
                        type="button"
                        role="tab"
                        aria-selected={activeDetailKey === item.detail}
                        className="axisButton"
                        onClick={() => handlePeriodDetailChange(item.detail)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
                {activeMonthWeekKey ? (
                  <>
                    <div className="monthBackRow">
                      <button type="button" className="monthBackButton" onClick={() => handleMonthBack()}>
                        Back to Month
                      </button>
                    </div>
                    <div className="todayBallScroller" role="tablist" aria-label={`${activePeriodTitle} games`}>
                      {activePeriodSessions.map((session) => (
                        <button
                          key={session.id}
                          type="button"
                          role="tab"
                          aria-selected={activePeriodSession?.id === session.id}
                          className={`todayBallButton ${activePeriodSession?.id === session.id ? "todayBallButtonActive" : ""}`}
                          onClick={() => handlePeriodSessionChange(session.id)}
                        >
                          {session.label}
                        </button>
                      ))}
                    </div>
                    <div className="detailChartCard">
                      <div className="detailChartHeader detailChartHeaderStacked">
                        <div>
                          <div className="markerTitle">{activePeriodDetail.title}</div>
                          <div className="markerSubtext">{activePeriodDetail.subtitle}</div>
                        </div>
                      </div>
                      <div className="detailChart" aria-label={`${activePeriodDetail.title} detailed trend`}>
                        <div className="chartLine chartLineBlue" style={{ left: activePeriodDetail.blueLine.left, top: activePeriodDetail.blueLine.top, width: activePeriodDetail.blueLine.width, transform: `rotate(${activePeriodDetail.blueLine.rotate}deg)` }} />
                        <div className="chartLine chartLineGreen" style={{ left: activePeriodDetail.greenLine.left, top: activePeriodDetail.greenLine.top, width: activePeriodDetail.greenLine.width, transform: `rotate(${activePeriodDetail.greenLine.rotate}deg)` }} />
                      </div>
                      <div className="detailAxis" aria-hidden="true">
                        {activePeriodDetail.axis.map((label) => (
                          <span key={label}>{label}</span>
                        ))}
                      </div>
                    </div>
                    <div className="todayBallScroller" role="tablist" aria-label={`${activePeriodTitle} balls`}>
                      {(activePeriodSession?.balls ?? []).map((ball) => (
                        <button
                          key={ball.key}
                          type="button"
                          role="tab"
                          aria-selected={activePeriodBallKey === ball.key}
                          className={`todayBallButton ${activePeriodBallKey === ball.key ? "todayBallButtonActive" : ""}`}
                          onClick={() => setActivePeriodBallKey(ball.key)}
                        >
                          {ball.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        role="tab"
                        aria-selected={activePeriodBallKey === "end"}
                        className={`todayBallButton ${activePeriodBallKey === "end" ? "todayBallButtonActive" : ""}`}
                        onClick={() => setActivePeriodBallKey("end")}
                      >
                        End
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="markerCallout">
                    <div className="markerTitle">Choose a Week</div>
                    <div className="markerText">Pick a week above, then drill into that week dates.</div>
                  </div>
                )}
                <div className="markerCallout">
                  <div className="markerTitle">{activeMarker.title}</div>
                  <div className="markerText">{activeMarker.summary}</div>
                </div>
              </>
            ) : (
              <>
                <div className="chartAxis" role="tablist" aria-label="Detailed date range">
                  {trendData.axis.map((item) => (
                    <button
                      key={item.detail}
                      type="button"
                      role="tab"
                      aria-selected={activeDetailKey === item.detail}
                      className={`axisButton ${activeDetailKey === item.detail ? "axisButtonActive" : ""}`}
                      onClick={() => setActiveDetailKey(item.detail)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <div className="detailChartCard">
                  <div className="detailChartHeader">
                    <div className="markerTitle">{activeDetail.title}</div>
                    <div className="markerSubtext">{activeDetail.subtitle}</div>
                  </div>
                  <div className="detailChart" aria-label={`${activeDetail.title} detailed trend`}>
                    <div className="chartLine chartLineBlue" style={{ left: activeDetail.blueLine.left, top: activeDetail.blueLine.top, width: activeDetail.blueLine.width, transform: `rotate(${activeDetail.blueLine.rotate}deg)` }} />
                    <div className="chartLine chartLineGreen" style={{ left: activeDetail.greenLine.left, top: activeDetail.greenLine.top, width: activeDetail.greenLine.width, transform: `rotate(${activeDetail.greenLine.rotate}deg)` }} />
                  </div>
                  <div className="detailAxis" aria-hidden="true">
                    {activeDetail.axis.map((label) => (
                      <span key={label}>{label}</span>
                    ))}
                  </div>
                </div>
                <div className="markerCallout">
                  <div className="markerTitle">{activeMarker.title}</div>
                  <div className="markerText">{activeMarker.summary}</div>
                </div>
              </>
            )}
            <div className="detailList">
              {trendData.trends.map((row) => (
                <div key={row.label} className="detailRow">
                  <span className="detailLabel">{row.label}</span>
                  <span className="detailValue">{row.value}</span>
                  <span className="detailMeta">{row.change}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="sectionCard">
            <h2>{currentMachineStats.name} Lifetime</h2>
            <div className="machineLifetimeGrid">
              <div className="machineLifetimeCard">
                <div className="machineLifetimeLabel">Sessions</div>
                <div className="machineLifetimeValue">{currentMachineStats.sessions}</div>
              </div>
              <div className="machineLifetimeCard">
                <div className="machineLifetimeLabel">Avg Score</div>
                <div className="machineLifetimeValue">{currentMachineStats.avgScore}</div>
              </div>
              <div className="machineLifetimeCard">
                <div className="machineLifetimeLabel">Best Score</div>
                <div className="machineLifetimeValue">{currentMachineStats.bestScore}</div>
              </div>
              <div className="machineLifetimeCard">
                <div className="machineLifetimeLabel">Top Issue</div>
                <div className="machineLifetimeValue machineLifetimeValueSmall">{currentMachineStats.topIssue}</div>
              </div>
            </div>
            <div className="machineLifetimeMeta">Most tracked location: {currentMachineStats.topLocation}</div>
          </section>
        </main>

        <nav className="bottomNav" aria-label="Primary">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`navItem ${item.label === "Analytics" ? "navItemActive" : ""} ${!item.href ? "navItemDisabled" : ""}`}
              onClick={() => {
                if (item.href) {
                  router.push(item.href);
                }
              }}
              disabled={!item.href}
            >
              <span className="navIcon" aria-hidden="true">
                {item.label === "Account" && "O"}
                {item.label === "Analytics" && "|"}
                {item.label === "PinMap" && "*"}
                {item.label === "Home" && "#"}
                {item.label === "Classroom" && "="}
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <style jsx>{`
        .screen {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: #f3f5f8;
          font-family: "Segoe UI", Arial, sans-serif;
        }

        .phoneShell {
          width: 390px;
          max-width: 100%;
          min-height: 812px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          border-radius: 34px;
          border: 8px solid #05070d;
          background:
            radial-gradient(circle at top, rgba(50, 87, 150, 0.34), rgba(16, 38, 73, 0) 32%),
            linear-gradient(180deg, #102649 0%, #08172d 100%);
          color: #f3f7ff;
          box-shadow: 0 28px 70px rgba(0, 0, 0, 0.28);
        }

        .topBar {
          min-height: 92px;
          display: grid;
          grid-template-columns: 40px 1fr 40px;
          align-items: center;
          padding: 28px 18px 10px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: linear-gradient(180deg, rgba(19, 43, 81, 0.92), rgba(16, 38, 73, 0.76));
        }

        h1 {
          margin: 0;
          text-align: center;
          align-self: center;
          font-size: 19px;
          font-weight: 700;
          letter-spacing: 0.01em;
        }

        h2 {
          margin: 0 0 12px;
          font-size: 15px;
          font-weight: 800;
          color: #f4f1e6;
        }

        .navArrow,
        .navItem,
        .trendTab,
        .chartDot,
        .axisButton {
          cursor: pointer;
        }

        .navArrow {
          width: 36px;
          height: 36px;
          align-self: center;
          border: 0;
          border-radius: 999px;
          background: transparent;
          color: #d7e4ff;
          font-size: 24px;
          line-height: 1;
        }

        .spacer {
          width: 40px;
        }

        .content {
          flex: 1;
          padding: 14px 16px 12px;
          overflow-y: auto;
        }

        .heroCard,
        .sectionCard,
        .kpiCard,
        .detailChartCard {
          border-radius: 16px;
          border: 1px solid rgba(165, 190, 232, 0.18);
          background: linear-gradient(180deg, rgba(26, 47, 85, 0.86), rgba(12, 24, 46, 0.94));
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.18);
        }

        .heroCard {
          padding: 16px;
          margin-bottom: 14px;
        }

        .heroTitle {
          font-size: 20px;
          font-weight: 800;
          color: #f7f4e6;
        }

        .heroSubtitle {
          margin-top: 4px;
          font-size: 13px;
          color: #b8c8e6;
        }

        .kpiGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 14px;
        }

        .kpiCard {
          padding: 14px 10px 12px;
          text-align: center;
        }

        .kpiValue {
          font-size: 24px;
          font-weight: 800;
        }

        .kpiLabel {
          margin-top: 4px;
          font-size: 12px;
          font-weight: 700;
          line-height: 1.2;
          color: #c8d6ef;
        }

        .sectionCard {
          padding: 14px 14px 12px;
          margin-bottom: 12px;
        }

        .trendTabs {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
          margin-bottom: 12px;
        }

        .trendTab {
          height: 34px;
          border: 1px solid rgba(165, 190, 232, 0.2);
          border-radius: 999px;
          background: rgba(16, 31, 58, 0.72);
          color: #c6d5ee;
          font-size: 12px;
          font-weight: 700;
          line-height: 1.2;
        }

        .trendTabActive {
          background: linear-gradient(180deg, #69a9ff 0%, #2f6fe3 100%);
          border-color: rgba(147, 190, 255, 0.56);
          color: #ffffff;
        }

        .trendChart,
        .detailChart {
          position: relative;
          height: 104px;
          border-radius: 12px;
          background: linear-gradient(180deg, rgba(14, 28, 54, 0.92), rgba(10, 20, 39, 0.96));
          overflow: hidden;
        }

        .trendChart {
          margin-bottom: 10px;
        }

        .detailChart {
          margin-top: 10px;
        }

        .todayControls {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
        }

        .monthDateAxis {
          margin-bottom: 0;
        }

        .monthBackRow {
          display: flex;
          justify-content: flex-start;
          margin: 8px 0 10px;
        }

        .monthBackButton {
          height: 34px;
          padding: 0 12px;
          border: 1px solid rgba(165, 190, 232, 0.2);
          border-radius: 999px;
          background: rgba(16, 31, 58, 0.72);
          color: #c6d5ee;
          font-size: 12px;
          font-weight: 700;
          line-height: 1.2;
        }

        .todayGameScroller,
        .todayBallScroller {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          scrollbar-width: none;
        }

        .todayGameScroller::-webkit-scrollbar,
        .todayBallScroller::-webkit-scrollbar {
          display: none;
        }

        .todayGameScroller {
          flex: 1;
          min-width: 0;
        }

        .todayBallScroller {
          margin-bottom: 10px;
          padding-bottom: 2px;
        }

        .todayGameButton,
        .todayNowButton,
        .todayBallButton {
          height: 34px;
          border: 1px solid rgba(165, 190, 232, 0.2);
          border-radius: 999px;
          background: rgba(16, 31, 58, 0.72);
          color: #c6d5ee;
          font-size: 12px;
          font-weight: 700;
          line-height: 1.2;
          flex: 0 0 auto;
          padding: 0 14px;
        }

        .todayNowButton {
          flex: 0 0 auto;
        }

        .todayGameButtonActive,
        .todayNowButtonActive,
        .todayBallButtonActive {
          background: linear-gradient(180deg, #69a9ff 0%, #2f6fe3 100%);
          border-color: rgba(147, 190, 255, 0.56);
          color: #ffffff;
        }

        .trendChart::before,
        .detailChart::before {
          content: "";
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            to top,
            transparent 0,
            transparent 25px,
            rgba(255, 255, 255, 0.05) 25px,
            rgba(255, 255, 255, 0.05) 26px
          );
        }

        .chartLine {
          position: absolute;
          height: 3px;
          border-radius: 999px;
          transform-origin: left center;
        }

        .chartLineBlue {
          background: #69a9ff;
        }

        .chartLineGreen {
          background: #42d392;
        }

        .chartDot {
          position: absolute;
          width: 12px;
          height: 12px;
          border: 0;
          border-radius: 50%;
          background: #f5a524;
          box-shadow: 0 0 0 4px rgba(245, 165, 36, 0.18);
        }

        .chartDotActive {
          box-shadow: 0 0 0 5px rgba(245, 165, 36, 0.28);
          transform: scale(1.08);
        }

        .chartAxis,
        .detailAxis {
          display: grid;
          grid-auto-flow: column;
          grid-auto-columns: 1fr;
          gap: 6px;
          font-size: 11px;
          font-weight: 700;
          color: #9db4d8;
        }

        .chartAxis {
          margin-bottom: 10px;
        }

        .detailAxis {
          margin-top: 8px;
        }

        .axisButton {
          border: 0;
          background: transparent;
          color: #9db4d8;
          font-size: 11px;
          font-weight: 700;
          padding: 0;
        }

        .axisButton:nth-child(2),
        .axisButton:nth-child(3),
        .detailAxis span:nth-child(2),
        .detailAxis span:nth-child(3) {
          text-align: center;
        }

        .axisButton:last-child,
        .detailAxis span:last-child {
          text-align: right;
        }

        .axisButtonActive {
          color: #ffffff;
        }

        .axisButtonDisabled {
          color: rgba(157, 180, 216, 0.38);
          opacity: 0.55;
        }

        .detailChartCard {
          padding: 10px 10px 8px;
          margin-bottom: 12px;
        }

        .detailChartHeader {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 10px;
        }

        .detailChartHeaderStacked {
          justify-content: flex-start;
        }

        .markerCallout {
          margin-bottom: 12px;
          padding: 10px 12px;
          border-radius: 12px;
          background: rgba(14, 28, 54, 0.78);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .markerTitle {
          font-size: 12px;
          font-weight: 800;
          color: #f3f0e6;
        }

        .markerSubtext,
        .markerText {
          margin-top: 4px;
          font-size: 12px;
          color: #bfd0eb;
          line-height: 1.4;
        }

        .detailList {
          display: grid;
          gap: 10px;
        }

        .detailRow {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          gap: 10px;
          padding-top: 10px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .detailRow:first-child {
          padding-top: 0;
          border-top: 0;
        }

        .detailLabel {
          font-size: 12px;
          font-weight: 700;
          line-height: 1.2;
          color: #aebfdc;
        }

        .detailValue {
          text-align: right;
          font-size: 13px;
          font-weight: 700;
          color: #f0f5ff;
        }

        .detailMeta {
          grid-column: 1 / -1;
          font-size: 12px;
          color: #8fb7ff;
        }

        .machineLifetimeGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .machineLifetimeCard {
          padding: 12px;
          border-radius: 14px;
          border: 1px solid rgba(165, 190, 232, 0.16);
          background: rgba(255, 255, 255, 0.04);
        }

        .machineLifetimeLabel {
          color: #9db4d8;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 6px;
        }

        .machineLifetimeValue {
          font-size: 17px;
          font-weight: 800;
          color: #f3f0e6;
        }

        .machineLifetimeValueSmall {
          font-size: 14px;
          line-height: 1.35;
        }

        .machineLifetimeMeta {
          margin-top: 10px;
          font-size: 12px;
          font-weight: 700;
          line-height: 1.2;
          color: #8fb7ff;
        }

        .bottomNav {
          height: 74px;
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          align-items: center;
          padding: 6px 6px 10px;
          background: linear-gradient(180deg, rgba(14, 30, 57, 0.95), rgba(9, 20, 39, 0.98));
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .navItem {
          width: 100%;
          min-height: 100%;
          padding: 0;
          border: 0;
          background: transparent;
          color: #b7bfd0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          font-size: 12px;
          font-weight: 600;
          appearance: none;
        }

        .navItemActive {
          color: #68a9ff;
        }

        .navItemDisabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .navIcon {
          font-size: 18px;
          line-height: 1;
        }
        @media (max-width: 520px) {
          .screen {
            padding: 0;
            background:
              radial-gradient(circle at top, rgba(50, 87, 150, 0.34), rgba(16, 38, 73, 0) 32%),
              linear-gradient(180deg, #102649 0%, #08172d 100%);
          }

          .phoneShell {
            width: 100vw;
            max-width: 100vw;
            min-height: 100vh;
            border: 0;
            border-radius: 0;
            box-shadow: none;
          }
        }
      `}</style>
    </div>
  );
}



