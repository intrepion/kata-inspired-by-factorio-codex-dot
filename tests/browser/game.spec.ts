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
