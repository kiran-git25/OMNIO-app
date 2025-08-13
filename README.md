# OmniO - Universal File Viewer & Secure Chat

A cross-platform application for secure communication and file handling with end-to-end encryption. Built with React, Electron, and modern web technologies.

## 🚀 Features

### 📁 File Management
- **Universal File Viewer**: Support for text, images, videos, audio, PDFs, and documents
- **Drag & Drop**: Easy file upload with visual feedback
- **File Editor**: Built-in text/code editor with syntax highlighting
- **Native Integration**: Desktop app can access local file system

### 💬 Secure Communication
- **End-to-End Encryption**: AES encryption for all messages
- **Multiple Chat Rooms**: Create and manage encrypted chat rooms
- **File Sharing**: Secure file attachments in conversations
- **Real-time Sync**: Messages sync across devices using SignalDB

### 🎵 Media Streaming
- **URL Player**: Support for YouTube, Vimeo, and direct media URLs
- **Stream Sharing**: Share media streams in chat rooms
- **Multiple Formats**: Audio, video, and live stream support

### 🎨 User Experience
- **Dark/Light Themes**: Customizable appearance
- **Responsive Design**: Works on desktop and mobile
- **Tabbed Interface**: Organize your workflow with tabs
- **Cross-Platform**: Available as web app and desktop application

## 🛠 Technology Stack

- **Frontend**: React 18, Vite, CSS Variables
- **Desktop**: Electron with secure IPC
- **Database**: SignalDB with encryption
- **Security**: CryptoJS for E2EE, Secure Storage
- **Media**: ReactPlayer for streaming
- **File Processing**: Mammoth (Word), XLSX (Excel), PDF.js

## 📦 Installation

### Web Version
1. Clone the repository
```bash
git clone <repository-url>
cd OMNIO-main
```

2. Install dependencies
```bash
pnpm install
```

3. Start development server
```bash
pnpm run dev
```

4. Build for production
```bash
pnpm run build
```

### Desktop Version
```bash
# Start both web and electron
pnpm run electron:dev

# Build desktop app
pnpm run electron:build
```

## 🌐 Deployment

### Vercel
1. Connect your GitHub repository to Vercel
2. Deploy automatically with the included `vercel.json` config
3. Build command: `pnpm run build`
4. Output directory: `dist`

### Netlify
1. Connect repository to Netlify
2. Uses included `netlify.toml` configuration
3. Build command: `pnpm run build`
4. Publish directory: `dist`

### Manual Deployment
After running `pnpm run build`, deploy the `dist/` folder to any static hosting service.

## 🔒 Security Features

- **End-to-End Encryption**: All messages encrypted with AES-256
- **Secure Key Storage**: Encryption keys stored securely in browser storage
- **Room-Based Keys**: Each chat room has its own encryption key
- **Content Security**: CSP headers and security best practices
- **Privacy First**: No server-side message storage

## 🎯 Usage

### File Operations
1. **Upload Files**: Drag files into the center panel or click "Open"
2. **View Files**: Click files in the left sidebar to view/edit
3. **Edit Text**: Use the built-in editor for code and text files
4. **Save Changes**: Modified files show save button

### Chat System
1. **Create Rooms**: Click "+ Room" to create encrypted chat rooms
2. **Toggle Encryption**: Use the E2EE checkbox to enable/disable encryption
3. **Send Messages**: Type and press Enter to send encrypted messages
4. **Share Files**: Use 📎 button to attach files to messages
5. **Share Streams**: Click "Stream" to share media URLs

### Media Player
1. **Open Player**: Click the "Stream" tab
2. **Add URL**: Paste YouTube, Vimeo, or direct media URLs
3. **Share**: Use "Share to Chat Stream" to share with rooms

## 🔧 Development

### Project Structure
```
src/
├── components/     # React components
├── utils/          # Utility functions
├── db/             # Database configuration
├── hooks/          # Custom React hooks
└── App.jsx         # Main application
```

### Key Components
- `App.jsx`: Main application logic and state
- `ViewerPanel.jsx`: File viewing and editing
- `ChatBox.jsx`: Encrypted messaging system
- `URLPlayer.jsx`: Media streaming component

### Security Implementation
- `e2ee.js`: End-to-end encryption utilities
- `signalDB.js`: Database with encryption layer
- Secure key management and storage

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review the security guidelines

---

**Built with ❤️ for secure, cross-platform file management and communication.**
