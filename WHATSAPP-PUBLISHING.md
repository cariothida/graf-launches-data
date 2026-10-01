# Manual WhatsApp handoff — current contract (1 October 2026)

Alex revoked automatic WhatsApp publishing on 1 October 2026. This section supersedes ALL automatic sending, queueing, scheduling and retry instructions below.

Publish qualifying new launch information to the production website first and verify each matching live page. Then deliver each approved English launch caption directly to Alex in the morning conversation with its own verified, inspected opaque 1200x900 image displayed inline, a downloadable image link, a concise description and the matching live graf.ae launch URL. Alex publishes manually to his channel/Status. Prefer verified project imagery; otherwise use the established factual GRAF information card. Never invent buildings or logos. Retain original announcement dates and distinguish early announcement from sales opening. Unknown prices/terms remain unknown; explicitly hedge broker evidence, exclude public rumours and repeated unchanged announcements.

Do not send/upload to WhatsApp, enqueue approved posts, trigger or retry the publisher. Keep whatsapp-queue.json empty (version 1, current briefingDate, posts []). Do not change workflows, secrets or release refs. Do not edit the workflow-owned ledger or mark a handoff as sent. Track drafts handed to Alex separately from confirmed publication. Reading WhatsApp chats and visible Status updates for research remains authorized; this publishing change does not cancel read-only research.

Today's Tessera and Pullman cards/captions were handed to Alex for manual publication; automatic pending queue entries were removed at his request. Manual publication is not confirmed.

## Editorial cards — revised after Alex's rejection, 1 October 2026

Alex rejected ALL T1–T5 and P1–P5 test designs. Do not use or promote those designs. The original plain GRAF information cards are the approved baseline: clear, restrained, legible, not an AI luxury advertisement.

Build simple cards with precise typesetting and layout (HTML/CSS, SVG or a standard graphic renderer), rather than generating the entire poster with AI. No generated architecture, generic AI buildings, cinematic golden-hour lighting, yellow colour grading, faux-luxury stock scenes, ornate serif headlines, glossy effects or excessive icons. This supersedes the earlier permission to use generic AI imagery. Use neutral/cool colour balance. Vary flat background/one subtle accent conservatively while preserving the original layout and legibility; avoid saturated blue excess and repetitive green.

Card content is a teaser, not a brochure: project name, short location, developer name or verified logo, and at most ONE concise material announcement fact. Small graf.ae branding is sufficient. Aim for roughly 15–25 words total excluding proper names, not a rigid quota. Price tables, unit counts/mix lists, payment/EOI, handover, confidence and qualifications belong in the caption unless one fact is the actual headline. Do not list multiple unknown terms on the image. Use one straightforward sans-serif family, clear hierarchy, left alignment, generous spacing, no decorative separators. Check every draft at approximately 360px display width without zoom; if essential text needs enlargement, simplify the card.

If exact-project official imagery materially helps, use the original image as an unchanged inserted photograph/render with neutral colour and a separate calm text area. Never regenerate official architecture or claim an AI recreation is an official rendering. Do not force imagery when a typographic card is clearer. No matching official image: use verified logo or plain developer name and flat background. Developer logos must not dominate the project headline.

Caption carries the detailed verified announcement, original date/status, product/location, known or unknown prices/terms and the matching live graf.ae link. Keep it concise and scannable with short paragraphs. Do not create a new batch of speculative image designs unless requested.

Research references (design principles, not WhatsApp-specific evidence):
- BBC GEL typography and cards: https://bbc.github.io/gel/foundations/typography/ ; https://bbc.github.io/gel/components/cards/
- Home Office layout/typography: https://design.homeoffice.gov.uk/accessibility/page-structure/layout-typography
- Nielsen Norman Group mobile secondary content: https://www.nngroup.com/articles/defer-secondary-content-for-mobile/

## Historical automatic publication contract — superseded

# Daily hot-launch publication contract

Alex authorized daily English posts to Alex Graf Dubai, invite 0029Vb5yX5A4Y9ltaBC4aH3G, API recipient 120363400434813832@newsletter.

