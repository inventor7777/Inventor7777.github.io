## The site
It could be files for hosting. It could be AI HTMLs. It could be walls of text. 

## The files
Normal cloud storage links suck, and I can't host them myself due to upload speed. So, I upload videos here when I need to share simple links.

## The Rickroll
Why is it called button.html? So it doesn't look suspicious in a link.

## Found this from my WAN IP?
Awesome! If you have a moment to spare, consider opening a discussion about how you found it! I also have NGINX logs if you did :)
<details>
<summary>Where can I visit the self hosted one?</summary>
  
Currently, you can find the local, full resolution version at http://24.254.37.141:1200

Please be respectful of my **40Mbps** cable upload speed hahaha

</details>

<details>
<summary>Self Hosted Server Info</summary>

The server is a **Lenovo ThinkCentre M73** running Ubuntu 26.10 and Nginx.

It runs a lot of things, and I thought it would be funny to have a Rickroll server too.
- 20k RPS tested
- 1000+ concurrent connections handled
- NVMe laughed
- WAN is the bottleneck *(please don't send the WAN IP to 500 friends!)*

</details>

## Website and blog

The homepage, `/projects/`, and `/blog/` use shared Jekyll layouts. Existing experiment and video URLs are unchanged. Styles live in `assets/site.css`; GitHub projects are listed in `_data/projects.yml`.

### Write with a GUI

[Pages CMS](https://app.pagescms.org) provides a browser editor for the Markdown files in this repository. Its configuration is in `.pages.yml`.

1. Push this configuration to GitHub.
2. Sign in to Pages CMS with GitHub and grant access to this repository.
3. Select the repository and publishing branch, then open **Blog posts**.
4. Create a post, enter its title, date, description, and body. Upload images through the editor.
5. Turn on **Published** when ready and save. Saving commits changes to the selected GitHub branch. With GitHub Pages publishing from that branch, a new build publishes the post.

New posts default to unpublished. The editor requires your GitHub authorization; no credentials are stored in the website. Unpublished posts in a public repository are still publicly readable as source files.

### Write with Markdown

Create `_posts/YYYY-MM-DD-your-post-title.md`:

```markdown
---
title: "Your post title"
date: 2026-10-22
excerpt: "A short description for the blog listing."
---

Write your post here in **Markdown**.

## A heading

Add text, [links](https://example.com), images, and code blocks.
```

Post layouts and listings are automatic. For images, put files in `assets/uploads/` and use `![Description](/assets/uploads/photo.jpg)`.

Keep work in progress in `_drafts/`, or add `published: false` to a post. The included `_drafts/welcome.md` is a sample you can replace or delete. To publish a draft, move it to `_posts/` with a date-prefixed filename. Future-dated posts appear only after a build on or after that date; there is no scheduled publishing job.

### Local preview

On macOS, use Homebrew Ruby instead of the older system Ruby:

```sh
brew install ruby
export PATH="/opt/homebrew/opt/ruby/bin:$PATH"
export BUNDLE_PATH=vendor/bundle
bundle install
bundle exec jekyll serve --host 127.0.0.1 --port 4000 --drafts
```

Open http://127.0.0.1:4000. Changes rebuild automatically. `--drafts` includes the sample draft; omit it to see the published site. Posts marked `published: false` require `--unpublished` to preview. Restart the server after changing `_config.yml`.

The current preview also runs independently of Codex as a temporary macOS session service named `com.inventor7777.website-preview`. It ends at logout/reboot and is not installed as a login startup item. Its log is `/private/tmp/inventor7777-preview.log`. To stop it before running another server on port 4000:

```sh
launchctl bootout "gui/$(id -u)/com.inventor7777.website-preview"
```

### GitHub Pages

These templates use standard Jekyll features supported by GitHub Pages. Publish from the repository root on your selected branch in **Settings → Pages**. A plain static-file upload without a Jekyll build will not render the templates. For a custom GitHub Actions deployment, build with Jekyll and deploy `_site/`.
