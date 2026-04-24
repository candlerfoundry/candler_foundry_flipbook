# Asset Manifest

## Downloaded from Airtable

| Original source | Local saved path | Used on | Notes |
| --- | --- | --- | --- |
| Airtable `Course & OND Planner` record `MCDO0126-1` (`How the Bible Actually Works`) attachment `Square - MMUMC .png` | `assets/graphics/how-the-bible-actually-works.png` | Page 3, featured left page | Selected as the strongest Bible-interpretation anchor with current artwork. |
| Airtable `Course & OND Planner` record `ARNO0726-?`/`Five Misconceptions of Paul` attachment `12_Five Misconceptions of Paul CitC 900x600.png` | `assets/graphics/five-misconceptions-of-paul.png` | Page 4, featured left page | Kept as-is because the graphic already reads well in a magazine spread. |
| Airtable `Course & OND Planner` record `BONF0925-1` (`Hebrew Insights: 12 Words that Will Transform Your Understanding of the Old Testament`) attachment `03_Concept_1_v1.2.jpg` | `assets/graphics/hebrew-insights-old-testament.jpg` | Page 5, featured left page | Downloaded locally, then resized/compressed for a lighter standalone runtime while preserving appearance. |
| Airtable `Course & OND Planner` record `ARNO0925-1` (`Faith in the Wild`) attachment `Wilderness - Faith in the Wild.jpg` | `assets/graphics/faith-in-the-wild.jpg` | Page 6, featured left page | Chosen for the wilderness spread because it gives the strongest atmospheric image treatment. |
| Airtable `Course & OND Planner` record `FRYB1025-1` (`The PreacHER and the Word`) attachment `04_The PreacHER and the Word_900x600.png` | `assets/graphics/the-preacher-and-the-word.png` | Page 7, featured left page | Used as the ministry-skills anchor. |
| Airtable `Course & OND Planner` record `QUIG0325-1` (`How To Teach the Bible`) attachment `How to Teach the Bible - Graphic.png` | `assets/graphics/how-to-teach-the-bible.png` | Page 7, right page support thumbnail | Downloaded because it is explicitly surfaced on the ministry spread. |

## Copied from local Foundry sources

| Original source | Local saved path | Used on | Notes |
| --- | --- | --- | --- |
| `C:\Users\esavant\Dropbox\Operations\Flipbook\Friendly Students 2.png` | `assets/branding/friendly-students-2.png` | Page 1, cover left page | Existing local image, copied into the durable asset tree so runtime no longer depends on the root folder file. |
| `C:\Users\esavant\Dropbox\Scripts\executive-bi-dashboard\assets\TCF_Logomark-Orange-Transparent.png` | `assets/branding/foundry-logomark-orange.png` | Global header, Page 1 cover | Reused for the clearest Foundry mark. |
| `C:\Users\esavant\Dropbox\Scripts\executive-bi-dashboard\assets\TCF_Logo-Orange-Transparent.png` | `assets/branding/foundry-logo-orange.png` | Page 8, right page | Used on the closing card. |
| `C:\Users\esavant\Dropbox\Scripts\executive-bi-dashboard\assets\Graphic Vignettes\homepage-standing-notebook.png` | `assets/branding/foundry-vignette-standing-notebook.png` | Page 1, cover right page | Subtle branded texture to keep the cover spread from feeling empty. |
| `C:\Users\esavant\Dropbox\Scripts\executive-bi-dashboard\assets\Graphic Vignettes\graphic-1-reader-presenter.png` | `assets/branding/foundry-vignette-reader-presenter.png` | Page 2, intro left page | Pulled in as a quiet Foundry cue for the editorial note spread. |
| `C:\Users\esavant\Dropbox\Scripts\executive-bi-dashboard\assets\faculty-staff-headshots\Dr._Elizabeth_Arnold.jpg` | `assets/headshots/elizabeth-arnold.jpg` | Pages 4 and 6 | Used for featured instructor cards. |
| `C:\Users\esavant\Dropbox\Scripts\executive-bi-dashboard\assets\faculty-staff-headshots\Dr._Ryan_Bonfiglio.jpg` | `assets/headshots/ryan-bonfiglio.jpg` | Page 5 | Used for the Hebrew Insights feature card. |
| `C:\Users\esavant\Dropbox\Scripts\executive-bi-dashboard\assets\faculty-staff-headshots\Dr._Teresa_Fry_Brown.jpg` | `assets/headshots/teresa-fry-brown.jpg` | Page 7 | Used for the ministry-skills feature card. |

## Local-only generated asset

| Original source | Local saved path | Used on | Notes |
| --- | --- | --- | --- |
| Generated locally during prototype work | `assets/audio/page-flip-soft.wav` | Global page-turn interaction | Short synthetic paper-like flip sound so the runtime has a durable local audio file and no external dependency. |

## Fallback and replacement notes

- `How the Bible Actually Works` was chosen over a broader Bible-reading spread built only from local copy because Airtable provided the strongest current graphic.
- `Faith in the Wild` became the contemplative/wilderness anchor because its art was substantially stronger than nearby practical-theology records with no comparable imagery.
- Supporting-course accordions intentionally rely on curated text more than extra thumbnails to keep the right page airy.
- No runtime image or audio path in `index.html` points at Airtable URLs or the executive BI repo; all assets resolve from the local Flipbook tree.