The morning research is the only editorial source. Publish ALL qualifying briefing records to launches.json immediately in one batch; the PRODUCTION site sync is independent of WhatsApp timing. Do not delay site records until social slots. No catalogue substitutions: channel posts are selected from the same hot-launch briefing and link to the matching live https://graf.ae/launches/<id>/ page. Already reported unchanged inventory is not news. Never reuse synthetic test records. Treppan Vision and Al Ghadeer Parks were already posted on 2026-09-11: do not repeat those announcements.

Prepare research before 08:00 Dubai. Replace whatsapp-queue.json once per morning with the date and 0–5 approved posts, strongest first. Include fewer when fewer qualify; an explicitly empty today's queue means no news, a stale date means a failed/missing preparation and the publisher fails loudly. Do not rewrite event bodies after any attempt. Do not manually edit the workflow-owned ledger. Re-read the queue and ledger before committing, use latest blob SHA, and preserve concurrent changes. Never requeue a sent event just by changing its key: eventKey identifies an actual dated launch/update, projectId stays permanent. Cross-check sources anew; older briefings contained erroneous launch dates/prices. A significant later update needs its own sourced eventKey and wording explaining the change.

Queue format:
```json
{"version":1,"briefingDate":"YYYY-MM-DD","posts":[{"projectId":"permanent-launch-id","eventKey":"permanent-launch-id:2026-09-12-eoi-open","kind":"hot-launch","language":"en","status":"broker-intelligence","approved":true,"materialUpdate":"What materially changed and on what source date","sources":["https://source.example/dated-announcement"],"siteUrl":"https://graf.ae/launches/permanent-launch-id/","body":"English broker intelligence with explicit uncertainty, real facts and only the matching graf.ae link."}]}
```

Sources remain in research/data for verification; NEVER put developer or broker URLs in the public body. Verify the launch page is actually live and corresponds to this exact project, not just an HTTP 200. EVERY launch post MUST include a verified image. Text-only publication is forbidden, including urgent catch-up batches. Use imageUrl for a verified graf.ae image or imageRepoPath for an approved assets/whatsapp JPEG with imageSha256. Prepare an opaque 1200x900 (4:3) card and inspect spelling, project identity, crop and contrast. Prefer a verified project render; otherwise use the established GRAF Launch Radar teal/white/gold information card with verified developer logo or plainly typeset developer name. Never invent a building or logo. Set imageVerified:true only after inspection. Send the English body as the image caption. Missing, corrupt or unverified image BLOCKS sending; prepare or repair the image and retry, never substitute text. Already sent historical text posts remain deduplicated and must not be resent under new event keys. Image sending and history confirmation have been proven live. No hashtags or generic inventory fillers. Rumours are not queued for public delivery. Broker prices are clearly attributed and unconfirmed, never presented as official.

All 0–5 daily posts target 08:00 Asia/Dubai (Alex's revised instruction, 18 September 2026). Set every scheduledAt to YYYY-MM-DDT08:00:00+04:00. Do not spread posts across the day or reserve an evening post. The publisher sends all due unsent posts sequentially in the same run, verifying each before the next. Existing periodic checks are recovery attempts, not separate editorial slots. Prepare research before 08:00; if preparation or delivery is late, send the ready batch at the next successful run rather than defer to evening. GitHub scheduling may be delayed; 08:00 is a target, not a minute-exact SLA. Retain same-day recovery cutoff 20:30 and no stale-day replay.

Official whapi-mcp@0.0.21 is driven from Actions with secrets.WHAPI_TOKEN as API_TOKEN. GitHub token is used only for durable ledger writes. Before send, verify newsletter identity and live site URL, check channel history, persist pending ledger state, send once, persist message ID, read history for exact body/caption confirmation, then mark sent. Ambiguous prior attempt with no history proof fails loudly instead of resending. A later run can reconcile a message visible in history. No silent success and no token logging. Running tests/dry-run never publishes. No-op does not mean a post was sent.

After morning commit inspect queue workflow and production site workflow separately. A failure in one must not suppress the other or the private briefing. Report actual commits/publication proofs and any failure honestly. Keep daily automation enabled for transient errors. The first full scheduled research-to-site-to-channel cycle is still pending proof.
