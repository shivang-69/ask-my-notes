# JobUnify — Simple Interview Notes
No code. No jargon. Just what to say.

Read this like a script. Practice saying each answer out loud a few times. You don't need to understand *how* the code works — you need to be able to *describe* what it does, in your own words, confidently.

---

### Q: What is JobUnify?
**Say:** "It's a job aggregator — it pulls job listings from 4 different platforms into one place, so freshers don't have to check multiple websites separately."

### Q: Why did you build it?
**Say:** "I noticed job hunting means checking Internshala, Naukri, Unstop, Indeed separately every day. I wanted one place that pulls from all of them automatically."

### Q: What are the 4 platforms?
**Say:** "Internshala, Unstop, Naukri, and Indeed."

### Q: How do you get the job listings?
**Say:** "A mix of two things — some platforms I scrape directly (pulling data straight off their website), and for others I use ready-made job search APIs that give me structured data instead of scraping."

### Q: Wait, which ones are scraped vs API?
**Say:** "Internshala and Unstop are scraped directly. For Naukri and Indeed, I actually use external job APIs — Naukri specifically was hard to scrape reliably, so I used an API and kept the label for the UI."
*(This is 100% fine to say. Being upfront here is a good thing, not a weakness.)*

### Q: How often does new data come in?
**Say:** "There's an automatic scraper that runs every 6 hours and refreshes the job listings."

### Q: What happens if the same job appears twice — like same job on two sites, or the scraper runs again and finds it again?
**Say:** "I run a deduplication step after every scrape that checks for jobs with the same title and company, and removes repeats. It's not perfect — if two sites word the same job title slightly differently, it might not catch it. That's something I'd improve with smarter text matching."

### Q: What's your tech stack?
**Say:** "Frontend is plain HTML, CSS, and JavaScript. Backend is Node.js with Express. Database is MongoDB. The scrapers are written in Python. Frontend is hosted on Vercel, backend on Render."

### Q: How does login work?
**Say:** "Users can sign in two ways — normal email and password, or Google sign-in. Both ways end up giving the user a token that proves they're logged in, and the app uses that token to know who's making each request afterward."

### Q: What's that "token" actually called / how's it work?
**Say:** "It's called a JWT — basically a signed piece of data that says 'this is user X, and it's valid.' It gets stored in the browser, and sent along with every request so the server knows who's asking."

### Q: Is user data secure?
**Say:** "Passwords are hashed before being stored — meaning even I can't see someone's actual password, only a scrambled version used to check logins. The login token is stored in the browser's local storage."

### Q: Can users save jobs?
**Say:** "Yes, there's a bookmark/save feature so users can save jobs they're interested in and view them later in a saved jobs page."

### Q: What database do you use, and why?
**Say:** "MongoDB — I chose it because job data from different platforms doesn't have the exact same fields, and MongoDB is flexible with that kind of inconsistent, changing data, compared to a strict SQL table structure."

### Q: What was the hardest part of building this?
**Say (pick whichever feels true, or say something like):** "Getting the scrapers to reliably pull consistent data from sites that weren't built for scraping was probably the hardest part — websites change their layout, so scrapers can break silently."

### Q: What would you improve if you had more time?
**Pick 1-2 of these, don't list all of them:**
- "Better duplicate detection — right now it only catches exact title matches, so similar listings worded differently slip through."
- "Some monitoring/alerting so I'd know if a scraper breaks instead of it failing silently."
- "Cleaning up the saved-jobs feature — I built it twice in two different ways during development and never fully cleaned up the older version."

### Q: Did you build this alone?
**Say:** "Yes" (or however true) — "I used AI tools to help me move faster, especially on the scraping and boilerplate code, but the overall idea, structure, and decisions were mine."
*(This is a totally normal, honest thing to say. Most people use AI tools now — being upfront about it is fine, don't hide it or over-explain it.)*

---

## The ONE thing to actually practice

Don't try to memorize all of the above. Just practice this, out loud, a few times, until it feels natural without reading:

> "JobUnify pulls job listings from 4 platforms — Internshala, Unstop, Naukri, and Indeed — into one place for freshers. Some are scraped directly, others come through APIs. A background job refreshes the listings every 6 hours and removes obvious duplicates. Users can sign in with email or Google, and save jobs they like. It's built with Node and MongoDB on the backend, plain JavaScript on the frontend."

That single paragraph covers 80% of what gets asked as an opener. Everything else in this doc is just backup for follow-up questions — you don't need it memorized, just skim it once or twice so it's *familiar*, not memorized word-for-word.

---

## If you genuinely get stuck on a question in a real interview
It's okay to say: **"That part I built quickly and I'm honestly less sure of the exact detail — but at a high level, [give the simple version]."** This is a completely acceptable, normal thing to say and far better than freezing or guessing wrong.
