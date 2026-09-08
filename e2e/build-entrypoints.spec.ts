import { test, expect } from './fixtures';

// Exercise both HTML entrypoints and every app selected by main.tsx. In production
// these catch missing chunks and initialization-order errors after code splitting.
for (const path of ['/', '/master', '/edit', '/paint', '/play', '/embedded.html']) {
  test(`build: opens ${path}`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.ok()).toBe(true);
    await expect(page.locator(path === '/embedded.html' ? '#embedded-root' : '#root')).not.toBeEmpty();
    await expect(page.getByRole('button').first()).toBeVisible();
    if (path !== '/') await expect(page.locator('#puzzle-canvas')).toBeVisible();
  });
}

// A self-contained vector PDF avoids external fixtures, fonts, and network access.
function onePagePdf(): Buffer {
  const drawing = '0 0 1 rg 20 20 160 160 re f\n';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Resources << >> /Contents 4 0 R >>',
    `<< /Length ${drawing.length} >>\nstream\n${drawing}endstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = objects.map((object, index) => {
    const offset = pdf.length;
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    return offset;
  });
  const xref = pdf.length;
  pdf += `xref\n0 5\n0000000000 65535 f \n${offsets.map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}`;
  pdf += `trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf);
}

test('build: Paint renders and imports a PDF through its worker', async ({ page }, info) => {
  await page.goto('/paint');
  const worker = page.waitForEvent('worker', {
    predicate: worker => worker.url().includes('pdf.worker'),
  });
  await page.locator('input[type="file"][accept*="application/pdf"]').setInputFiles({
    name: 'blue-square.pdf', mimeType: 'application/pdf', buffer: onePagePdf(),
  });
  await worker;
  const preview = page.getByTitle('Page 1', { exact: true });
  await expect(preview).toHaveAttribute('aria-pressed', 'true');
  await expect(preview.locator('img')).toHaveJSProperty('naturalWidth', 200);
  expect(await preview.locator('img').evaluate((image: HTMLImageElement) => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 200;
    const context = canvas.getContext('2d')!;
    context.drawImage(image, 0, 0);
    return [...context.getImageData(100, 100, 1, 1).data];
  })).toEqual([0, 0, 255, 255]);
  await info.attach('pdf-preview', { body: await page.screenshot(), contentType: 'image/png' });
  await page.getByRole('button', { name: 'Import', exact: true }).click();
  await expect(page.getByText('Import PDF Pages', { exact: true })).toHaveCount(0);
  await expect(page.locator('#puzzle-canvas')).toBeVisible();
  await expect(page.locator('.background-image-layer image')).toHaveAttribute('href', /^data:image\/png;base64,/);
});
