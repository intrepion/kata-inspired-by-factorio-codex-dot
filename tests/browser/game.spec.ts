import { test, expect } from "@playwright/test";
test("fresh expedition controls, placement, mining, save and reload", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Wake the quiet coast." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Field guide" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Back to the field" }).click();
  await page.keyboard.press("Space");
  const canvas = page.locator("canvas"),
    box = (await canvas.boundingBox())!;
  await page.keyboard.press("2");
  await canvas.click({
    position: { x: box.width / 2 + 38, y: box.height / 2 },
  });
  await expect(page.getByRole("status")).toHaveText("belt placed.");
  await page.keyboard.press("q");
  await canvas.click({
    position: { x: box.width / 2 + 38, y: box.height / 2 },
  });
  await expect(page.getByText("belt → east")).toBeVisible();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.reload();
  await expect(page.getByRole("status")).toHaveText("Expedition restored.");
  await page.keyboard.press("e");
  await expect(
    page.getByRole("heading", { name: "Satchel & handcrafting" }),
  ).toBeVisible();
  await page.keyboard.press("d");
  await page.keyboard.down("d");
  await page.waitForTimeout(400);
  await page.keyboard.up("d");
  await canvas.screenshot({ path: "test-results/field.png" });
  expect(errors).toEqual([]);
});

test("native-style mining, moving camera target and modal isolation", async ({
  page,
}) => {
  await page.goto("/");
  const box = (await page.locator("canvas").boundingBox())!;
  const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await page.mouse.move(center.x - 3 * 38, center.y - 3 * 38);
  await page.keyboard.down("f");
  await page.waitForTimeout(500);
  await page.keyboard.up("f");
  await expect(page.getByRole("status")).toHaveText("Mined one resource.");
  await page.mouse.move(center.x, center.y);
  await page.keyboard.down("d");
  await page.waitForTimeout(600);
  await page.keyboard.up("d");
  await expect(page.locator("#coordinates")).not.toContainText("SECTOR 8.0 /");
  await page.keyboard.press("Space");
  await page.keyboard.press("2");
  // Click without generating another pointer-move: camera changed under a stationary cursor.
  await page.mouse.down();
  await page.mouse.up();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("brasswake-save-v1")!),
  );
  expect(saved.entities[0].x).toBe(Math.round(saved.player.x));
  expect(saved.entities[0].x).toBeGreaterThan(8);
  expect(saved.inventory.ore).toBeGreaterThan(0);
  const before = await page.locator("#coordinates").innerText();
  await page.getByRole("button", { name: "Field guide" }).click();
  await page.keyboard.press("Space");
  await page.keyboard.down("d");
  await page.waitForTimeout(400);
  await page.keyboard.up("d");
  await page.getByRole("button", { name: "Back to the field" }).click();
  await expect(
    page.getByRole("button", { name: "Resume", exact: true }),
  ).toBeVisible();
  expect(await page.locator("#coordinates").innerText()).toBe(before);
});

test("malformed saved player is rejected while fresh world remains playable", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("brasswake-save-v1")!);
    s.player = {};
    localStorage.setItem("brasswake-save-v1", JSON.stringify(s));
  });
  await page.getByRole("button", { name: "Load", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText(
    "Save could not be read. Current expedition retained.",
  );
  await expect(page.locator("#coordinates")).toContainText("SECTOR 8.0 / 10.0");
});
