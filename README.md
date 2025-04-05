# Chess.com Stats Finder

A simple web app that fetches and displays player statistics from [Chess.com](https://www.chess.com). Enter a username to quickly view stats like rating, games played, and performance across different formats (Rapid, Blitz, Bullet, etc.).

## 🚀 Features

- Fetch real-time stats of any Chess.com user
- Clean and minimal web interface
- Powered by Node.js (Express) backend
- Utilizes Python for some data processing (if applicable)
- Responsive frontend (served from `/public`)
- The main feature is to fetch the playtime , which isnt in the chesscom api its calculated by fetching the pgns anf the by adding time of all the games.
- It has also monthly breakdown of the playtime .
## 🛠️ Tech Stack

- **Backend:** Node.js, Express
- **Frontend:** HTML/CSS/JS (Static files in `public/`)
- **Python:** Used for any additional processing (see `requirements.txt`)

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/adityaabesec/chesscomstatsfinder.git
   cd chesscomstatsfinder
