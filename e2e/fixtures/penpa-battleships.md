# Penpa fleet fixture

`penpa-battleships.url.txt` was exported by Penpa+ 3.2.4 at
https://swaroopg92.github.io/penpa-edit/ on 2026-09-16 JST using Playwright/Chromium.
The blank 10×10 board was populated through Penpa's model and saved with its
own `maketext()`; Puzzle Kit's encoder was not used.

Zero-based rows 1, 3 and 5 contain variants 1–8 of `battleship_B`,
`battleship_G` and `battleship_W` in columns 1–8. Answer row 7 contains
the same black fleet. Left to right: single ship, middle, left/top/right/bottom
ends, water and dot. The third tuple entry is Penpa's drawing layer, not size.

The shapes and identifiers were checked against
[class_square.js at 34e3fe9](https://github.com/swaroopg92/penpa-edit/blob/34e3fe97804e518288870b70d919e7e76ee18b4d/docs/js/class_square.js#L3587).
The live site's version was recorded; its deployed commit was not identified.
Reference screenshots accompany the PR QA report. This is a synthetic test
board created for this change, not a third-party puzzle.
