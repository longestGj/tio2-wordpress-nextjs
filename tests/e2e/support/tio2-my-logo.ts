import {expect, type Locator} from '@playwright/test'

interface LogoSize {
  readonly height: number
  readonly width: number
}

export async function assertRenderedMalaysiaHeaderLogo(
  logo: Locator,
  expectedSize: LogoSize,
) {
  const visibleLogo = logo.filter({visible: true})
  await expect(visibleLogo).toHaveCount(1)
  await visibleLogo.scrollIntoViewIfNeeded()
  await expect(visibleLogo).toBeVisible()
  await expect.poll(() => visibleLogo.evaluate((image) => {
    const element = image as HTMLImageElement
    return element.complete && element.naturalWidth > 0 && element.naturalHeight > 0
  })).toBe(true)
  await visibleLogo.evaluate(async (image) => {
    const element = image as HTMLImageElement
    await element.decode()
    await new Promise<void>((resolve) => requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve())
    }))
  })

  const style = await visibleLogo.evaluate((image) => {
    const computed = getComputedStyle(image)
    return {
      clip: computed.clip,
      clipPath: computed.clipPath,
      display: computed.display,
      filter: computed.filter,
      mixBlendMode: computed.mixBlendMode,
      opacity: computed.opacity,
      transform: computed.transform,
      visibility: computed.visibility,
    }
  })
  expect(style).toEqual({
    clip: 'auto',
    clipPath: 'none',
    display: 'block',
    filter: 'none',
    mixBlendMode: 'normal',
    opacity: '1',
    transform: 'none',
    visibility: 'visible',
  })

  const box = await visibleLogo.boundingBox()
  expect(box).not.toBeNull()
  expect(box!.width).toBeCloseTo(expectedSize.width, 0)
  expect(box!.height).toBeCloseTo(expectedSize.height, 0)

  const screenshot = await visibleLogo.screenshot({animations: 'disabled'})
  const pixels = await visibleLogo.evaluate(async (_image, dataUrl) => {
    const screenshotImage = document.createElement('img')
    screenshotImage.src = dataUrl
    await screenshotImage.decode()
    const canvas = document.createElement('canvas')
    canvas.width = screenshotImage.naturalWidth
    canvas.height = screenshotImage.naturalHeight
    const context = canvas.getContext('2d', {willReadFrequently: true})!
    context.drawImage(screenshotImage, 0, 0)
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data
    let nonWhite = 0
    let opaque = 0
    for (let index = 0; index < data.length; index += 4) {
      const red = data[index]!
      const green = data[index + 1]!
      const blue = data[index + 2]!
      const alpha = data[index + 3]!
      if (alpha > 0) opaque += 1
      if (alpha > 0 && (red < 245 || green < 245 || blue < 245)) nonWhite += 1
    }
    return {height: canvas.height, nonWhite, opaque, width: canvas.width}
  }, `data:image/png;base64,${screenshot.toString('base64')}`)

  expect(pixels.width).toBeGreaterThan(0)
  expect(pixels.height).toBeGreaterThan(0)
  expect(pixels.opaque).toBeGreaterThan(0)
  expect(pixels.nonWhite).toBeGreaterThan(100)

  return {box: box!, pixels, style}
}
