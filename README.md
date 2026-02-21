# 🔍 FindRepo — GitHub Repository Explorer

> **Search, explore, and discover repositories within any GitHub organization — all from a sleek, modern web interface.**

FindRepo is a client-side web application that lets you browse and filter repositories within any GitHub organization using the [GitHub REST API](https://docs.github.com/en/rest). Simply provide your Personal Access Token, specify an organization, and optionally enter a keyword to instantly explore repositories with rich detail.

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)
![GitHub API](https://img.shields.io/badge/GitHub_API-181717?style=flat&logo=github&logoColor=white)

---

## 📖 Table of Contents

- [Features](#-features)
- [Demo Preview](#-demo-preview)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Generating a GitHub Token](#generating-a-github-token)
- [Usage](#-usage)
- [Project Structure](#-project-structure)
- [How It Works](#-how-it-works)
- [Security & Privacy](#-security--privacy)
- [Technologies Used](#-technologies-used)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔑 **Token-Based Authentication** | Securely authenticate with GitHub using a Personal Access Token (PAT). Token visibility can be toggled on/off. |
| 🏢 **Organization Search** | Explore all repositories (public, private, forked, archived) within any GitHub organization. |
| 🔎 **Keyword Filtering** | Filter repositories by name, description, or topics in real-time. Matching keywords are visually highlighted. |
| 📊 **Sorting Options** | Sort results by **Stars**, **Last Updated**, **Name**, or **Forks**. |
| 🏷️ **Type Filters** | Quickly filter by repository type: All, Public, Private, Forked, or Archived using filter chips. |
| 📄 **Pagination** | Fetches all repositories across multiple API pages and displays them in batches with a "Load More" button. |
| 🪟 **Detail Modal** | Click any repository card to view detailed information including stars, forks, issues, watchers, language, creation date, last push, license, default branch, size, and topics. |
| 🌈 **Language Color Coding** | Displays the primary programming language with its official GitHub color dot (supports 25+ languages). |
| 📱 **Fully Responsive** | Beautiful, mobile-friendly design that works seamlessly across desktops, tablets, and phones. |
| 🎨 **Modern Dark UI** | Glassmorphism-inspired design with animated gradient background orbs, smooth transitions, and Inter + JetBrains Mono typography. |
| ⚡ **Zero Dependencies** | Pure HTML, CSS, and vanilla JavaScript — no frameworks, no build tools, no npm packages required. |
| 🛡️ **Client-Side Only** | Your token is never stored persistently or sent to any server other than GitHub's API. |

---

## 🖼️ Demo Preview

### Search Panel
The landing page presents a clean form where you enter your GitHub token, organization name, and an optional keyword filter.

### Results View
After searching, repositories are displayed in a responsive card grid showing the repo name, description, topics, star/fork counts, primary language, and last update time.

### Repository Detail Modal
Clicking a card opens a detailed modal with comprehensive repository metadata, stats, and a direct link to the repo on GitHub.

---

## 🚀 Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- A [GitHub Personal Access Token](#generating-a-github-token)
- No server, Node.js, or build tools required

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/FindRepo.git
   cd FindRepo
   ```

2. **Open in your browser:**
   ```bash
   # Simply open the HTML file directly
   open index.html
   
   # Or use any local server, for example:
   npx serve .
   # or
   python3 -m http.server 8000
   ```

That's it! No installation or build step needed.

### Generating a GitHub Token

1. Go to **[GitHub Settings → Developer Settings → Personal Access Tokens → Tokens (classic)](https://github.com/settings/tokens)**
2. Click **"Generate new token (classic)"**
3. Give it a descriptive name (e.g., `FindRepo Explorer`)
4. Select the required scopes:
   - `repo` — for accessing private repositories
   - `read:org` — for accessing organization repositories
5. Click **"Generate token"** and copy it
6. Paste the token into FindRepo's token field

> ⚠️ **Important:** Treat your token like a password. FindRepo never stores it — it's only used for API calls during your session.

---

## 💡 Usage

1. **Enter your GitHub Personal Access Token** in the first field
2. **Type the organization name** (e.g., `google`, `microsoft`, `facebook`, `vercel`)
3. **Optionally add a keyword** to filter results (e.g., `api`, `frontend`, `ml`)
4. Click **"Search Repositories"**
5. Browse the results:
   - Use **filter chips** (All / Public / Private / Forked / Archived) to narrow down
   - Use the **sort dropdown** to reorder by Stars, Updated, Name, or Forks
   - **Click any card** to view detailed repository info in a modal
   - Click **"Load More"** to see additional repositories
6. Click **"New Search"** to return to the search form and start over

---

## 📁 Project Structure

```
FindRepo/
├── index.html      # Main HTML page — app structure, form, results grid, modal
├── style.css       # Complete styling — dark theme, animations, responsive layout
├── app.js          # Application logic — API calls, state management, rendering
└── README.md       # Project documentation (this file)
```

### File Breakdown

| File | Lines | Description |
|------|-------|-------------|
| `index.html` | ~226 | Semantic HTML5 structure with the search form, results section, filter bar, repository grid, detail modal, and error banner. |
| `style.css` | ~1161 | Full dark-themed design system with CSS custom properties, animated background orbs, glassmorphism cards, responsive grid layout, and smooth transitions. |
| `app.js` | ~586 | Vanilla JavaScript handling form submission, GitHub API integration with pagination, state management, client-side filtering/sorting, dynamic card rendering, modal interactions, and utility functions. |

---

## ⚙️ How It Works

### Architecture Overview

FindRepo follows a simple **client-side SPA** (Single Page Application) pattern:

```
User Input → GitHub REST API → State Management → DOM Rendering
```

### Detailed Flow

1. **Authentication & Input**  
   The user provides a GitHub PAT and organization name. The token is sent as a `Bearer` token in the `Authorization` header.

2. **API Fetching (Pagination)**  
   The app calls `GET /orgs/{org}/repos` with `per_page=100` and follows pagination via the `Link` response header, fetching **all** repositories across multiple pages automatically.

3. **State Management**  
   All fetched repositories are stored in an in-memory `state` object. The app maintains separate arrays for all repos, filtered repos, and currently displayed repos.

4. **Filtering & Sorting**  
   - **Keyword filter:** Matches against repo name, description, and topics (case-insensitive)
   - **Type filter:** Filters by public/private/forked/archived status
   - **Sorting:** Supports sorting by stars, forks, last updated, or name

5. **Rendering**  
   Repository cards are built dynamically using `document.createDocumentFragment()` for optimal performance. Cards display the repo name, description, topics (with keyword highlighting), stats, language, and last update time.

6. **Lazy Loading**  
   Results are shown in batches of 30 cards. Users click "Load More" to reveal additional repositories without re-fetching from the API.

7. **Detail Modal**  
   Clicking a card opens a modal with comprehensive metadata: stars, forks, issues, watchers, language, creation date, last push date, license, default branch, size, and topics.

### Error Handling

- **401 Unauthorized** — Invalid or expired token
- **403 Forbidden** — Rate limit exceeded (shows reset time)
- **404 Not Found** — Organization doesn't exist
- Auto-dismissing error banner with 8-second timeout

---

## 🔐 Security & Privacy

- **No backend server** — Everything runs in your browser
- **Token is never persisted** — Your PAT is only held in memory during the session and is never saved to `localStorage`, cookies, or any external service
- **Organization name only** — Only the last-used organization name is saved to `sessionStorage` for convenience (cleared when the browser tab closes)
- **Direct API calls** — Requests go directly from your browser to `api.github.com` — no proxy, no middleman
- **No analytics or tracking** — Zero third-party scripts

---

## 🛠️ Technologies Used

| Technology | Purpose |
|---|---|
| **HTML5** | Semantic page structure and accessible forms |
| **CSS3** | Custom properties, CSS Grid, Flexbox, animations, glassmorphism effects |
| **Vanilla JavaScript (ES6+)** | DOM manipulation, Fetch API, async/await, state management |
| **GitHub REST API v3** | Repository data fetching with pagination support |
| **Google Fonts** | [Inter](https://fonts.google.com/specimen/Inter) (UI text) & [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) (code/monospace) |

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** your changes: `git commit -m 'Add amazing feature'`
4. **Push** to the branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

### Ideas for Contributions

- 🌐 Add support for searching user repositories (not just organizations)
- 📈 Add repository activity graphs/charts
- 💾 Add export functionality (CSV, JSON)
- 🌙 Add light/dark theme toggle
- 🔔 Add GitHub Actions status badges to cards
- 🧪 Add unit tests

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<div align="center">

**FindRepo** — Built with ❤️ using the [GitHub REST API](https://docs.github.com/en/rest)

Your token is never stored or sent anywhere except GitHub.

</div>
