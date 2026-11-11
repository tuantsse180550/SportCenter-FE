import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

test("room detail shows only its sessions in chronological order, including cancelled records", async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
  try {
    const { RoomScheduleList } = await server.ssrLoadModule("/src/components/manager/RoomSchedules.jsx");
    const sessions = [
      { id: "late", roomId: "boxing", date: "2026-11-05", startTime: "19:00", endTime: "20:15", status: "SCHEDULED", classItem: { name: "Boxing class" }, lesson: { title: "Later lesson", description: "Lesson content" }, coach: { name: "Boxing coach" } },
      { id: "other", roomId: "yoga", date: "2026-11-01", classItem: { name: "Unrelated Yoga" }, status: "SCHEDULED" },
      { id: "early", roomId: "boxing", date: "2026-10-20", startTime: "19:00", endTime: "20:15", lesson: { title: "Earlier lesson" }, status: "CANCELLED" },
    ];
    const render = roomId => renderToStaticMarkup(createElement(RoomScheduleList, { roomId, sessions }));
    const html = render("boxing");
    assert.match(html, /2 buổi học/);
    assert.match(html, /Boxing class/); assert.match(html, /Boxing coach/);
    assert.match(html, /Lesson content/); assert.match(html, /Đã hủy/);
    assert.doesNotMatch(html, /Unrelated Yoga/);
    assert.ok(html.indexOf("Earlier lesson") < html.indexOf("Later lesson"));
    assert.match(render("empty"), /Phòng chưa có lịch học/);
    assert.equal(sessions[0].id, "late");
  } finally { await server.close(); }
});
