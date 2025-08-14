# Project Summary
The OMNIO app is a cross-platform real-time chat and file viewer application designed to facilitate secure communication and file sharing. It offers end-to-end encrypted messaging, supports various file types for viewing, and enables users to share video/audio streams seamlessly. The app is built using modern web technologies and can function both as a web application and a desktop application via Electron.

# Project Module Description
The OMNIO app consists of several functional modules:
- **Chat Module**: Enables real-time messaging across multiple chat rooms with end-to-end encryption.
- **File Viewer Module**: Universal viewer supporting various file formats including images, videos, documents, and code files.
- **Stream Sharing Module**: Allows users to share video and audio streams within chat rooms.
- **File Transfer Module**: Facilitates drag-and-drop file sharing in chat.
- **Database Module**: Manages data storage and retrieval with a focus on security and performance.

# Directory Tree
```
.
├── README.md                # Project documentation
├── electron                 # Electron main process files
│   ├── main.js             # Main entry point for Electron
│   └── preload.js          # Preload scripts for Electron
├── index.html              # Main HTML file
├── manifest.json           # Application manifest
├── netlify.toml            # Netlify configuration
├── package.json            # Project dependencies and scripts
├── server                  # Server-related files
│   └── index.js            # Server entry point
├── src                     # Source files
│   ├── App.jsx             # Main application component
│   ├── components          # React components
│   ├── db                 # Database-related files
│   ├── hooks               # Custom React hooks
│   ├── index.css           # Global styles
│   └── main.jsx            # Application entry point
├── uploads                 # Directory for uploaded files
│   └── OMNIO-app.zip       # Project archive
├── vercel.json             # Vercel deployment configuration
└── vite.config.js          # Vite configuration
```

# File Description Inventory
- **README.md**: Contains project overview and setup instructions.
- **electron/**: Contains files necessary for the Electron app.
- **index.html**: The main HTML file for the web application.
- **manifest.json**: Metadata for the application.
- **netlify.toml**: Configuration for deploying on Netlify.
- **package.json**: Lists project dependencies and scripts for building and running the app.
- **server/index.js**: Entry point for the server-side code.
- **src/**: Contains the main application code, including components, hooks, and styles.

# Technology Stack
- **Frontend**: React, Vite
- **Backend**: Node.js, Express (if applicable)
- **Database**: Custom signal database for chat management
- **Deployment**: Vercel, Netlify
- **Desktop**: Electron

# Usage
To get started with the OMNIO app:
1. **Install Dependencies**: Run `pnpm install` to install all necessary packages.
2. **Build the Application**: Use `pnpm run build` to compile the application for production.
3. **Run the Development Server**: Start the development server with `pnpm run dev`.
