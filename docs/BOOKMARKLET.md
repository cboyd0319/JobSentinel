# Browser Import Button

The browser import button saves the job page you are viewing into JobSentinel.
It is optional. You can still add jobs from inside JobSentinel without setting
this up.

## What It Does

- Saves jobs from official career pages and public job pages when the page
  shows enough job details.
- Uses the browser page you already opened.
- Sends the job only to the JobSentinel app running on your computer.
- Keeps the saved job local.

## When To Use It

Use the browser import button when:

- You find a job while browsing outside JobSentinel.
- A job source does not load inside JobSentinel.
- You want to save one job without copying details by hand.

## Set It Up

1. Open JobSentinel Settings.
2. Find **Install Browser Button**.
3. Turn on the import helper.
4. Click **Copy Browser Button**.
5. Create a new browser bookmark.
6. Name it **Import to JobSentinel**.
7. Paste the copied text where the bookmark stores the page address.
8. Save it to your bookmarks bar.

Copy the browser button again after each saved job or after changing connection
settings. If JobSentinel was closed and reopened, copy it again before
importing another job.

## Save A Job

1. Open an individual job posting in your browser.
2. Use the **Import to JobSentinel** bookmark.
3. Wait for the confirmation message.
4. Open JobSentinel and review the saved job.

If the job is missing, copy the browser button again and retry. If some details
are missing, edit the saved job after import.

## Where It Works Best

The browser import button works best on individual job pages from:

- Company career pages.
- Company application pages.
- Public pages that show the full job description, employer name, and location.
- Pages you opened yourself in your browser.

Job search result pages may not include enough job details. Some large job
boards also block page import. JobSentinel does not get around those limits; use
JobSentinel's search link or add the job manually when import does not work.

## Troubleshooting

### Cannot Connect To JobSentinel

- Make sure JobSentinel is open.
- Turn on the import helper in Settings.
- If support asks, open **Connection settings (support only)**, follow their
  instructions, and try again.
- Copy the browser button again if you already saved a job, restarted
  JobSentinel, or waited about one hour.
- If your firewall asks, allow connections for JobSentinel.

### Job Already Exists

JobSentinel found the same job in your saved jobs. Open your jobs list and
search for the company or title.

### Job Did Not Save

- Make sure you are on an individual job page.
- Try opening the job on the company career site.
- Add the job manually if the page does not include enough details.

### Missing Details

Some sites hide details or load them after the page opens. Save the job, then
fill in any blank details in JobSentinel.

## Privacy

- JobSentinel creates the browser button on your computer.
- Hidden details include a local safety code that stays out of normal setup.
- The local safety code is refreshed when the browser button is copied, works
  for one save, and expires after about one hour.
- If copying fails, the previous browser button keeps working until its safety
  code is used once or expires.
- Job data stays local unless you choose to share it.
- Debug reports must redact the browser button details and saved job details.

## For Maintainers

The browser import button is implemented by the bookmarklet module. The user
interface should keep technical details hidden:

- Do not show the generated script in the UI.
- Do not expose the local safety code.
- Keep copied browser-button codes one-use, short-lived, and session-scoped.
- Activate a refreshed safety code only after the browser button is copied.
- Prefer "browser import button", "import helper", and
  "connection settings (support only)" in user-facing copy.
- Keep lower-level implementation details in developer docs or code comments,
  not in the user setup path.
