# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// <https://firebase.google.com/docs/web/setup#available-libraries>

## Environment Variables Setup

This project uses Firebase, and you'll need to configure your API key to run it locally.

1. **Create a `.env` file:**
    In the root directory of the project, create a new file named `.env`.

2. **Copy from example:**
    Copy the contents of `.env.example` into your new `.env` file. It should look like this:

    VITE_FIREBASE_API_KEY="SUA_API_KEY_AQUI"

3. **Replace placeholder with your API Key:**
    In the `.env` file, replace `"SUA_API_KEY_AQUI"` with your actual Firebase API key.

The application is configured to read this key. The `.env` file is included in `.gitignore`, so your key will not be committed to the repository.
