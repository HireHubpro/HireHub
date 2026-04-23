# GitHub Pages note

This folder is deployed as static content on GitHub Pages.

Because GitHub Pages cannot run Node/Express or MySQL, the frontend requires a separately hosted backend API.

Set this in `frontend/config.js` (or inject at runtime):

```js
window.HIREHUB_API_BASE = 'https://your-backend-domain.com';
```

Without a backend URL, signup/login/profile API calls will fail on Pages.
