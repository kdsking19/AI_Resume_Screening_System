# 🤖 AI Resume Screening System

An intelligent resume screening system built with **Next.js** and powered by **Google Gemini AI** that automates the process of analyzing, formatting, and evaluating resumes against job requirements.

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![CSS](https://img.shields.io/badge/CSS-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![Google Gemini](https://img.shields.io/badge/Google%20Gemini-8E75B2?style=for-the-badge&logo=google&logoColor=white)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Installation](#-installation)
- [Usage](#-usage)
- [Project Structure](#-project-structure)
- [Environment Variables](#-environment-variables)
- [Scripts](#-scripts)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)
- [Author](#-author)
- [Support](#-support)

---

## 🎯 Overview

The **AI Resume Screening System** leverages the power of **Google Gemini API** to intelligently parse, format, and align resumes with job descriptions. Built on the **Next.js** framework, it provides a fast, modern, and responsive web interface for recruiters and HR professionals to streamline their hiring process.

---

## ✨ Features

- 🤖 **AI-Powered Analysis** — Uses Google Gemini API to intelligently read and evaluate resumes
- 📄 **Resume Formatting** — Automatically formats and aligns resume content for consistency
- 🎯 **Job Matching** — Matches candidate profiles against job descriptions
- 📊 **Scoring System** — Generates compatibility scores for each candidate
- 📁 **Resume Upload** — Supports uploading resumes in PDF/DOCX format
- ⚡ **Fast & Responsive UI** — Built with Next.js for optimal performance
- 🔍 **Skill Extraction** — Identifies and highlights key skills from resumes
- 📋 **Batch Processing** — Screen multiple resumes at once

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| **Next.js** | Full-stack React framework |
| **TypeScript** | Type-safe JavaScript |
| **JavaScript** | Core scripting |
| **CSS** | Styling and layout |
| **Google Gemini API** | AI resume formatting, alignment & analysis |

---

## 📦 Installation

### Prerequisites

- **Node.js** v18 or higher
- **npm** or **yarn** or **pnpm**
- **Google Gemini API Key** — Get one at [Google AI Studio](https://makersuite.google.com/)

### Steps

1. **Clone the repository**

   ```bash
   git clone https://github.com/kdsking19/AI_Resume_Screening_System.git
   cd AI_Resume_Screening_System

2. **Install Dependencies**

    ```bash
    npm install
    # or
    yarn install
    # or
    pnpm install

3. **Set up environment variables**

    ```bash
    cp .env.example .env.local

Add your Gemini API key to .env.local (see Environment Variables)

4. **Run the development server**

    ```bash
    npm run dev
    # or
    yarn dev
    # or
    pnpm dev

---

## 🚀 Overview

### 1. Upload a Resume
    - Navigate to the home page.
    - Upload a resume in PDF or DOCX format.

### 2. Enter Job Description
    - Paste or type the job description in the provided input field.

### 3. AI Screening
    - Click "Lauch 3D Analysis".
    - The Gemini API will analyze, format, and align the resume content against the job requirements.

### 4. View Results
    - View the match score, extracted skills, and formatted resume output
    - Download or export the screening report.

## 📁 Project Structure

    ```bash
    AI_Resume_Screening_System/
    ├── public/                        # Static assets
    ├── src/
    │   ├── app/                       # Next.js App Router
    │   │   ├── layout.tsx             # Root layout
    │   │   ├── page.tsx               # Home page
    │   │   └── api/                   # API Routes
    │   │       └── screen/
    │   │           └── route.ts       # Resume screening API endpoint
    │   ├── components/                # Reusable UI components
    │   │   ├── ResumeUpload.tsx       # Resume upload component
    │   │   ├── JobDescription.tsx     # Job description input component
    │   │   ├── ScreeningResult.tsx    # Screening result display
    │   │   └── ScoreCard.tsx          # Score display component
    │   ├── lib/                       # Utility functions & Gemini config
    │   │   ├── gemini.ts              # Gemini API integration
    │   │   └── helpers.ts             # Helper functions
    │   ├── styles/                    # CSS stylesheets
    │   │   └── globals.css            # Global styles
    │   └── types/                     # TypeScript type definitions
    │       └── index.ts               # Type definitions
    ├── .env.local                     # Environment variables (not committed)
    ├── .env.example                   # Example environment file
    ├── next.config.js                 # Next.js configuration
    ├── tsconfig.json                  # TypeScript configuration
    ├── package.json                   # Project dependencies
    └── README.md                      # Project documentation

<br></br>

# 🔐 Environment Variables

### Create a .env.local file in the root directory and add the following:

1. Google Gemini API Key

    ```bash
    GEMINI_API_KEY=your_gemini_api_key_here

2. Next.js App URL
   
    ```bash
    NEXT_PUBLIC_APP_URL=http://localhost:3000

### """⚠️ Never commit your .env.local file to version control."""

<br></br>

# 🧪 Scripts

| Command |	Description |
|---|---|
| ***npm run dev*** |	Start development server |
| ***npm run build*** | Build for production |
| ***npm run start*** | Start production server |
| ***npm run lint*** | Run ESLint |

<br></br>

# 🌐 Deployment
## Deploy on Vercel (Recommended)

1. Push your code to GitHub
2. Go to vercel.com and import your repository
3. Add your environment variables in the Vercel dashboard.
4. Click Deploy 🚀

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/kdsking19/AI_Resume_Screening_System) [![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/kdsking19/AI_Resume_Screening_System)

<br></br>

# 🤝 Contributing
Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch

   ```bash
   git checkout -b feature/AmazingFeature

3. Commit your changes.

   ```bash
   git commit -m "Add AmazingFeature"

4. Push to the branch.

   ```bash
   git push origin feature/AmazingFeature

5. Open a Pull Request.
<br></br>

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
<br></br>

# 👨‍💻 Author
- [kdsking19](https://github.com/kdsking19)
<br></br>

# 🙋 Support
If you encounter any issues or have questions:

- Open an [Issue](https://github.com/kdsking19/AI_Resume_Screening_System/issues).
- Contact the maintainer via GitHub.