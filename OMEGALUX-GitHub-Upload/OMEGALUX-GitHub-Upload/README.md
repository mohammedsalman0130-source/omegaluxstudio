# OMEGALUX Studio — GitHub upload package

This is the complete public website in editable HTML, CSS and JavaScript. No build command, API key or Node installation is required. Images, the lighting guide, logo animation, client reel and all five article PDFs are included.

## Upload with drag and drop

1. Extract this ZIP on your computer.
2. Open the extracted **OMEGALUX-GitHub-Upload** folder.
3. Create or open your GitHub repository. Select **Add file → Upload files**.
4. Drag all files and folders **inside** OMEGALUX-GitHub-Upload into the upload area. Do not upload the ZIP itself or the enclosing folder. `index.html`, `CNAME`, `assets` and `articles` must be at the repository root.
5. Click **Commit changes**.
6. Open **Settings → Pages**. Under Build and deployment, choose **Deploy from a branch**, select your uploaded branch (usually `main`) and **/ (root)**, then Save.

The package contains fewer than 100 files, and each file is below GitHub's 25 MiB browser-upload limit.

## Connect www.omegaluxstudio.com

The included CNAME file declares `www.omegaluxstudio.com`. This package does not change your domain's DNS or activate custom-domain hosting by itself.

1. In GitHub **Settings → Pages**, set Custom domain to **www.omegaluxstudio.com** and save it.
2. In your domain provider's DNS settings, set the **www** CNAME record to **YOUR-GITHUB-USERNAME.github.io**, replacing YOUR-GITHUB-USERNAME with your actual account or organization. Do not include a repository name or https://.
3. To support the root domain **omegaluxstudio.com** as well, configure its A records to these GitHub Pages addresses: 185.199.108.153, 185.199.109.153, 185.199.110.153 and 185.199.111.153. Keep email-related MX and TXT records in place.
4. After DNS validates and GitHub issues the certificate, enable **Enforce HTTPS** in Pages settings. DNS propagation can take up to 24 hours.

Official instructions:
- https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository
- https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site

## Contact details and enquiry delivery

- General enquiries: info@omegaluxstudio.com
- Lighting design: design@omegaluxstudio.com
- Telephone: +971 58 117 8675
- Location: Near Hamdan Centre, Abu Dhabi, United Arab Emirates

The map identifies Hamdan Centre as a nearby landmark, not an exact office address. Enquiry forms open the visitor's email app with a prepared message; the visitor must send that email to submit it. Lighting-design enquiries go to design@omegaluxstudio.com, and other enquiries go to info@omegaluxstudio.com. There is no server-side inbox or automatic form-delivery service in this static package.

## Editing

- `index.html`: home page
- `expertise.html`: About Us, partners and lighting walkthrough
- `approach.html`: design and supply process
- `recommendations.html`: lighting guide
- `blog.html`: articles
- `contact.html`: contact details and map
- `style.css` and `pages.css`: styling
- `app.js`: navigation and email enquiry behaviour
- `clients.js`: continuous partner reel
- `articles/`: five downloadable PDFs
- `assets/`: site images and original logo artwork

Visible photo credits and photo-source links have been removed from website pages and article PDFs. Technical references in the lighting articles are retained. Canonical URLs use https://www.omegaluxstudio.com/.
